/**
 * Stealth Payroll Registry Hooks
 *
 * Connects to stealthpay_payroll_v3.aleo on Aleo testnet.
 *
 * Read  — queries the Aleo explorer REST API for public mappings.
 * Write — calls wallet.executeTransaction() to submit transitions.
 *
 * Employee list & company metadata (name, description, salaries) are stored
 * in localStorage because the contract stores only commitment hashes and
 * addresses — not names or plaintext salaries.
 */

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@provablehq/aleo-wallet-adaptor-react";
import {
  PROGRAM_ID,
  EXPLORER_BASES,
  TOKEN_TYPES,
  stringToField,
} from "@/lib/constants";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface Employee {
  wallet: string;
  name: string;
  role: string;
  monthlySalary: bigint;  // lump-sum: full amount per interval
  streamRate: bigint;     // streaming: microcredits per block
  paymentType: number;    // 0 = lump-sum, 1 = streaming
  tokenType: number;      // 0 = credits, 1 = usdcx
  isActive: boolean;
  addedAt: bigint;        // unix ms (local) or block height (on-chain)
  lastPaidAt: bigint;
  streamStartedAt: bigint;
  streamClaimedAmount: bigint;
}

export interface Company {
  name: string;
  description: string;
  isRegistered: boolean;
  createdAt: bigint;
  payrollInterval: bigint;
  isPaused: boolean;
}

export interface TxHistoryEntry {
  type: "deposit" | "withdraw" | "add_employee" | "remove_employee" | "claim" | "bonus" | "register_company";
  employee?: string;
  amount?: string;
  token: "credits" | "usdcx";
  txId?: string;
  timestamp: number;
}

// ── LocalStorage helpers ───────────────────────────────────────────────────────

interface StoredEmployee {
  wallet: string;
  name: string;
  role: string;
  salary: string;       // bigint serialised as string
  paymentType: number;
  tokenType: number;
  addedAt: number;      // unix ms
}

interface StoredCompany {
  name: string;
  description: string;
}

function lsKey(prefix: string, employer: string) {
  return `stealthpay_${prefix}_${employer}`;
}

function getStoredEmployees(employer: string): StoredEmployee[] {
  try {
    return JSON.parse(localStorage.getItem(lsKey("employees", employer)) ?? "[]");
  } catch { return []; }
}

function saveEmployeeLocal(employer: string, emp: StoredEmployee) {
  const list = getStoredEmployees(employer);
  const idx = list.findIndex((e) => e.wallet === emp.wallet);
  if (idx >= 0) list[idx] = emp; else list.push(emp);
  localStorage.setItem(lsKey("employees", employer), JSON.stringify(list));
}

function removeEmployeeLocal(employer: string, wallet: string) {
  const list = getStoredEmployees(employer).filter((e) => e.wallet !== wallet);
  localStorage.setItem(lsKey("employees", employer), JSON.stringify(list));
}

function getStoredCompany(employer: string): StoredCompany | null {
  try {
    const raw = localStorage.getItem(lsKey("company", employer));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveCompanyLocal(employer: string, data: StoredCompany) {
  localStorage.setItem(lsKey("company", employer), JSON.stringify(data));
}

export function getTxHistory(employer: string): TxHistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(lsKey("txhistory", employer)) ?? "[]");
  } catch { return []; }
}

function saveTxEntry(employer: string, entry: TxHistoryEntry) {
  const list = getTxHistory(employer);
  list.unshift(entry);
  localStorage.setItem(lsKey("txhistory", employer), JSON.stringify(list.slice(0, 100)));
}

// ── Explorer helpers ───────────────────────────────────────────────────────────

async function fetchMapping(mapping: string, key: string): Promise<string | null> {
  return fetchPublicBalance(PROGRAM_ID, mapping, key);
}

