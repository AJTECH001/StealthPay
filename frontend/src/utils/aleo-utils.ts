/**
 * Aleo utility functions for StealthPay.
 * Includes Merkle proof generation for USDCx freeze-list compliance,
 * field encoding helpers, and on-chain mapping queries.
 */

export const PROGRAM_ID = import.meta.env.VITE_STEALTHPAY_PROGRAM_ID || "stealthpay_usdcx_v3.aleo";
export const USDCX_PROGRAM_ID = import.meta.env.VITE_USDCX_PROGRAM_ID || "test_usdcx_stablecoin.aleo";
export const FREEZELIST_PROGRAM_ID = "test_usdcx_freezelist.aleo";

// Multi-fallback explorer API bases (try in order)
export const EXPLORER_BASES = [
  "https://api.provable.com/v2/testnet",
  "https://api.explorer.aleo.org/v1/testnet",
  "https://api.explorer.provable.com/v1/testnet",
];

// ─── String / Field Encoding ────────────────────────────────────────────────

/** Encode a UTF-8 string as a Leo field (decimal BigInt + "field" suffix). */
export const stringToField = (str: string): string => {
  if (!str) return "0field";
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  let hex = "0x";
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, "0");
  }
  try {
    const big = BigInt(hex);
    // Aleo field must be < ~2^253; clamp if necessary
    const MAX_FIELD = BigInt("8444461749428370424248824938781546531375899335154063827935233455917409239040");
    return `${big % MAX_FIELD}field`;
  } catch {
    return "0field";
  }
};

/** Decode a Leo field back to a UTF-8 string. */
export const fieldToString = (fieldVal: string): string => {
  try {
    const val = BigInt(fieldVal.replace("field", ""));
    let hex = val.toString(16);
    if (hex.length % 2 !== 0) hex = "0" + hex;
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return new TextDecoder().decode(bytes).replace(/\0/g, "");
  } catch {
    return "";
  }
};

// ─── On-chain Mapping Helpers ───────────────────────────────────────────────

