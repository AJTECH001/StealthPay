import { getPool } from './_lib/db.js';
import { encrypt, decrypt } from './_lib/encryption.js';

function json(res, status, data) {
  res.status(status).json(data);
}

export default async function handler(req, res) {
  // Simple request logger
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const slug = req.query.slug ?? [];
  const method = req.method;
  const pool = getPool();

  try {
    // GET /api/invoices/stats
    if (slug[0] === 'invoices' && slug[1] === 'stats' && slug.length === 2 && method === 'GET') {
      const [total, pending, settled, merchants] = await Promise.all([
        pool.query('SELECT COUNT(*)::int as count FROM invoices'),
        pool.query("SELECT COUNT(*)::int as count FROM invoices WHERE status = 'PENDING'"),
        pool.query("SELECT COUNT(*)::int as count FROM invoices WHERE status = 'SETTLED'"),
        pool.query('SELECT merchant_address FROM invoices'),
      ]);
      const uniqueMerchants = new Set(
        (merchants.rows ?? []).map(r => decrypt(r.merchant_address)).filter(Boolean)
      );
      return json(res, 200, {
        total: total.rows[0]?.count ?? 0,
        pending: pending.rows[0]?.count ?? 0,
        settled: settled.rows[0]?.count ?? 0,
        merchants: uniqueMerchants.size,
      });
    }

    // GET /api/invoices/recent
    if (slug[0] === 'invoices' && slug[1] === 'recent' && slug.length === 2 && method === 'GET') {
      const limit = Math.min(Number(req.query.limit) || 10, 50);
      const result = await pool.query('SELECT * FROM invoices ORDER BY created_at DESC LIMIT $1', [limit]);
      const rows = (result.rows ?? []).map(inv => {
        const { payer_address, ...rest } = inv;
        return { ...rest, merchant_address: decrypt(inv.merchant_address) };
      });
      return json(res, 200, rows);
    }

    // GET /api/invoices/by-salt
    if (slug[0] === 'invoices' && slug[1] === 'by-salt' && slug.length === 2 && method === 'GET') {
      const { salt, amount } = req.query;
      if (!salt || amount === undefined) return json(res, 400, { error: 'Missing salt or amount' });
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum)) return json(res, 400, { error: 'Invalid amount' });
      const result = await pool.query(
        `SELECT * FROM invoices WHERE salt = $1 AND amount BETWEEN $2::numeric - 0.000001 AND $2::numeric + 0.000001 LIMIT 1`,
        [salt, amountNum]
      );
      if (!result.rows?.length) return json(res, 404, { error: 'Invoice not found' });
      const { payer_address, ...rest } = result.rows[0];
      return json(res, 200, { ...rest, merchant_address: decrypt(rest.merchant_address) });
    }

    // GET /api/invoices/merchant/:address
    if (slug[0] === 'invoices' && slug[1] === 'merchant' && slug[2] && method === 'GET') {
      const address = decodeURIComponent(slug[2]);
      const result = await pool.query('SELECT * FROM invoices ORDER BY created_at DESC LIMIT 100');
      const rows = (result.rows ?? [])
        .map(inv => {
          const { payer_address, ...rest } = inv;
          return { ...rest, merchant_address: decrypt(inv.merchant_address) };
        })
        .filter(inv => inv.merchant_address === address);
      return json(res, 200, rows);
    }

    // GET /api/invoices/payer/:address
    if (slug[0] === 'invoices' && slug[1] === 'payer' && slug[2] && method === 'GET') {
      const address = decodeURIComponent(slug[2]);
      const result = await pool.query('SELECT * FROM invoices ORDER BY created_at DESC LIMIT 200');
      const rows = (result.rows ?? [])
        .filter(inv => {
          try { return decrypt(inv.payer_address) === address; } catch { return false; }
        })
        .map(inv => {
          const { payer_address, ...rest } = inv;
          return { ...rest, merchant_address: decrypt(inv.merchant_address) };
        });
      return json(res, 200, rows);
    }

    // GET /api/invoices (list) or POST /api/invoices (create)
    if (slug[0] === 'invoices' && slug.length === 1) {
      if (method === 'GET') {
        const { status, limit = 50, merchant } = req.query;
        const limitNum = Math.min(Number(limit) || 50, 100);
        const result = status
          ? await pool.query('SELECT * FROM invoices WHERE status = $1 ORDER BY created_at DESC LIMIT $2', [status, limitNum])
          : await pool.query('SELECT * FROM invoices ORDER BY created_at DESC LIMIT $1', [limitNum]);
        let rows = (result.rows ?? []).map(inv => {
          const { payer_address, ...rest } = inv;
          return { ...rest, merchant_address: decrypt(inv.merchant_address) };
        });
        if (merchant) rows = rows.filter(inv => inv.merchant_address === merchant);
        return json(res, 200, rows);
      }

      if (method === 'POST') {
        const { invoice_hash, merchant_address, amount, memo, status, invoice_transaction_id, salt, invoice_type, token_type } = req.body;
        if (!invoice_hash || !merchant_address) return json(res, 400, { error: 'Missing required fields' });
        const encryptedMerchant = encrypt(merchant_address);
        await pool.query(
          `INSERT INTO invoices (invoice_hash, merchant_address, amount, memo, status, invoice_transaction_id, salt, invoice_type, token_type)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           ON CONFLICT (invoice_hash) DO UPDATE SET
             merchant_address=EXCLUDED.merchant_address, amount=EXCLUDED.amount, memo=EXCLUDED.memo,
             status=EXCLUDED.status, invoice_transaction_id=EXCLUDED.invoice_transaction_id,
             salt=EXCLUDED.salt, invoice_type=EXCLUDED.invoice_type, token_type=EXCLUDED.token_type,
             updated_at=NOW()`,
          [invoice_hash, encryptedMerchant, amount ?? 0, memo ?? null, status ?? 'PENDING',
           invoice_transaction_id ?? null, salt ?? null, invoice_type ?? 0, token_type ?? 0]
        );
        const sel = await pool.query('SELECT * FROM invoices WHERE invoice_hash = $1 LIMIT 1', [invoice_hash]);
        const data = sel.rows[0];
        if (data) { data.merchant_address = merchant_address; delete data.payer_address; }
        return json(res, 200, data);
      }
    }

    // GET /api/invoices/:hash  or  PATCH /api/invoices/:hash
    if (slug[0] === 'invoices' && slug[1] && slug.length === 2) {
      const hash = decodeURIComponent(slug[1]);

      if (method === 'GET') {
        const result = await pool.query('SELECT * FROM invoices WHERE invoice_hash = $1 LIMIT 1', [hash]);
        if (!result.rows?.length) return json(res, 404, { error: 'Invoice not found' });
        const { payer_address, ...rest } = result.rows[0];
        return json(res, 200, { ...rest, merchant_address: decrypt(rest.merchant_address) });
      }

      if (method === 'PATCH') {
        const { status, payment_tx_ids, payer_address, block_settled } = req.body;
        const cur = await pool.query('SELECT payment_tx_ids FROM invoices WHERE invoice_hash = $1 LIMIT 1', [hash]);
        if (!cur.rows?.length) return json(res, 404, { error: 'Invoice not found' });

        const setClauses = ['updated_at = NOW()'];
        const values = [];
        let i = 1;
        if (status) { setClauses.push(`status = $${i++}`); values.push(status); }
        if (block_settled !== undefined) { setClauses.push(`block_settled = $${i++}`); values.push(block_settled); }
        if (payer_address) { setClauses.push(`payer_address = $${i++}`); values.push(encrypt(payer_address)); }
        if (payment_tx_ids) {
          let ids = [];
          try { ids = cur.rows[0].payment_tx_ids ? JSON.parse(cur.rows[0].payment_tx_ids) : []; } catch { ids = cur.rows[0].payment_tx_ids ? [cur.rows[0].payment_tx_ids] : []; }
          if (!Array.isArray(ids)) ids = [ids];
          const newIds = ids.includes(payment_tx_ids) ? ids : [...ids, payment_tx_ids];
          setClauses.push(`payment_tx_ids = $${i++}`);
          values.push(JSON.stringify(newIds));
        }
        values.push(hash);
        await pool.query(`UPDATE invoices SET ${setClauses.join(', ')} WHERE invoice_hash = $${i}`, values);
        const sel = await pool.query('SELECT * FROM invoices WHERE invoice_hash = $1 LIMIT 1', [hash]);
        const { payer_address: _pa, ...rest } = sel.rows[0];
        return json(res, 200, { ...rest, merchant_address: decrypt(rest.merchant_address) });
      }
    }

    // GET /api/invoice/:hash  (singular)
    if (slug[0] === 'invoice' && slug[1] && method === 'GET') {
      const hash = decodeURIComponent(slug[1]);
      const result = await pool.query('SELECT * FROM invoices WHERE invoice_hash = $1 LIMIT 1', [hash]);
      if (!result.rows?.length) return json(res, 404, { error: 'Invoice not found' });
      const { payer_address, ...rest } = result.rows[0];
      return json(res, 200, { ...rest, merchant_address: decrypt(rest.merchant_address) });
    }

    return json(res, 404, { error: 'Not found' });
  } catch (err) {
    console.error(err);
    return json(res, 500, { error: err.message });
  }
}