async function fetchPublicBalance(program: string, mapping: string, key: string): Promise<string | null> {
  for (const base of EXPLORER_BASES) {
    try {
      const res = await fetch(
        `${base}/program/${program}/mapping/${mapping}/${encodeURIComponent(key)}`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (res.ok) {
        const val = await res.json();
        if (val !== null && val !== undefined) return String(val);
      }
    } catch { /* try next base */ }
  }
  return null;
}

// Parse a Leo struct plaintext string into key→value pairs.
// e.g. "{ name_hash: 123field, payroll_interval: 720u32, is_paused: false }"
function parseStruct(str: string): Record<string, string> {
  const result: Record<string, string> = {};
  // Handles both Leo-style { key: val } and JSON-style { "key": "val" }
  const re = /["']?(\w+)["']?\s*[:=]\s*["']?([^,"'}\n]+)["']?/g;
  for (const m of str.matchAll(re)) {
    result[m[1].trim()] = m[2].trim();
  }
  return result;
}

function parseBigInt(val: string | undefined): bigint {
  if (!val) return 0n;
  try { 
    // Strips type suffixes like u64, i32, field, scalar
    const cleaned = val.replace(/[ui](8|16|32|64|128)$|field$|scalar$/i, "").trim();
    return BigInt(cleaned); 
  } catch { 
    return 0n; 
  }
}

function parseNum(val: string | undefined): number {
  if (!val) return 0;
  return parseInt(val.replace(/[a-zA-Z]+$/, "").trim()) || 0;
}

function parseBoolField(val: string | undefined): boolean {
  return val?.trim() === "true";
}

// ── Random field (salary_secret) ──────────────────────────────────────────────

function randomField(): string {
  const bytes = new Uint8Array(31); // 248 bits — safely below field modulus
  crypto.getRandomValues(bytes);
  let n = 0n;
  for (const b of bytes) n = (n << 8n) | BigInt(b);
  return `${n}field`;
}

// ── Read Hooks ─────────────────────────────────────────────────────────────────

export function useCompany(employer?: string) {
  const [data, setData] = useState<Company | undefined>();

  const refetch = useCallback(async () => {
    if (!employer) return setData(undefined);
    const stored = getStoredCompany(employer);
    const raw = await fetchMapping("companies", employer);
    
    // If not found in explorer AND not found locally, then undefined
    if ((!raw || raw === "null") && !stored) return setData(undefined);
    
    const s = raw && raw !== "null" ? parseStruct(raw) : {} as Record<string, string>;
    setData({
      name: stored?.name ?? "",
      description: stored?.description ?? "",
      isRegistered: true,
      createdAt: parseBigInt(s.created_at || Math.floor(Date.now() / 1000).toString()),
      payrollInterval: parseBigInt(s.payroll_interval || "720"),
      isPaused: parseBoolField(s.is_paused || "false"),
    });
  }, [employer]);

  useEffect(() => { refetch(); }, [refetch]);
  return { data, refetch };
}

export function useIsRegistered(employer?: string) {
  const [data, setData] = useState<boolean>(false);

  const refetch = useCallback(async () => {
    if (!employer) return setData(false);
    
    // Optimistic UI: If we see it locally, show dashboard immediately!
    const stored = getStoredCompany(employer);
    if (stored) return setData(true);

    const raw = await fetchMapping("companies", employer);
    setData(!!raw && raw !== "null");
  }, [employer]);

  useEffect(() => { refetch(); }, [refetch]);
  return { data, refetch };
}

export function useDeposit(employer?: string) {
  const [credits, setCredits] = useState<bigint>(0n);
  const [usdcx, setUsdcx] = useState<bigint>(0n);

  const refetch = useCallback(async () => {
    if (!employer) return;
    const [c, u] = await Promise.all([
      fetchMapping("company_credits", employer),
      fetchMapping("company_usdcx", employer),
    ]);
    setCredits(c && c !== "null" ? parseBigInt(c) : 0n);
    setUsdcx(u && u !== "null" ? parseBigInt(u) : 0n);
  }, [employer]);

  useEffect(() => { refetch(); }, [refetch]);
  // `data` = credits balance (existing callers); `usdcxBalance` = USDCX balance
  return { data: credits, usdcxBalance: usdcx, refetch };
}

export function useEmployees(employer?: string) {
  const [data, setData] = useState<[string[], Employee[]] | undefined>();

  // Employee list lives in localStorage — the contract stores no enumerable list.
  const refetch = useCallback(() => {
    if (!employer) return setData(undefined);
    const stored = getStoredEmployees(employer);
    const wallets = stored.map((e) => e.wallet);
    const employees: Employee[] = stored.map((e) => {
      const salary = BigInt(e.salary);
      return {
        wallet: e.wallet,
        name: e.name,
        role: e.role,
        monthlySalary: salary,
        streamRate: salary,
        paymentType: e.paymentType,
        tokenType: e.tokenType,
        isActive: true,
        addedAt: BigInt(e.addedAt),
        lastPaidAt: 0n,
        streamStartedAt: BigInt(e.addedAt),
        streamClaimedAmount: 0n,
      };
    });
    setData([wallets, employees]);
  }, [employer]);

  useEffect(() => { refetch(); }, [refetch]);
  return { data, refetch };
}

export function useEmployeeInfo(employer?: string, employee?: string) {
  const { requestRecords, connected } = useWallet() as any;
  const [data, setData] = useState<Employee | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!employer || !employee || !connected) {
      setData(undefined);
      return;
    }
    
    setIsLoading(true);
    try {
      // Request plaintext records for the V2 program.
      const raw = await requestRecords?.(PROGRAM_ID, true);
      const records: any[] = Array.isArray(raw) ? raw : (raw?.records ?? []);

      // Iteratively parse records to find a match for the specific employer.
      let matchPt: string | undefined;
      console.log(`[Sync] Scanning ${records.length} records for employer: ${employer}`);

      for (let i = 0; i < records.length; i++) {
        const r = records[i];
        const pt: string = r.plaintext || (r.data && typeof r.data === "string" ? r.data : JSON.stringify(r.data || ""));
        
        console.log(`[Record ${i}] pt length:`, pt.length);
        
        // If it's a valid string, log its keys to see what we're working with
        const s = parseStruct(pt);
        console.log(`[Record ${i}] Keys found:`, Object.keys(s));
        
        // If it has employer and owner, it's likely an EmployeeRecord
        if (s.employer && s.owner) {
          console.log(`[Record ${i}] Comparing employer: ${s.employer} to ${employer}`);
          if (s.employer.toLowerCase().includes(employer.toLowerCase().trim()) || 
              employer.toLowerCase().includes(s.employer.toLowerCase().trim())) {
            console.log(`[Record ${i}] Match found!`);
            matchPt = pt;
            break;
          }
        } else if (pt.toLowerCase().includes(employer.toLowerCase().trim())) {
           // Fallback if keys are not parsed correctly
           console.log(`[Record ${i}] Partial string match found for employer address!`);
           matchPt = pt;
           break;
        }
      }

      if (!matchPt) {
        console.warn("[Sync] No matching record found for this specific employer.");
        // Log the first record's keys to help debug
        if (records.length > 0) {
           const pt0 = records[0].plaintext || (records[0].data && JSON.stringify(records[0].data));
           console.log("[Sync] First record keys for debug:", Object.keys(parseStruct(pt0 || "")));
        }
        setData(undefined);
        return;
      }

      const s = parseStruct(matchPt);
      console.log("[Sync] Successfully parsed record:", s);
      const paymentType = parseNum(s.payment_type);
      const salary = parseBigInt(s.salary);
      const tokenType = parseNum(s.token_type);

      setData({
        wallet: employee,
        name: "Verified Employment",
        role: "Active Member",
        monthlySalary: paymentType === 0 ? salary : 0n,
        streamRate: paymentType === 1 ? salary : 0n,
        paymentType,
        tokenType,
        isActive: true,
        addedAt: 0n,
        lastPaidAt: 0n,
        streamStartedAt: BigInt(Date.now() - 60000), 
        streamClaimedAmount: 0n,
      });
    } catch (e) {
      console.error("[Sync] Runtime Error:", e);
      setData(undefined);
    } finally {
      setIsLoading(false);
    }
  }, [employer, employee, connected]);

  useEffect(() => { refetch(); }, [refetch]);
  return { data, isLoading, refetch };
}

