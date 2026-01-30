import { useState } from "react";
import { useWalletAddress } from "../../providers/WalletContext";

// Aleo address format: aleo1... (base58, typically 63 chars)
const ALEO_ADDRESS_REGEX = /^aleo1[a-z0-9]{58}$/;

interface ConnectWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ConnectWalletModal({ isOpen, onClose }: ConnectWalletModalProps) {
  const { connect } = useWalletAddress();
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const trimmed = address.trim();
    if (!trimmed) {
      setError("Please enter your Aleo wallet address");
      return;
    }
    if (!ALEO_ADDRESS_REGEX.test(trimmed)) {
      setError("Please enter a valid Aleo address (aleo1...)");
      return;
    }
    connect(trimmed);
    setAddress("");
    onClose();
  };

  return (
    <div
      className="connect-wallet-overlay"
      onClick={onClose}
      role="presentation"
      aria-hidden={!isOpen}
    >
      <div
        className="connect-wallet-modal connect-wallet-modal-faucet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="connect-wallet-title"
      >
        <div className="connect-wallet-header">
          <h2 id="connect-wallet-title">Connect Wallet</h2>
          <button
            type="button"
            className="connect-wallet-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <p className="connect-wallet-subtitle">
          Enter your Aleo wallet address below. You can copy it from Leo Wallet, Fox Wallet, Puzzle, or Soter.
        </p>
        <div className="connect-wallet-notice">
          Leo Wallet users: switch to <strong>Aleo Testnet</strong> in Settings → Network.
        </div>
        <form onSubmit={handleSubmit} className="connect-wallet-form">
          <input
            type="text"
            placeholder="Enter your Aleo wallet address"
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              setError("");
            }}
            className="connect-wallet-input"
            autoComplete="off"
            autoFocus
          />
          {error && <p className="connect-wallet-error">{error}</p>}
          <button type="submit" className="connect-wallet-submit">
            Connect
          </button>
        </form>
        <p className="connect-wallet-footer">
          New to Aleo?{" "}
          <a href="https://www.leo.app" target="_blank" rel="noopener noreferrer">
            Get Leo Wallet
          </a>
        </p>
      </div>
    </div>
  );
}
