import credits.aleo;
import test_usdcx_stablecoin.aleo;

program stealthpay_usdcx_v3.aleo {
    // Upgrade authority for program updates on live networks.
    @admin(address="aleo1eedp9ws4jattrw93nvnlnl7y6uvf0pns5ckzd6rfttfzf28rcy9q06jexz")
    async constructor() {}

    // ─── Data Structures ─────────────────────────────────────────────────────

    struct InvoiceData {
        expiry_height: u32,
        status: u8,       // 0 = Open, 1 = Settled
        invoice_type: u8, // 0 = Standard (single payment), 1 = Multi-pay (campaign), 2 = Donation
        token_type: u8,   // 0 = Credits, 1 = USDCx
    }

    record PayerReceipt {
        owner: address,       // The Payer
        merchant: address,    // The Merchant
        receipt_hash: field,  // Unique Payment ID (Hash of secret + salt)
        invoice_hash: field,  // Link to specific invoice
        amount: u64,          // Amount Paid
        token_type: u8,       // 0 = Credits, 1 = USDCx
        timestamp: u64,       // Placeholder (block.timestamp not available in transition)
    }

    record MerchantReceipt {
        owner: address,       // The Merchant
        receipt_hash: field,  // Unique Payment ID (Matches Payer's receipt_hash)
        invoice_hash: field,  // Link to specific invoice
        amount: u64,          // Amount Received
        token_type: u8,       // 0 = Credits, 1 = USDCx
    }

    record Invoice {
        owner: address,       // Merchant
        invoice_hash: field,
        amount: u64,          // Amount (microcredits or USDCx smallest unit)
        token_type: u8,       // 0 = Credits, 1 = USDCx
        invoice_type: u8,     // 0 = Standard, 1 = Multi Pay, 2 = Donation
        salt: field,          // For checking against hash
        memo: field,          // Encoded Memo (max ~31 chars)
    }

    // Private receipt record for direct payments (make_payment)
    record Payment {
        owner: address,
        amount: u64,
        payer: address,
        token_type: u8, // 0 = Credits, 1 = USDCx
    }

    // ─── Mappings ────────────────────────────────────────────────────────────

    mapping invoices: field => InvoiceData;
    mapping salt_to_invoice: field => field;
    mapping payment_receipts: field => u64; // commitment(receipt) -> amount; replay protection

    // ─── Invoice Creation ────────────────────────────────────────────────────

    // Credits invoice
    async transition create_invoice(
        private merchant: address,
        private amount: u64,
        private salt: field,
        private memo: field,
        public expiry_hours: u32,
        public invoice_type: u8
    ) -> (Invoice, public field, Future) {
        let merchant_field: field = merchant as field;
        let amount_field: field = amount as field;
        let merchant_hash: field = BHP256::hash_to_field(merchant_field);
        let amount_hash: field = BHP256::hash_to_field(amount_field);
        let salt_hash: field = BHP256::hash_to_field(salt);
        let invoice_hash: field = merchant_hash + amount_hash + salt_hash;

        let invoice_record: Invoice = Invoice {
            owner: merchant,
            invoice_hash: invoice_hash,
            amount: amount,
            token_type: 0u8,
            invoice_type: invoice_type,
            salt: salt,
            memo: memo
        };

        return (invoice_record, invoice_hash, finalize_create_invoice(invoice_hash, expiry_hours, salt, invoice_type, 0u8));
    }

    // USDCx invoice
    async transition create_invoice_usdcx(
        private merchant: address,
        private amount: u128,
        private salt: field,
        private memo: field,
        public expiry_hours: u32,
        public invoice_type: u8
    ) -> (Invoice, public field, Future) {
        let merchant_field: field = merchant as field;
        let amount_field: field = amount as field;
        let merchant_hash: field = BHP256::hash_to_field(merchant_field);
        let amount_hash: field = BHP256::hash_to_field(amount_field);
        let salt_hash: field = BHP256::hash_to_field(salt);
        let invoice_hash: field = merchant_hash + amount_hash + salt_hash;

        let amount_u64: u64 = amount as u64;

        let invoice_record: Invoice = Invoice {
            owner: merchant,
            invoice_hash: invoice_hash,
            amount: amount_u64,
            token_type: 1u8,
            invoice_type: invoice_type,
            salt: salt,
            memo: memo
        };

        return (invoice_record, invoice_hash, finalize_create_invoice(invoice_hash, expiry_hours, salt, invoice_type, 1u8));
    }

    async function finalize_create_invoice(
        invoice_hash: field,
        expiry_hours: u32,
        salt: field,
        invoice_type: u8,
        token_type: u8
    ) {
        let blocks_to_add: u32 = expiry_hours * 360u32;
        let expiry_height: u32 =
            expiry_hours != 0u32 ? block.height + blocks_to_add : 0u32;

        let invoice_data: InvoiceData = InvoiceData {
            expiry_height: expiry_height,
            status: 0u8,
            invoice_type: invoice_type,
            token_type: token_type,
        };

        invoices.set(invoice_hash, invoice_data);
        salt_to_invoice.set(salt, invoice_hash);
    }

    // ─── Donation Payments ───────────────────────────────────────────────────

    async transition pay_donation(
        pay_record: credits.aleo/credits,
        merchant: address,
        amount_to_donate: u64,
        salt: field,
        private payment_secret: field,
        public message: field
    ) -> (credits.aleo/credits, credits.aleo/credits, PayerReceipt, MerchantReceipt, Future) {
        let (r1, r2): (credits.aleo/credits, credits.aleo/credits) =
            credits.aleo/transfer_private(pay_record, merchant, amount_to_donate);

        let merchant_field: field = merchant as field;

        // For donation, the invoice was created with amount 0
        let amount_field: field = 0u64 as field;

        let merchant_hash: field = BHP256::hash_to_field(merchant_field);
        let amount_hash: field = BHP256::hash_to_field(amount_field);
        let salt_hash: field = BHP256::hash_to_field(salt);

        let invoice_hash: field = merchant_hash + amount_hash + salt_hash;

        let salt_scalar: scalar = BHP256::hash_to_scalar(salt);
        let receipt_hash: field = BHP256::commit_to_field(payment_secret, salt_scalar);

        let payer_receipt: PayerReceipt = PayerReceipt {
            owner: self.caller,
            merchant: merchant,
            receipt_hash: receipt_hash,
            invoice_hash: invoice_hash,
            amount: amount_to_donate,
            token_type: 0u8,
            timestamp: 0u64
        };

        let merchant_receipt: MerchantReceipt = MerchantReceipt {
            owner: merchant,
            receipt_hash: receipt_hash,
            invoice_hash: invoice_hash,
            amount: amount_to_donate,
            token_type: 0u8
        };

        let f0: Future = finalize_pay_donation(invoice_hash, salt, receipt_hash, amount_to_donate, 0u8);
        return (r1, r2, payer_receipt, merchant_receipt, f0);
    }

    async function finalize_pay_donation(
        invoice_hash: field,
        salt: field,
        receipt_key: field,
        amount: u64,
        expected_token_type: u8
    ) {
        let stored_hash: field = salt_to_invoice.get(salt);
        assert_eq(invoice_hash, stored_hash);

        let invoice_data: InvoiceData = invoices.get(stored_hash);
        assert_eq(invoice_data.token_type, expected_token_type);

        // Ensure it is a Donation Invoice (Type 2)
        assert_eq(invoice_data.invoice_type, 2u8);

        // Enforce Status is Open (0)
        assert_eq(invoice_data.status, 0u8);

        if invoice_data.expiry_height != 0u32 {
            assert(block.height <= invoice_data.expiry_height);
        }

        // Replay protection
        let exists: bool = payment_receipts.contains(receipt_key);
        assert(!exists);
        payment_receipts.set(receipt_key, amount);
    }

    async transition pay_donation_usdcx(
        pay_record: test_usdcx_stablecoin.aleo/Token,
        merchant: address,
        amount_to_donate: u128,
        salt: field,
        private payment_secret: field,
        public message: field,
        private proofs: [MerkleProof; 2]
    ) -> (test_usdcx_stablecoin.aleo/Token, test_usdcx_stablecoin.aleo/Token, test_usdcx_stablecoin.aleo/ComplianceRecord, PayerReceipt, MerchantReceipt, Future) {

        let (compliance_record, transfer_output_1, transfer_output_2, transfer_future): (test_usdcx_stablecoin.aleo/ComplianceRecord, test_usdcx_stablecoin.aleo/Token, test_usdcx_stablecoin.aleo/Token, Future) =
            test_usdcx_stablecoin.aleo/transfer_private(merchant, amount_to_donate, pay_record, proofs);

        let merchant_field: field = merchant as field;

        // For donation, the invoice was created with amount 0 (u128)
        let amount_field: field = 0u128 as field;

        let merchant_hash: field = BHP256::hash_to_field(merchant_field);
        let amount_hash: field = BHP256::hash_to_field(amount_field);
        let salt_hash: field = BHP256::hash_to_field(salt);

        let invoice_hash: field = merchant_hash + amount_hash + salt_hash;

        let salt_scalar: scalar = BHP256::hash_to_scalar(salt);
        let receipt_hash: field = BHP256::commit_to_field(payment_secret, salt_scalar);

        let payer_receipt: PayerReceipt = PayerReceipt {
            owner: self.caller,
            merchant: merchant,
            receipt_hash: receipt_hash,
            invoice_hash: invoice_hash,
            amount: amount_to_donate as u64,
            token_type: 1u8,
            timestamp: 0u64
        };

        let merchant_receipt: MerchantReceipt = MerchantReceipt {
            owner: merchant,
            receipt_hash: receipt_hash,
            invoice_hash: invoice_hash,
            amount: amount_to_donate as u64,
            token_type: 1u8
        };

        let f0: Future = finalize_pay_donation_usdcx(invoice_hash, salt, receipt_hash, amount_to_donate as u64, 1u8, transfer_future);

        return (transfer_output_1, transfer_output_2, compliance_record, payer_receipt, merchant_receipt, f0);
    }

    async function finalize_pay_donation_usdcx(
        invoice_hash: field,
        salt: field,
        receipt_key: field,
        amount: u64,
        expected_token_type: u8,
        f0: Future
    ) {
        f0.await();
        let stored_hash: field = salt_to_invoice.get(salt);
        assert_eq(invoice_hash, stored_hash);

        let invoice_data: InvoiceData = invoices.get(stored_hash);
        assert_eq(invoice_data.token_type, expected_token_type);

        // Ensure it is a Donation Invoice (Type 2)
        assert_eq(invoice_data.invoice_type, 2u8);

        // Enforce Status is Open (0)
        assert_eq(invoice_data.status, 0u8);

        if invoice_data.expiry_height != 0u32 {
            assert(block.height <= invoice_data.expiry_height);
        }

        // Replay protection
        let exists: bool = payment_receipts.contains(receipt_key);
        assert(!exists);
        payment_receipts.set(receipt_key, amount);
    }

    // ─── Invoice Payments ────────────────────────────────────────────────────

    // Credits payment
    async transition pay_invoice(
        pay_record: credits.aleo/credits,
        merchant: address,
        amount: u64,
        salt: field,
        private payment_secret: field,
        public message: field
    ) -> (credits.aleo/credits, credits.aleo/credits, PayerReceipt, MerchantReceipt, Future) {
        let (r1, r2): (credits.aleo/credits, credits.aleo/credits) =
            credits.aleo/transfer_private(pay_record, merchant, amount);

        let merchant_field: field = merchant as field;
        let amount_field: field = amount as field;

        let merchant_hash: field = BHP256::hash_to_field(merchant_field);
        let amount_hash: field = BHP256::hash_to_field(amount_field);
        let salt_hash: field = BHP256::hash_to_field(salt);

        let invoice_hash: field = merchant_hash + amount_hash + salt_hash;

        let salt_scalar: scalar = BHP256::hash_to_scalar(salt);
        let receipt_hash: field = BHP256::commit_to_field(payment_secret, salt_scalar);

        let payer_receipt: PayerReceipt = PayerReceipt {
            owner: self.caller,
            merchant: merchant,
            receipt_hash: receipt_hash,
            invoice_hash: invoice_hash,
            amount: amount,
            token_type: 0u8,
            timestamp: 0u64
        };

        let merchant_receipt: MerchantReceipt = MerchantReceipt {
            owner: merchant,
            receipt_hash: receipt_hash,
            invoice_hash: invoice_hash,
            amount: amount,
            token_type: 0u8
        };

        let f0: Future = finalize_pay_invoice(invoice_hash, salt, receipt_hash, amount, 0u8);
        return (r1, r2, payer_receipt, merchant_receipt, f0);
    }

    // USDCx payment
    async transition pay_invoice_usdcx(
        pay_record: test_usdcx_stablecoin.aleo/Token,
        merchant: address,
        amount: u128,
        salt: field,
        private payment_secret: field,
        public message: field,
        private proofs: [MerkleProof; 2]
    ) -> (test_usdcx_stablecoin.aleo/Token, test_usdcx_stablecoin.aleo/Token, test_usdcx_stablecoin.aleo/ComplianceRecord, PayerReceipt, MerchantReceipt, Future) {

        let (compliance_record, transfer_output_1, transfer_output_2, transfer_future): (test_usdcx_stablecoin.aleo/ComplianceRecord, test_usdcx_stablecoin.aleo/Token, test_usdcx_stablecoin.aleo/Token, Future) =
            test_usdcx_stablecoin.aleo/transfer_private(merchant, amount, pay_record, proofs);

        let merchant_field: field = merchant as field;
        let amount_field: field = amount as field;

        let merchant_hash: field = BHP256::hash_to_field(merchant_field);
        let amount_hash: field = BHP256::hash_to_field(amount_field);
        let salt_hash: field = BHP256::hash_to_field(salt);

        let invoice_hash: field = merchant_hash + amount_hash + salt_hash;

        let salt_scalar: scalar = BHP256::hash_to_scalar(salt);
        let receipt_hash: field = BHP256::commit_to_field(payment_secret, salt_scalar);

        let payer_receipt: PayerReceipt = PayerReceipt {
            owner: self.caller,
            merchant: merchant,
            receipt_hash: receipt_hash,
            invoice_hash: invoice_hash,
            amount: amount as u64,
            token_type: 1u8,
            timestamp: 0u64
        };

        let merchant_receipt: MerchantReceipt = MerchantReceipt {
            owner: merchant,
            receipt_hash: receipt_hash,
            invoice_hash: invoice_hash,
            amount: amount as u64,
            token_type: 1u8
        };

        let f0: Future = finalize_pay_invoice_usdcx(invoice_hash, salt, receipt_hash, amount, 1u8, transfer_future);

        return (transfer_output_1, transfer_output_2, compliance_record, payer_receipt, merchant_receipt, f0);
    }

    async function finalize_pay_invoice(
        invoice_hash: field,
        salt: field,
        receipt_key: field,
        amount: u64,
        expected_token_type: u8
    ) {
        // Verify salt maps to expected invoice
        let stored_hash: field = salt_to_invoice.get(salt);
        assert_eq(invoice_hash, stored_hash);

        let invoice_data: InvoiceData = invoices.get(stored_hash);
        assert_eq(invoice_data.token_type, expected_token_type);

        if invoice_data.expiry_height != 0u32 {
            assert(block.height <= invoice_data.expiry_height);
        }

        // Enforce Status is Open (0) for ALL types
        assert_eq(invoice_data.status, 0u8);

        if (invoice_data.invoice_type == 0u8) {
            // For Standard Invoices (0), auto-settle (set to 1)
            let updated_data: InvoiceData = InvoiceData {
                expiry_height: invoice_data.expiry_height,
                status: 1u8,
                invoice_type: invoice_data.invoice_type,
                token_type: invoice_data.token_type,
            };
            invoices.set(stored_hash, updated_data);
        }

        // Replay protection
        let exists: bool = payment_receipts.contains(receipt_key);
        assert(!exists);
        payment_receipts.set(receipt_key, amount);
    }

    async function finalize_pay_invoice_usdcx(
        invoice_hash: field,
        salt: field,
        receipt_key: field,
        amount: u128,
        expected_token_type: u8,
        f0: Future
    ) {
        f0.await();

        // Verify salt maps to expected invoice
        let stored_hash: field = salt_to_invoice.get(salt);
        assert_eq(invoice_hash, stored_hash);

        let invoice_data: InvoiceData = invoices.get(stored_hash);
        assert_eq(invoice_data.token_type, expected_token_type);

        if invoice_data.expiry_height != 0u32 {
            assert(block.height <= invoice_data.expiry_height);
        }

        // Enforce Status is Open (0) for ALL types
        assert_eq(invoice_data.status, 0u8);

        if (invoice_data.invoice_type == 0u8) {
            let updated_data: InvoiceData = InvoiceData {
                expiry_height: invoice_data.expiry_height,
                status: 1u8,
                invoice_type: invoice_data.invoice_type,
                token_type: invoice_data.token_type,
            };
            invoices.set(stored_hash, updated_data);
        }

        // Replay protection
        let exists: bool = payment_receipts.contains(receipt_key);
        assert(!exists);
        payment_receipts.set(receipt_key, amount as u64);
    }

    // ─── Settlement ──────────────────────────────────────────────────────────

    // Closes a multi-pay or donation invoice. Caller must match the invoice merchant.
    async transition settle_invoice(
        public salt: field,
        private amount: u64
    ) -> Future {
        let merchant_field: field = self.caller as field;
        let amount_field: field = amount as field;
        let merchant_hash: field = BHP256::hash_to_field(merchant_field);
        let amount_hash: field = BHP256::hash_to_field(amount_field);
        let salt_hash: field = BHP256::hash_to_field(salt);
        let calculated_hash: field = merchant_hash + amount_hash + salt_hash;
        return finalize_settle_invoice(calculated_hash, salt);
    }

    async function finalize_settle_invoice(
        calculated_hash: field,
        salt: field
    ) {
        let stored_hash: field = salt_to_invoice.get(salt);
        assert_eq(calculated_hash, stored_hash);

        let invoice_data: InvoiceData = invoices.get(stored_hash);

        let updated_data: InvoiceData = InvoiceData {
            expiry_height: invoice_data.expiry_height,
            status: 1u8,
            invoice_type: invoice_data.invoice_type,
            token_type: invoice_data.token_type,
        };

        invoices.set(stored_hash, updated_data);
    }

    // ─── Direct Payments (No Invoice Required) ──────────────────────────────

    transition make_payment(
        sender_record: credits.aleo/credits,
        amount: u64,
        merchant: address
    ) -> (credits.aleo/credits, credits.aleo/credits, Payment) {
        let (merchant_credits, change_credits): (credits.aleo/credits, credits.aleo/credits) =
            credits.aleo/transfer_private(sender_record, merchant, amount);

        let payment: Payment = Payment {
            owner: merchant,
            amount: amount,
            payer: self.caller,
            token_type: 0u8,
        };

        return (merchant_credits, change_credits, payment);
    }

    async transition make_payment_usdcx(
        sender_record: test_usdcx_stablecoin.aleo/Token,
        amount: u128,
        merchant: address,
        proofs: [MerkleProof; 2]
    ) -> (test_usdcx_stablecoin.aleo/Token, test_usdcx_stablecoin.aleo/Token, test_usdcx_stablecoin.aleo/ComplianceRecord, Payment, Future) {
        let (compliance_record, change_record, merchant_record, transfer_future): (test_usdcx_stablecoin.aleo/ComplianceRecord, test_usdcx_stablecoin.aleo/Token, test_usdcx_stablecoin.aleo/Token, Future) =
            test_usdcx_stablecoin.aleo/transfer_private(merchant, amount, sender_record, proofs);

        let payment: Payment = Payment {
            owner: merchant,
            amount: amount as u64,
            payer: self.caller,
            token_type: 1u8,
        };

        return (merchant_record, change_record, compliance_record, payment, finalize_make_payment_usdcx(transfer_future));
    }

    async function finalize_make_payment_usdcx(f0: Future) {
        f0.await();
    }

    // ─── Status Query ────────────────────────────────────────────────────────

    async transition get_invoice_status(public invoice_hash: field) -> Future {
        return finalize_get_invoice_status(invoice_hash);
    }

    async function finalize_get_invoice_status(invoice_hash: field) {
        let invoice_data: InvoiceData = invoices.get(invoice_hash);
    }
}
