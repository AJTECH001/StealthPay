import credits.aleo;

program stealthpay.aleo {
    // Upgrade authority for program updates on live networks.
    @admin(address="aleo1eedp9ws4jattrw93nvnlnl7y6uvf0pns5ckzd6rfttfzf28rcy9q06jexz")
    async constructor() {}

    // Private receipt record owned by the merchant; decryptable via view key for selective disclosure.
    record Payment {
        owner: address,
        amount: u64,
        payer: address,
    }

    // Invoice metadata stored by commitment hash only; merchant and amount are never plaintext on-chain.
    struct InvoiceData {
        expiry_height: u32,
        status: u8,       // 0 = Open, 1 = Settled
        invoice_type: u8, // 0 = Standard (single payment), 1 = Multi-pay (campaign)
    }

    mapping invoices: field => InvoiceData;
    mapping salt_to_invoice: field => field;
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
        return (invoice_hash, finalize_create_invoice(invoice_hash, expiry_hours, salt, invoice_type));
    }

    async function finalize_create_invoice(
        invoice_hash: field,
        expiry_hours: u32,
        salt: field,
        invoice_type: u8
    ) {
        let blocks_to_add: u32 = expiry_hours * 360u32;
        let expiry_height: u32 =
            expiry_hours != 0u32 ? block.height + blocks_to_add : 0u32;
        let invoice_data: InvoiceData = InvoiceData {
            expiry_height: expiry_height,
            status: 0u8,
            invoice_type: invoice_type,
        };
        invoices.set(invoice_hash, invoice_data);
        salt_to_invoice.set(salt, invoice_hash);
    }

    // Settles an invoice: verifies commitment, executes private transfer, issues Payment record, and records receipt key.
    async transition pay_invoice(
        pay_record: credits.aleo/credits,
        merchant: address,
        amount: u64,
        salt: field,
        private payment_secret: field,
        public message: field
    ) -> (Payment, credits.aleo/credits, credits.aleo/credits, Future) {
        let (merchant_credits, change_credits): (credits.aleo/credits, credits.aleo/credits) =
            credits.aleo/transfer_private(pay_record, merchant, amount);

        let payment: Payment = Payment {
            owner: merchant,
            amount: amount,
            payer: self.caller,
        };

        let merchant_field: field = merchant as field;
        let amount_field: field = amount as field;
        let merchant_hash: field = BHP256::hash_to_field(merchant_field);
        let amount_hash: field = BHP256::hash_to_field(amount_field);
        let salt_hash: field = BHP256::hash_to_field(salt);
        let invoice_hash: field = merchant_hash + amount_hash + salt_hash;

        let salt_scalar: scalar = BHP256::hash_to_scalar(salt);
        let receipt_key: field = BHP256::commit_to_field(payment_secret, salt_scalar);

        let f0: Future = finalize_pay_invoice(invoice_hash, salt, receipt_key, amount);
        return (payment, merchant_credits, change_credits, f0);
    }

    async function finalize_pay_invoice(
        computed_hash: field,
        salt: field,
        receipt_key: field,
        amount: u64
    ) {
        let stored_hash: field = salt_to_invoice.get(salt);
        assert_eq(computed_hash, stored_hash);

        let invoice_data: InvoiceData = invoices.get(stored_hash);

        if invoice_data.expiry_height != 0u32 {
            assert(block.height <= invoice_data.expiry_height);
        }

        if (invoice_data.invoice_type == 0u8) {
            assert_eq(invoice_data.status, 0u8);
            let updated_data: InvoiceData = InvoiceData {
                expiry_height: invoice_data.expiry_height,
                status: 1u8,
                invoice_type: invoice_data.invoice_type,
            };
            invoices.set(stored_hash, updated_data);
        }

        let exists: bool = payment_receipts.contains(receipt_key);
        assert(!exists);
        payment_receipts.set(receipt_key, amount);
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
        return finalize_settle_invoice(calculated_hash, salt);
    }

    async function finalize_settle_invoice(calculated_hash: field, salt: field) {
        let stored_hash: field = salt_to_invoice.get(salt);
        assert_eq(calculated_hash, stored_hash);
        let invoice_data: InvoiceData = invoices.get(stored_hash);
        let updated_data: InvoiceData = InvoiceData {
            expiry_height: invoice_data.expiry_height,
            status: 1u8,
            invoice_type: invoice_data.invoice_type,
        };
        invoices.set(stored_hash, updated_data);
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
    ) -> (Payment, credits.aleo/credits, credits.aleo/credits) {
        let (merchant_credits, change_credits): (credits.aleo/credits, credits.aleo/credits) =
            credits.aleo/transfer_private(sender_record, merchant, amount);

        let payment: Payment = Payment {
            owner: merchant,
            amount: amount,
            payer: self.caller,
        };

        return (payment, merchant_credits, change_credits);
    }
}