// ── Write Hooks ────────────────────────────────────────────────────────────────

export function useRegisterCompany() {
  const { address, executeTransaction } = useWallet() as any;
  const [isPending, setIsPending] = useState(false);

  async function register(name: string, description: string, payrollInterval: bigint) {
    if (!address || !executeTransaction) throw new Error("Wallet not connected");
    setIsPending(true);
    try {
      const nameHash = stringToField(name);
      const result = await executeTransaction({
        program: PROGRAM_ID,
        function: "register_company",
        inputs: [nameHash, `${payrollInterval}u32`],
        fee: 0.05,
      });
      const txId = result?.transactionId ?? result;
      saveCompanyLocal(address, { name, description });
      saveTxEntry(address, {
        type: "register_company",
        token: "credits",
        txId: txId ?? undefined,
        timestamp: Date.now(),
      });
    } finally {
      setIsPending(false);
    }
  }

  return { register, isPending };
}

export function useAddEmployee() {
  const { address, executeTransaction } = useWallet() as any;
  const [isPending, setIsPending] = useState(false);

  async function addEmployee(
    employeeWallet: string,
    name: string,
    role: string,
    salary: bigint,
    _unused: bigint,        // kept for API compat — contract uses single salary field
    paymentType: number,
    tokenType: number = TOKEN_TYPES.CREDITS,
  ) {
    if (!address || !executeTransaction) throw new Error("Wallet not connected");
    setIsPending(true);
    try {
      const salarySecret = randomField();
      const result = await executeTransaction({
        program: PROGRAM_ID,
        function: "add_employee",
        inputs: [
          employeeWallet,
          `${salary}u64`,
          salarySecret,
          `${paymentType}u8`,
          `${tokenType}u8`,
        ],
        fee: 0.05,
      });
      const txId = result?.transactionId ?? result;
      saveEmployeeLocal(address, {
        wallet: employeeWallet,
        name,
        role,
        salary: salary.toString(),
        paymentType,
        tokenType,
        addedAt: Date.now(),
      });
      saveTxEntry(address, {
        type: "add_employee",
        employee: employeeWallet,
        token: tokenType === TOKEN_TYPES.USDCX ? "usdcx" : "credits",
        txId: txId ?? undefined,
        timestamp: Date.now(),
      });
    } finally {
      setIsPending(false);
    }
  }

  return { addEmployee, isPending };
}

