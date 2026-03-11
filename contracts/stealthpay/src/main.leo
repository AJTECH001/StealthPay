import credits.aleo;
import test_usdcx_stablecoin.aleo;

program stealthpay_usdcx_v2.aleo {
    // Upgrade authority for program updates on live networks.
    @admin(address="aleo1eedp9ws4jattrw93nvnlnl7y6uvf0pns5ckzd6rfttfzf28rcy9q06jexz")
    async constructor() {}

    // Private receipt record owned by the merchant; decryptable via view key for selective disclosure.
    record Payment {
        owner: address,
        amount: u64,
        payer: address,
        token_type: u8, // 0 = Credits, 1 = USDCx
    }

    // Invoice metadata stored by commitment hash only; merchant and amount are never plaintext on-chain.
    struct InvoiceData {
        expiry_height: u32,
        status: u8,       // 0 = Open, 1 = Settled
        invoice_type: u8, // 0 = Standard (single payment), 1 = Multi-pay (campaign)
        token_type: u8,   // 0 = Credits, 1 = USDCx
    }

    mapping invoices: field => InvoiceData;
    mapping payment_receipts: field => u64; // commitment(receipt) -> amount; enforces uniqueness and replay protection

    // Registers an invoice commitment. Hash = BHP256(merchant) + BHP256(amount) + BHP256(salt).
    async transition create_invoice(
        private merchant: address,
        private amount: u64,
        private salt: field,
        public expiry_hours: u32,
        public invoice_type: u8
    ) -> (public field, Future) {
        let merchant_field: field = merchant as field;
        let amount_field: field = amount as field;
        let merchant_hash: field = BHP256::hash_to_field(merchant_field);
        let amount_hash: field = BHP256::hash_to_field(amount_field);
        let salt_hash: field = BHP256::hash_to_field(salt);
        let invoice_hash: field = merchant_hash + amount_hash + salt_hash;
        return (invoice_hash, finalize_create_invoice(invoice_hash, expiry_hours, invoice_type, 0u8));
    }

    async transition create_invoice_usdcx(
        private merchant: address,
        private amount: u128,
        private salt: field,
        public expiry_hours: u32,
        public invoice_type: u8
    ) -> (public field, Future) {
        let merchant_field: field = merchant as field;
        let amount_field: field = amount as field;
        let merchant_hash: field = BHP256::hash_to_field(merchant_field);
        let amount_hash: field = BHP256::hash_to_field(amount_field);
        let salt_hash: field = BHP256::hash_to_field(salt);
        let invoice_hash: field = merchant_hash + amount_hash + salt_hash;
        return (invoice_hash, finalize_create_invoice(invoice_hash, expiry_hours, invoice_type, 1u8));
    }

    async function finalize_create_invoice(
        invoice_hash: field,
        expiry_hours: u32,
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
    }

    // Settles an invoice: verifies commitment, executes private transfer, issues Payment record, and records receipt key.
    async transition pay_invoice(
        pay_record: credits.aleo/credits,
        merchant: address,
        amount: u64,
        salt: field,
        private payment_secret: field,
        public message: field
    ) -> (credits.aleo/credits, credits.aleo/credits, Payment, Future) {
        let (merchant_credits, change_credits): (credits.aleo/credits, credits.aleo/credits) =
            credits.aleo/transfer_private(pay_record, merchant, amount);

        let payment: Payment = Payment {
            owner: merchant,
            amount: amount,
            payer: self.caller,
            token_type: 0u8,
        };

        let merchant_field: field = merchant as field;
        let amount_field: field = amount as field;
        let merchant_hash: field = BHP256::hash_to_field(merchant_field);
        let amount_hash: field = BHP256::hash_to_field(amount_field);
        let salt_hash: field = BHP256::hash_to_field(salt);
        let invoice_hash: field = merchant_hash + amount_hash + salt_hash;

        let salt_scalar: scalar = BHP256::hash_to_scalar(salt);
        let receipt_key: field = BHP256::commit_to_field(payment_secret, salt_scalar);

        let f0: Future = finalize_pay_invoice(invoice_hash, receipt_key, amount, 0u8);
        return (merchant_credits, change_credits, payment, f0);
    }

    async transition pay_invoice_usdcx(
        pay_record: test_usdcx_stablecoin.aleo/Token,
        merchant: address,
        amount: u128,
        salt: field,
        private payment_secret: field,
        public message: field,
        private proofs: [MerkleProof; 2]
    ) -> (test_usdcx_stablecoin.aleo/Token, test_usdcx_stablecoin.aleo/Token, test_usdcx_stablecoin.aleo/ComplianceRecord, Payment, Future) {
        
        let (compliance_record, change_record, merchant_record, transfer_future): (test_usdcx_stablecoin.aleo/ComplianceRecord, test_usdcx_stablecoin.aleo/Token, test_usdcx_stablecoin.aleo/Token, Future) = 
            test_usdcx_stablecoin.aleo/transfer_private(merchant, amount, pay_record, proofs);

        let payment: Payment = Payment {
            owner: merchant,
            amount: amount as u64,
            payer: self.caller,
            token_type: 1u8,
        };

        let merchant_field: field = merchant as field;
        let amount_field: field = amount as field;
        let merchant_hash: field = BHP256::hash_to_field(merchant_field);
        let amount_hash: field = BHP256::hash_to_field(amount_field);
        let salt_hash: field = BHP256::hash_to_field(salt);
        let invoice_hash: field = merchant_hash + amount_hash + salt_hash;

        let salt_scalar: scalar = BHP256::hash_to_scalar(salt);
        let receipt_key: field = BHP256::commit_to_field(payment_secret, salt_scalar);

        let f0: Future = finalize_pay_invoice_usdcx(invoice_hash, receipt_key, amount, 1u8, transfer_future);
        return (merchant_record, change_record, compliance_record, payment, f0);
    }

    async function finalize_pay_invoice(
        invoice_hash: field,
        receipt_key: field,
        amount: u64,
        expected_token_type: u8
    ) {
        let invoice_data: InvoiceData = invoices.get(invoice_hash);
        
        assert_eq(invoice_data.token_type, expected_token_type);

        if invoice_data.expiry_height != 0u32 {
            assert(block.height <= invoice_data.expiry_height);
        }

        if (invoice_data.invoice_type == 0u8) {
            assert_eq(invoice_data.status, 0u8);
            let updated_data: InvoiceData = InvoiceData {
                expiry_height: invoice_data.expiry_height,
                status: 1u8,
                invoice_type: invoice_data.invoice_type,
                token_type: invoice_data.token_type,
            };
            invoices.set(invoice_hash, updated_data);
        }

        let exists: bool = payment_receipts.contains(receipt_key);
        assert(!exists);
        payment_receipts.set(receipt_key, amount);
    }

    async function finalize_pay_invoice_usdcx(
        invoice_hash: field,
        receipt_key: field,
        amount: u128,
        expected_token_type: u8,
        f0: Future
    ) {
        f0.await();
        let invoice_data: InvoiceData = invoices.get(invoice_hash);
        
        assert_eq(invoice_data.token_type, expected_token_type);

        if invoice_data.expiry_height != 0u32 {
            assert(block.height <= invoice_data.expiry_height);
        }

        if (invoice_data.invoice_type == 0u8) {
            assert_eq(invoice_data.status, 0u8);
            let updated_data: InvoiceData = InvoiceData {
                expiry_height: invoice_data.expiry_height,
                status: 1u8,
                invoice_type: invoice_data.invoice_type,
                token_type: invoice_data.token_type,
            };
            invoices.set(invoice_hash, updated_data);
        }

        let exists: bool = payment_receipts.contains(receipt_key);
        assert(!exists);
        payment_receipts.set(receipt_key, amount as u64); // Safe conversion for tracking
    }

    // Closes a multi-pay invoice. Caller must match the invoice merchant (verified by recomputing commitment).
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
        return finalize_settle_invoice(calculated_hash);
    }

    async function finalize_settle_invoice(invoice_hash: field) {
        let invoice_data: InvoiceData = invoices.get(invoice_hash);
        let updated_data: InvoiceData = InvoiceData {
            expiry_height: invoice_data.expiry_height,
            status: 1u8,
            invoice_type: invoice_data.invoice_type,
            token_type: invoice_data.token_type,
        };
        invoices.set(invoice_hash, updated_data);
    }

    // Returns current invoice state for a given commitment hash. Used by clients and indexers.
    async transition get_invoice_status(public invoice_hash: field) -> Future {
        return finalize_get_invoice_status(invoice_hash);
    }

    async function finalize_get_invoice_status(invoice_hash: field) {
        let invoice_data: InvoiceData = invoices.get(invoice_hash);
    }

    // Direct private transfer to a merchant with an on-chain Payment receipt. No invoice required.
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
}
