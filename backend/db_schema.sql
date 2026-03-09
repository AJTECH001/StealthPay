-- StealthPay invoices (for indexer / API)
CREATE TABLE IF NOT EXISTS invoices (
    invoice_hash TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    block_height INTEGER,
    block_settled INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    merchant_address TEXT,
    payer_address TEXT,
    amount NUMERIC,
    memo TEXT,
    invoice_transaction_id TEXT,
    payment_tx_ids TEXT,
    salt TEXT,
    invoice_type INTEGER DEFAULT 0
);

-- Ensure all columns exist if table was created with an older schema
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payer_address TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS salt TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_type INTEGER DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_tx_ids TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS memo TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_transaction_id TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS block_height INTEGER;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS block_settled INTEGER;

CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_merchant ON invoices(merchant_address);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_tx ON invoices(invoice_transaction_id);
CREATE INDEX IF NOT EXISTS idx_invoices_salt ON invoices(salt);
CREATE INDEX IF NOT EXISTS idx_invoices_salt_amount ON invoices(salt, amount);