export function useRemoveEmployee() {
  const { address, executeTransaction } = useWallet() as any;
  const [isPending, setIsPending] = useState(false);

  async function removeEmployee(employeeWallet: string) {
    if (!address || !executeTransaction) throw new Error("Wallet not connected");
    setIsPending(true);
    try {
      const result = await executeTransaction({
        program: PROGRAM_ID,
        function: "remove_employee",
        inputs: [employeeWallet],
        fee: 0.05,
      });
      const txId = result?.transactionId ?? result;
      removeEmployeeLocal(address, employeeWallet);
      saveTxEntry(address, {
        type: "remove_employee",
        employee: employeeWallet,
        token: "credits",
        txId: txId ?? undefined,
        timestamp: Date.now(),
      });
    } finally {
      setIsPending(false);
    }
  }

  return { removeEmployee, isPending };
}

export function useDepositFunds() {
  const { address, executeTransaction } = useWallet() as any;
  const [isPending, setIsPending] = useState(false);

  async function deposit(amount: bigint, tokenType: number = TOKEN_TYPES.CREDITS) {
    if (!address || !executeTransaction) throw new Error("Wallet not connected");
    setIsPending(true);
    try {
      const fn = tokenType === TOKEN_TYPES.USDCX ? "deposit_usdcx" : "deposit_credits";
      const result = await executeTransaction({
        program: PROGRAM_ID,
        function: fn,
        inputs: [`${amount}u64`],
        fee: 0.05,
      });
      const txId = result?.transactionId ?? result;
      saveTxEntry(address, {
        type: "deposit",
        amount: amount.toString(),
        token: tokenType === TOKEN_TYPES.USDCX ? "usdcx" : "credits",
        txId: txId ?? undefined,
        timestamp: Date.now(),
      });
    } finally {
      setIsPending(false);
    }
  }

  return { deposit, isPending };
}

