import credits.aleo;
program stealthpay.aleo;

record Payment:
    owner as address.private;
    amount as u64.private;
    payer as address.private;

function make_payment:
    input r0 as credits.aleo/credits.record;
    input r1 as u64.private;
    input r2 as address.private;
    call credits.aleo/transfer_private r0 r2 r1 into r3 r4;
    cast r2 r1 self.caller into r5 as Payment.record;
    output r5 as Payment.record;
    output r3 as credits.aleo/credits.record;
    output r4 as credits.aleo/credits.record;

constructor:
    assert.eq program_owner aleo1eedp9ws4jattrw93nvnlnl7y6uvf0pns5ckzd6rfttfzf28rcy9q06jexz;
