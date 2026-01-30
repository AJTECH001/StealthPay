import { useWalletAddress } from "../../providers/WalletContext";

export function WalletInteraction() {
  const { address } = useWalletAddress();

  if (!address) {
    return null;
  }

  return (
    <div
      className="wallet-interaction-card"
      style={{
        marginTop: "2rem",
        padding: "1.5rem",
        background: "var(--color-white)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--color-gray-200)",
        maxWidth: "480px",
      }}
    >
      <h3 style={{ marginTop: 0, fontSize: "1.125rem", fontWeight: 600 }}>
        Wallet Connected
      </h3>
      <p
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "0.875rem",
          wordBreak: "break-all",
          background: "var(--color-gray-50)",
          padding: "0.5rem",
          borderRadius: "var(--radius-sm)",
        }}
      >
        {address}
      </p>
    </div>
  );
}
