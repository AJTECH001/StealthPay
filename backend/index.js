const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { encrypt, decrypt } = require('./encryption');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    console.error('Error: DATABASE_URL must be set in .env');
    process.exit(1);
}

const pool = new Pool({ connectionString: databaseUrl });

app.get('/', (req, res) => {
    res.send('StealthPay Backend is running');
});

app.get('/api/invoices', async (req, res) => {
    const { status, limit = 50, merchant } = req.query;
    const limitNum = Math.min(Number(limit) || 50, 100);

    try {
        let result;
        if (status) {
            result = await pool.query(
                'SELECT * FROM invoices WHERE status = $1 ORDER BY created_at DESC LIMIT $2',
                [status, limitNum]
            );
        } else {
            result = await pool.query(
                'SELECT * FROM invoices ORDER BY created_at DESC LIMIT $1',
                [limitNum]
            );
        }
        const rows = result.rows;

        const decryptedData = (rows || []).map(inv => ({
            ...inv,
            merchant_address: decrypt(inv.merchant_address),
            payer_address: decrypt(inv.payer_address),
        }));

        let finalData = decryptedData;
        if (merchant) {
            finalData = finalData.filter(inv => inv.merchant_address === merchant);
        }

        res.json(finalData);
    } catch (error) {
        console.error('Error fetching invoices:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/invoices/merchant/:address', async (req, res) => {
    const { address } = req.params;

    try {
        const result = await pool.query(
            'SELECT * FROM invoices ORDER BY created_at DESC LIMIT 100'
        );
        const rows = result.rows;

        const merchantInvoices = (rows || [])
            .map(inv => ({
                ...inv,
                merchant_address: decrypt(inv.merchant_address),
                payer_address: decrypt(inv.payer_address),
            }))
            .filter(inv => inv.merchant_address === address);

        res.json(merchantInvoices);
    } catch (error) {
        console.error('Error fetching invoices:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/invoices/recent', async (req, res) => {
    const { limit = 10 } = req.query;
    const limitNum = Math.min(Number(limit) || 10, 50);

    try {
        const result = await pool.query(
            'SELECT * FROM invoices ORDER BY created_at DESC LIMIT $1',
            [limitNum]
        );
        const rows = result.rows;

        const decryptedData = (rows || []).map(inv => ({
            ...inv,
            merchant_address: decrypt(inv.merchant_address),
            payer_address: decrypt(inv.payer_address),
        }));

        res.json(decryptedData);
    } catch (error) {
        console.error('Error fetching recent invoices:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/invoices/by-salt', async (req, res) => {
    const { salt, amount } = req.query;
    if (!salt || !amount) {
        return res.status(400).json({ error: 'Missing salt or amount' });
    }

    try {
        // Match by salt; use tolerance for amount (avoids float precision issues)
        const amountNum = parseFloat(amount);
        const result = await pool.query(
            `SELECT * FROM invoices WHERE salt = $1 AND amount BETWEEN $2::numeric - 0.000001 AND $2::numeric + 0.000001 LIMIT 1`,
            [salt, amountNum]
        );
        const rows = result.rows;

        if (!rows || rows.length === 0) {
            return res.status(404).json({ error: 'Invoice not found' });
        }

        const data = rows[0];
        data.merchant_address = decrypt(data.merchant_address);
        data.payer_address = decrypt(data.payer_address);

        res.json(data);
    } catch (error) {
        console.error('Error fetching invoice by salt:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/invoices/stats', async (req, res) => {
    try {
        const totalResult = await pool.query('SELECT COUNT(*)::int as count FROM invoices');
        const pendingResult = await pool.query(
            "SELECT COUNT(*)::int as count FROM invoices WHERE status = 'PENDING'"
        );
        const settledResult = await pool.query(
            "SELECT COUNT(*)::int as count FROM invoices WHERE status = 'SETTLED'"
        );
        const merchantsResult = await pool.query(
            'SELECT COUNT(DISTINCT merchant_address)::int as count FROM invoices'
        );

        res.json({
            total: totalResult.rows[0]?.count ?? 0,
            pending: pendingResult.rows[0]?.count ?? 0,
            settled: settledResult.rows[0]?.count ?? 0,
            merchants: merchantsResult.rows[0]?.count ?? 0,
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/invoice/:hash', async (req, res) => {
    const { hash } = req.params;

    try {
        const result = await pool.query(
            'SELECT * FROM invoices WHERE invoice_hash = $1 LIMIT 1',
            [hash]
        );
        const rows = result.rows;

        if (!rows || rows.length === 0) {
            return res.status(404).json({ error: 'Invoice not found' });
        }

        const data = rows[0];
        data.merchant_address = decrypt(data.merchant_address);
        data.payer_address = decrypt(data.payer_address);

        res.json(data);
    } catch (error) {
        console.error('Error fetching invoice:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/invoices', async (req, res) => {
    const { invoice_hash, merchant_address, amount, memo, status, invoice_transaction_id, salt, invoice_type } = req.body;

    if (!invoice_hash || !merchant_address || !amount) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const encryptedMerchant = encrypt(merchant_address);
        const statusVal = status || 'PENDING';
        const invoiceTypeVal = invoice_type !== undefined ? invoice_type : 0;

        await pool.query(
            `INSERT INTO invoices (
                invoice_hash, merchant_address, amount, memo, status,
                invoice_transaction_id, salt, invoice_type
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (invoice_hash) DO UPDATE SET
                merchant_address = EXCLUDED.merchant_address,
                amount = EXCLUDED.amount,
                memo = EXCLUDED.memo,
                status = EXCLUDED.status,
                invoice_transaction_id = EXCLUDED.invoice_transaction_id,
                salt = EXCLUDED.salt,
                invoice_type = EXCLUDED.invoice_type,
                updated_at = NOW()`,
            [
                invoice_hash,
                encryptedMerchant,
                amount,
                memo || null,
                statusVal,
                invoice_transaction_id || null,
                salt || null,
                invoiceTypeVal,
            ]
        );

        const selectResult = await pool.query(
            'SELECT * FROM invoices WHERE invoice_hash = $1 LIMIT 1',
            [invoice_hash]
        );
        const rows = selectResult.rows;

        const data = rows[0];
        if (data) data.merchant_address = merchant_address;

        res.json(data);
    } catch (err) {
        console.error('Error creating invoice:', err);
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/invoices/:hash', async (req, res) => {
    const { hash } = req.params;
    const { status, payment_tx_ids, payer_address, block_settled } = req.body;

    try {
        const currentResult = await pool.query(
            'SELECT payment_tx_ids, invoice_type, status FROM invoices WHERE invoice_hash = $1 LIMIT 1',
            [hash]
        );
        const currentRows = currentResult.rows;

        if (!currentRows || currentRows.length === 0) {
            return res.status(404).json({ error: 'Invoice not found' });
        }

        const current = currentRows[0];
        const setClauses = ['updated_at = NOW()'];
        const values = [];
        let paramIndex = 1;

        if (status) {
            setClauses.push(`status = $${paramIndex++}`);
            values.push(status);
        }
        if (block_settled !== undefined) {
            setClauses.push(`block_settled = $${paramIndex++}`);
            values.push(block_settled);
        }
        if (payer_address) {
            setClauses.push(`payer_address = $${paramIndex++}`);
            values.push(encrypt(payer_address));
        }
        if (payment_tx_ids) {
            const currentIds = Array.isArray(current.payment_tx_ids)
                ? current.payment_tx_ids
                : (typeof current.payment_tx_ids === 'string'
                    ? (current.payment_tx_ids ? JSON.parse(current.payment_tx_ids) : [])
                    : []);
            const newIds = currentIds.includes(payment_tx_ids) ? currentIds : [...currentIds, payment_tx_ids];
            setClauses.push(`payment_tx_ids = $${paramIndex++}`);
            values.push(JSON.stringify(newIds));
        }

        values.push(hash);

        await pool.query(
            `UPDATE invoices SET ${setClauses.join(', ')} WHERE invoice_hash = $${paramIndex}`,
            values
        );

        const selectResult = await pool.query(
            'SELECT * FROM invoices WHERE invoice_hash = $1 LIMIT 1',
            [hash]
        );
        const rows = selectResult.rows;

        const data = rows[0];
        if (data) {
            data.merchant_address = decrypt(data.merchant_address);
            data.payer_address = decrypt(data.payer_address);
        }

        res.json(data);
    } catch (err) {
        console.error('Error updating invoice:', err);
        res.status(500).json({ error: err.message });
    }
});

app.listen(port, () => {
    console.log(`StealthPay backend running on port ${port}`);
});
