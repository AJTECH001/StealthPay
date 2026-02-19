/**
 * Backend API client for StealthPay.
 * Uses VITE_API_URL or falls back to same-origin /api.
 */

// In dev, Vite proxies /api to backend. In prod, set VITE_API_URL.
const API_BASE = import.meta.env.VITE_API_URL || "";

async function fetchApi(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  return res;
}

export type Invoice = {
  invoice_hash: string;
  status: string;
  merchant_address: string;
  payer_address?: string;
  amount: number;
  memo?: string;
  invoice_transaction_id?: string;
  payment_tx_ids?: string | string[];
  salt?: string;
  invoice_type: number;
  created_at: string;
  updated_at: string;
};

export type InvoiceStats = {
  total: number;
  pending: number;
  settled: number;
  merchants: number;
};

export const api = {
  async getInvoices(params?: { status?: string; limit?: number; merchant?: string }): Promise<Invoice[]> {
    const search = new URLSearchParams();
    if (params?.status) search.set("status", params.status);
    if (params?.limit) search.set("limit", String(params.limit));
    if (params?.merchant) search.set("merchant", params.merchant);
    const q = search.toString();
    const res = await fetchApi(`/api/invoices${q ? `?${q}` : ""}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getInvoicesByMerchant(address: string): Promise<Invoice[]> {
    const res = await fetchApi(`/api/invoices/merchant/${encodeURIComponent(address)}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getRecentInvoices(limit = 10): Promise<Invoice[]> {
    const res = await fetchApi(`/api/invoices/recent?limit=${limit}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getInvoiceByHash(hash: string): Promise<Invoice> {
    const res = await fetchApi(`/api/invoice/${encodeURIComponent(hash)}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getInvoiceBySalt(salt: string, amount: number | string): Promise<Invoice> {
    const res = await fetchApi(
      `/api/invoices/by-salt?salt=${encodeURIComponent(salt)}&amount=${encodeURIComponent(String(amount))}`
    );
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getStats(): Promise<InvoiceStats> {
    const res = await fetchApi("/api/invoices/stats");
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async createInvoice(data: {
    invoice_hash: string;
    merchant_address: string;
    amount: number;
    memo?: string;
    status?: string;
    invoice_transaction_id?: string;
    salt?: string;
    invoice_type?: number;
  }): Promise<Invoice> {
    const res = await fetchApi("/api/invoices", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async updateInvoice(
    hash: string,
    data: { status?: string; payment_tx_ids?: string; payer_address?: string }
  ): Promise<Invoice> {
    const res = await fetchApi(`/api/invoices/${encodeURIComponent(hash)}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
};