export function useWithdrawFunds() {
  const { address, executeTransaction } = useWallet() as any;
  const [isPending, setIsPending] = useState(false);

  async function withdraw(amount: bigint, tokenType: number = TOKEN_TYPES.CREDITS) {
    if (!address || !executeTransaction) throw new Error("Wallet not connected");
    setIsPending(true);
    try {
      const fn = tokenType === TOKEN_TYPES.USDCX ? "withdraw_usdcx" : "withdraw_credits";
      const result = await executeTransaction({
        program: PROGRAM_ID,
        function: fn,
        inputs: [`${amount}u64`],
        fee: 0.05,
      });
      const txId = result?.transactionId ?? result;
      saveTxEntry(address, {
        type: "withdraw",
        amount: amount.toString(),
        token: tokenType === TOKEN_TYPES.USDCX ? "usdcx" : "credits",
        txId: txId ?? undefined,
        timestamp: Date.now(),
      });
    } finally {
      setIsPending(false);
    }
  }

  return { withdraw, isPending };
}

export function useClaimStream() {
  const { address, executeTransaction, requestRecords } = useWallet() as any;
  const [isPending, setIsPending] = useState(false);

  async function claimStream(
    employer: string,
    claimAmount: bigint,
    tokenType: number = TOKEN_TYPES.CREDITS,
  ) {
    if (!address || !executeTransaction) throw new Error("Wallet not connected");
    setIsPending(true);
    try {
      // Fetch the employee's EmployeeRecord from the connected wallet.
      const raw = await requestRecords?.(PROGRAM_ID, true);
      const records: any[] = Array.isArray(raw) ? raw : (raw?.records ?? []);

      // Match a streaming record (payment_type: 1u8) from the given employer.
      const match = records.find((r) => {
        const pt: string = r.plaintext ?? "";
        return pt.includes(employer) && pt.includes("payment_type: 1u8");
      });

      if (!match) {
        throw new Error(
          "No streaming EmployeeRecord found in wallet. " +
          "Make sure your wallet is synced and you have an active streaming employment."
        );
      }

      const recordInput = match.plaintext ?? JSON.stringify(match);
      const fn = tokenType === TOKEN_TYPES.USDCX ? "claim_stream_usdcx" : "claim_stream_credits";

      await executeTransaction({
        program: PROGRAM_ID,
        function: fn,
        inputs: [recordInput, `${claimAmount}u64`],
        fee: 0.05,
      });
    } finally {
      setIsPending(false);
    }
  }

  return { claimStream, isPending };
}

export function useClaimPayroll() {
  const { address, executeTransaction, requestRecords } = useWallet() as any;
  const [isPending, setIsPending] = useState(false);

  async function claimPayroll(
    employer: string,
    claimAmount: bigint,
    tokenType: number = TOKEN_TYPES.CREDITS,
  ) {
    if (!address || !executeTransaction) throw new Error("Wallet not connected");
    setIsPending(true);
    try {
      const raw = await requestRecords?.(PROGRAM_ID, true);
      const records: any[] = Array.isArray(raw) ? raw : (raw?.records ?? []);

      // Match a lump-sum record (payment_type: 0u8) from the given employer.
      const match = records.find((r) => {
        const pt: string = r.plaintext ?? "";
        return pt.includes(employer) && pt.includes("payment_type: 0u8");
      });

      if (!match) {
        throw new Error(
          "No lump-sum EmployeeRecord found in wallet. " +
          "Make sure your wallet is synced."
        );
      }

      const recordInput = match.plaintext ?? JSON.stringify(match);
      const fn = tokenType === TOKEN_TYPES.USDCX ? "claim_payroll_usdcx" : "claim_payroll_credits";

      await executeTransaction({
        program: PROGRAM_ID,
        function: fn,
        inputs: [recordInput, `${claimAmount}u64`],
        fee: 0.05,
      });
    } finally {
      setIsPending(false);
    }
  }

  return { claimPayroll, isPending };
}

