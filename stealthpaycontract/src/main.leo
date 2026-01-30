import credits.aleo;

program stealthpay.aleo {
    // Required for deployment on live networks.
    // Upgradability policy: admin-controlled upgrades.
    // NOTE: Replace the address below if you want a different upgrade admin.
    @admin(address="aleo1eedp9ws4jattrw93nvnlnl7y6uvf0pns5ckzd6rfttfzf28rcy9q06jexz")
    async constructor() {}

    // Record representing a private payment to a merchant
    record Payment {
        owner: address,
        amount: u64,
        payer: address, // selectively revealable payer address
    }

    // Transition to make a private payment
    transition make_payment(
        sender_record: credits.aleo/credits,
        amount: u64,
        merchant: address
    ) -> (Payment, credits.aleo/credits, credits.aleo/credits) {
        // Move Aleo credits privately via the native credits.aleo program.
        let (merchant_credits, change_credits): (credits.aleo/credits, credits.aleo/credits) =
            credits.aleo/transfer_private(sender_record, merchant, amount);

        // Create app-level payment record (business receipt) owned by the merchant.
        let payment: Payment = Payment {
            owner: merchant,
            amount: amount,
            payer: self.caller,
        };

        return (payment, merchant_credits, change_credits);
    }
}

