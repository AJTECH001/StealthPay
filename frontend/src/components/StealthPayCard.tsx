import { useMemo, useState } from "react";
import { getAleoWorker } from "../workers/aleoWorkerClient";

const MICROCREDITS_PER_CREDIT = 1_000_000;

export function StealthPayCard() {
  const aleoWorker = useMemo(() => getAleoWorker(), []);

  const [apiUrl, setApiUrl] = useState("https://api.explorer.provable.com/v1");

  // Demo-only inputs (do not handle keys like this in production).
  const [payerKey, setPayerKey] = useState("");
  const [merchantKey, setMerchantKey] = useState("");
  const [merchantAddress, setMerchantAddress] = useState("");
  const [payerAddress, setPayerAddress] = useState("");
  const [invoiceField, setInvoiceField] = useState("1field");
  const [amountCredits, setAmountCredits] = useState(1);

  const [paymentTxId, setPaymentTxId] = useState<string | null>(null);
  const [receiptTxId, setReceiptTxId] = useState<string | null>(null);

  async function sendPrivatePayment() {
    setPaymentTxId(null);
    try {
      const txId = await aleoWorker.payPrivate({
        apiUrl,
        payerPrivateKey: payerKey,
        recipientAddress: merchantAddress,
        amountCredits: Number(amountCredits),
        priorityFee: 0.0,
        privateFee: true,
      });
      setPaymentTxId(txId);
      alert(`Payment broadcast. Transaction ID: ${txId}`);
    } catch (e) {
      console.error(e);
      alert("Payment failed. Check console for details.");
    }
  }

  async function issueOnChainReceipt() {
    setReceiptTxId(null);
    try {
      const amountMicrocredits = Number(amountCredits) * MICROCREDITS_PER_CREDIT;
      const txId = await aleoWorker.issueReceipt({
        apiUrl,
        merchantPrivateKey: merchantKey,
        payerAddress,
        invoiceIdField: invoiceField,
        amountMicrocredits,
        priorityFee: 0.0,
        privateFee: true,
      });
      setReceiptTxId(txId);
      alert(`Receipt issued. Transaction ID: ${txId}`);
    } catch (e) {
      console.error(e);
      alert("Receipt issuance failed. Check console for details.");
    }
  }

  return (
    <div className="card">
      <h2>StealthPay (MVP demo)</h2>
      <p style={{ textAlign: "left" }}>
        Flow:
        <br />
        1) Payer sends a private payment via <code>credits.aleo</code>
        <br />
        2) Merchant issues a receipt via{" "}
        <code>stealthpay_receipts.aleo/issue_receipt</code>
      </p>

      <p style={{ textAlign: "left" }}>
        <label>
          API URL
          <br />
          <input
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            style={{ width: "100%" }}
          />
        </label>
      </p>

      <h3>1) Private payment</h3>

      <p style={{ textAlign: "left" }}>
        <label>
          Payer private key (demo only)
          <br />
          <input
            value={payerKey}
            onChange={(e) => setPayerKey(e.target.value)}
            style={{ width: "100%" }}
          />
        </label>
      </p>

      <p style={{ textAlign: "left" }}>
        <label>
          Merchant address (recipient)
          <br />
          <input
            value={merchantAddress}
            onChange={(e) => setMerchantAddress(e.target.value)}
            style={{ width: "100%" }}
          />
        </label>
      </p>

      <p style={{ textAlign: "left" }}>
        <label>
          Amount (credits, integer)
          <br />
          <input
            type="number"
            min={1}
            value={amountCredits}
            onChange={(e) => setAmountCredits(Number(e.target.value))}
            style={{ width: "100%" }}
          />
        </label>
      </p>

      <p>
        <button
          onClick={sendPrivatePayment}
          disabled={!payerKey || !merchantAddress || !amountCredits}
        >
          Send private payment
        </button>
      </p>

      {paymentTxId ? (
        <p style={{ textAlign: "left" }}>
          Payment tx: <code>{paymentTxId}</code>
        </p>
      ) : null}

      <hr />

      <h3>2) Issue receipt</h3>

      <p style={{ textAlign: "left" }}>
        <label>
          Merchant private key (demo only)
          <br />
          <input
            value={merchantKey}
            onChange={(e) => setMerchantKey(e.target.value)}
            style={{ width: "100%" }}
          />
        </label>
      </p>

      <p style={{ textAlign: "left" }}>
        <label>
          Payer address (receipt owner)
          <br />
          <input
            value={payerAddress}
            onChange={(e) => setPayerAddress(e.target.value)}
            style={{ width: "100%" }}
          />
        </label>
      </p>

      <p style={{ textAlign: "left" }}>
        <label>
          Invoice ID (field, e.g. <code>1field</code>)
          <br />
          <input
            value={invoiceField}
            onChange={(e) => setInvoiceField(e.target.value)}
            style={{ width: "100%" }}
          />
        </label>
      </p>

      <p>
        <button
          onClick={issueOnChainReceipt}
          disabled={!merchantKey || !payerAddress || !invoiceField || !amountCredits}
        >
          Issue on-chain receipt
        </button>
      </p>

      {receiptTxId ? (
        <p style={{ textAlign: "left" }}>
          Receipt tx: <code>{receiptTxId}</code>
        </p>
      ) : null}
    </div>
  );
}