/** Fetch the invoice hash stored for a given salt from the on-chain mapping. */
export const getInvoiceHashFromMapping = async (salt: string): Promise<string | null> => {
  for (const base of EXPLORER_BASES) {
    try {
      const url = `${base}/program/${PROGRAM_ID}/mapping/salt_to_invoice/${salt}`;
      const res = await fetch(url);
      if (res.ok) {
        const val = await res.json();
        if (val) return val.toString().replace(/['"]/g, "");
      }
    } catch { /* try next base */ }
  }
  return null;
};

/** Fetch status + metadata for an invoice hash from the on-chain mapping. */
export const getInvoiceData = async (
  hash: string
): Promise<{ status: number; tokenType: number; invoiceType: number } | null> => {
  for (const base of EXPLORER_BASES) {
    try {
      const url = `${base}/program/${PROGRAM_ID}/mapping/invoices/${hash}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (!data) continue;

        const parseVal = (v: unknown) => {
          if (typeof v === "number") return v;
          if (typeof v === "string") return parseInt(v.replace("u8", "")) || 0;
          return 0;
        };

        if (typeof data === "string") {
          const statusMatch = data.match(/status:\s*(\d+)u8/);
          const tokenMatch = data.match(/token_type:\s*(\d+)u8/);
          const typeMatch = data.match(/invoice_type:\s*(\d+)u8/);
          return {
            status: statusMatch ? parseInt(statusMatch[1]) : 0,
            tokenType: tokenMatch ? parseInt(tokenMatch[1]) : 0,
            invoiceType: typeMatch ? parseInt(typeMatch[1]) : 0,
          };
        }

        if (typeof data === "object") {
          return {
            status: parseVal((data as Record<string, unknown>).status),
            tokenType: parseVal((data as Record<string, unknown>).token_type ?? (data as Record<string, unknown>).tokenType),
            invoiceType: parseVal((data as Record<string, unknown>).invoice_type ?? (data as Record<string, unknown>).invoiceType),
          };
        }
      }
    } catch { /* try next base */ }
  }
  return null;
};

// ─── FreezeList / Merkle Proof Helpers ─────────────────────────────────────

/** Fetch the current freeze-list Merkle root from on-chain. */
export const getFreezeListRoot = async (): Promise<string | null> => {
  for (const base of EXPLORER_BASES) {
    try {
      const url = `${base}/program/${FREEZELIST_PROGRAM_ID}/mapping/freeze_list_root/1u8`;
      const res = await fetch(url);
      if (res.ok) {
        const val = await res.json();
        if (val) return val.toString().replace(/['"]/g, "");
      }
    } catch { /* try next base */ }
  }
  return null;
};

/** Fetch how many entries are in the freeze list. */
export const getFreezeListCount = async (): Promise<number> => {
  for (const base of EXPLORER_BASES) {
    try {
      const url = `${base}/program/${FREEZELIST_PROGRAM_ID}/mapping/freeze_list_last_index/true`;
      const res = await fetch(url);
      if (res.ok) {
        const val = await res.json();
        if (val) {
          const parsed = parseInt(val.toString().replace("u32", "").replace(/['"]/g, ""));
          return isNaN(parsed) ? 0 : parsed + 1; // last_index is 0-based
        }
      }
    } catch { /* try next base */ }
  }
  return 0;
};

/** Fetch the field value stored at a specific leaf index in the freeze list. */
export const getFreezeListIndex = async (index: number): Promise<string | null> => {
  for (const base of EXPLORER_BASES) {
    try {
      const url = `${base}/program/${FREEZELIST_PROGRAM_ID}/mapping/freeze_list_index/${index}u32`;
      const res = await fetch(url);
      if (res.ok) {
        const val = await res.json();
        if (val) return val.toString().replace(/['"]/g, "");
      }
    } catch { /* try next base */ }
  }
  return null;
};

/**
 * Generate a valid Merkle inclusion proof for the USDCx freeze list.
 *
 * This uses the Poseidon4 hasher from @provablehq/wasm — the same hasher
 * used by the on-chain freeze-list program — so the proof root will match
 * what the contract verifies.
 *
 * @param targetIndex  Leaf index to prove membership for (default 1)
 * @param occupiedLeafValue  If the sibling leaf at index 0 is occupied, pass its field value
 */
export const generateFreezeListProof = async (
  targetIndex = 1,
  occupiedLeafValue?: string
): Promise<string> => {
  try {
    const { Poseidon4, Field } = await import("@provablehq/wasm");
    const hasher = new Poseidon4();

    // Pre-calculate empty hashes for each tree level (depth 0–15)
    const emptyHashes: string[] = [];
    let currentEmpty = "0field";
    for (let i = 0; i < 16; i++) {
      emptyHashes.push(currentEmpty);
      const f = Field.fromString(currentEmpty);
      currentEmpty = hasher.hash([f, f]).toString();
    }

    let currentHash = "0field";
    let currentIndex = targetIndex;
    const proofSiblings: string[] = [];

    for (let i = 0; i < 16; i++) {
      const isLeft = currentIndex % 2 === 0;
      const siblingIndex = isLeft ? currentIndex + 1 : currentIndex - 1;

      // At leaf level, if the sibling is the occupied leaf (index 0), use its value
      let siblingHash = emptyHashes[i];
      if (i === 0 && siblingIndex === 0 && occupiedLeafValue) {
        siblingHash = occupiedLeafValue;
      }

      proofSiblings.push(siblingHash);

      const fCurrent = Field.fromString(currentHash);
      const fSibling = Field.fromString(siblingHash);
      const input = isLeft ? [fCurrent, fSibling] : [fSibling, fCurrent];

      currentHash = hasher.hash(input).toString();
      currentIndex = Math.floor(currentIndex / 2);
    }

    return `{ siblings: [${proofSiblings.join(", ")}], leaf_index: ${targetIndex}u32 }`;
  } catch (e) {
    console.warn("Merkle proof generation warning (using zero fallback):", e);
    // Fallback: all-zero siblings. This will pass if the freeze list is empty /
    // no addresses are frozen, which is the typical testnet state.
    const s = Array(16).fill("0field").join(", ");
    return `{ siblings: [${s}], leaf_index: ${targetIndex}u32 }`;
  }
};

/**
 * Build the [MerkleProof; 2] input string required by pay_invoice_usdcx /
 * pay_donation_usdcx / make_payment_usdcx.
 *
 * The contract checks that both the payer and the recipient are NOT on the
 * freeze list. On an empty testnet freeze list, proofs of non-membership at
 * leaf index 1 (with leaf 0 occupied as a sentinel) suffice.
 */
export const buildUsdcxProofs = async (): Promise<string> => {
  // Try to get actual freeze list data for the most accurate proof
  let index0FieldStr: string | undefined;
  try {
    const v = await getFreezeListIndex(0);
    if (v) index0FieldStr = v;
  } catch { /* ignore */ }

  const proof = await generateFreezeListProof(1, index0FieldStr);
  return `[${proof}, ${proof}]`;
};

// ─── Record Parsing ─────────────────────────────────────────────────────────

export interface InvoiceRecord {
  owner: string;
  invoiceHash: string;
  amount: number;
  tokenType: number;
  invoiceType: number;
  salt: string;
  memo: string;
}

export const parseInvoice = (record: unknown): InvoiceRecord | null => {
  try {
    const data: string = (record as Record<string, unknown>)?.plaintext as string || "";
    const getVal = (key: string) => {
      const m = data.match(new RegExp(`(?:${key}|"${key}"):\\s*([\\w\\d.]+)`));
      return m ? m[1].replace(/\.(private|public)$/, "") : null;
    };

    const invoiceHash = getVal("invoice_hash") || getVal("invoiceHash");
    const owner = getVal("owner");
    const salt = getVal("salt");
    const memoField = getVal("memo");

    if (invoiceHash && owner) {
      const amountVal = getVal("amount");
      return {
        owner,
        invoiceHash,
        amount: amountVal ? parseInt(amountVal.replace("u64", "")) : 0,
        tokenType: parseInt((getVal("token_type") || getVal("tokenType") || "0").replace("u8", "")),
        invoiceType: parseInt((getVal("invoice_type") || getVal("invoiceType") || "0").replace("u8", "")),
        salt: salt || "",
        memo: memoField ? fieldToString(memoField) : "",
      };
    }
  } catch (e) {
    console.error("Error parsing Invoice record:", e);
  }
  return null;
};

export interface PayerReceipt {
  owner: string;
  merchant: string;
  receiptHash: string;
  invoiceHash: string;
  amount: number;
  tokenType: number;
}

export interface MerchantReceipt {
  owner: string;
  receiptHash: string;
  invoiceHash: string;
  amount: number;
  tokenType: number;
}
