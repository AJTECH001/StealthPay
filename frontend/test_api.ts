import fetch from "node-fetch";

const EXPLORER_BASES = [
  "https://api.explorer.aleo.org/v1/testnet",
  "https://api.explorer.provable.com/v1/testnet",
];
const PROGRAM_ID = "stealthpay_payroll_v2.aleo";
const employer = "aleo1gglqej3ple3a7twtpk6f7g69cnhsmlc0vexkfj6hspx90mrd35zsx75m46";

async function fetchMapping(mapping: string, key: string): Promise<string | null> {
  console.log(`Starting fetchMapping for ${mapping}`);
  for (const base of EXPLORER_BASES) {
    try {
      console.log(`  Trying ${base}...`);
      const url = `${base}/program/${PROGRAM_ID}/mapping/${mapping}/${encodeURIComponent(key)}`;
      console.log(`  URL: ${url}`);
      
      const res = await fetch(url);
      console.log(`  Status: ${res.status}`);
      if (res.ok) {
        const text = await res.text();
        console.log(`  Raw text: ${text}`);
        try {
          const val = JSON.parse(text);
          if (val !== null && val !== undefined) return String(val);
        } catch (e) {
          console.log("  JSON Parse Error", e);
        }
      }
    } catch (e) { console.log(`  Fetch error on ${base}:`, e.message); }
  }
  return null;
}

function parseBigInt(val: string | undefined): bigint {
  if (!val) return 0n;
  try { return BigInt(val.replace(/[a-zA-Z]+$/, "").trim()); } catch { return 0n; }
}

async function run() {
    console.log("Starting test...");
    const [c, u] = await Promise.all([
      fetchMapping("company_credits", employer),
      fetchMapping("company_usdcx", employer),
    ]);
    console.log("c =", c);
    console.log("u =", u);
    console.log("Parsed Credits =", c && c !== "null" ? parseBigInt(c) : 0n);
    console.log("Parsed USDCX =", u && u !== "null" ? parseBigInt(u) : 0n);
}

run();