export function usePayBonus() {
  const { address, executeTransaction } = useWallet() as any;
  const [isPending, setIsPending] = useState(false);

  async function payBonus(
    employeeWallet: string,
    amount: bigint,
    tokenType: number = TOKEN_TYPES.CREDITS,
  ) {
    if (!address || !executeTransaction) throw new Error("Wallet not connected");
    setIsPending(true);
    try {
      const fn = tokenType === TOKEN_TYPES.USDCX ? "pay_bonus_usdcx" : "pay_bonus_credits";
      const result = await executeTransaction({
        program: PROGRAM_ID,
        function: fn,
        inputs: [employeeWallet, `${amount}u64`],
        fee: 0.05,
      });
      const txId = result?.transactionId ?? result;
      saveTxEntry(address, {
        type: "bonus",
        employee: employeeWallet,
        amount: amount.toString(),
        token: tokenType === TOKEN_TYPES.USDCX ? "usdcx" : "credits",
        txId: txId ?? undefined,
        timestamp: Date.now(),
      });
    } finally {
      setIsPending(false);
    }
  }

  return { payBonus, isPending };
}

export function useAnalytics(employer: string | null) {
  const { data: employeesData } = useEmployees(employer);
  const [creditBalance, setCreditBalance] = useState<bigint>(0n);
  const [usdcxBalance, setUsdcxBalance] = useState<bigint>(0n);
  const [globalTvl, setGlobalTvl] = useState<bigint>(0n);

  const history = (employer && typeof employer === 'string') ? getTxHistory(employer) : [];

  const refetch = useCallback(async () => {
    // 🌍 GLOBAL TVL (Fetch program balance from credits.aleo)
    const g = await fetchPublicBalance("credits.aleo", "account", PROGRAM_ID);
    if (g) setGlobalTvl(parseBigInt(g));

    if (!employer) return;
    const c = await fetchMapping("company_credits", employer);
    const u = await fetchMapping("company_usdcx", employer);
    if (c) setCreditBalance(parseBigInt(c));
    if (u) setUsdcxBalance(parseBigInt(u));
  }, [employer]);

  useEffect(() => { refetch(); }, [refetch]);

  const employees: Employee[] = employeesData
    ? (employeesData as [any, Employee[]])[1]
    : [];
  
  const activeEmployees = employees.filter(e => e.isActive);
  const activeStreams = activeEmployees.filter(e => e.paymentType === 1).length;

  const totalVolume = history.reduce((acc, tx) => {
    if (tx.type === "claim" || tx.type === "bonus") {
      return acc + BigInt(tx.amount || "0");
    }
    return acc;
  }, 0n);

  return {
    totalVolume,
    activeEmployees: activeEmployees.length,
    activeStreams,
    history,
    creditBalance,
    usdcxBalance,
    globalTvl,
    refetch
  };
}

export function useEmployeeEarnings(employeeAddress: string | null) {
  // Employees can see their total paid by scanning their local history or just summing claim records.
  // For simplicity, we track it since we can't easily query private rewards.
  const history = employeeAddress ? getTxHistory(employeeAddress) : [];
  
  const totalEarned = history.reduce((acc, tx) => {
    if (tx.type === "claim" || tx.type === "bonus") {
      return acc + BigInt(tx.amount || "0");
    }
    return acc;
  }, 0n);

  return { totalEarned, history };
}
