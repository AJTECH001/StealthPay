import { useState } from "react";
import { useWalletAddress } from "../../providers/WalletContext";
import { ConnectWalletModal } from "./ConnectWalletModal";

export function Footer() {
  const [showWalletModal, setShowWalletModal] = useState(false);
  const { address } = useWalletAddress();

  return (
    <>
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-cta">
            <a href="/" className="landing-nav-logo landing-footer-logo">
              <span className="landing-nav-brand">StealthPay</span>
            </a>
            {!address && (
              <button
                type="button"
                className="landing-btn landing-btn-primary"
                onClick={() => setShowWalletModal(true)}
              >
                Connect Wallet
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
            <p className="landing-footer-copy">© StealthPay 2026 • Built on Aleo</p>
          </div>
          <div className="landing-footer-links">
            <div className="landing-footer-col">
              <h4>Features</h4>
              <a href="#private-payments">Private Payments</a>
              <a href="#selective-disclosure">Selective Disclosure</a>
              <a href="#receipts">Receipt Records</a>
              <a href="#aleo">Aleo Program</a>
            </div>
            <div className="landing-footer-col">
              <h4>Resources</h4>
              <a href="#why">Why StealthPay</a>
              <a href="#docs">Docs</a>
              <a href="#github">GitHub</a>
              <a href="#explorer">Aleo Explorer</a>
            </div>
            <div className="landing-footer-col">
              <h4>Company</h4>
              <a href="#about">About</a>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer">GitHub</a>
              <a href="https://x.com" target="_blank" rel="noopener noreferrer">X / Twitter</a>
              <a href="https://discord.gg" target="_blank" rel="noopener noreferrer">Discord</a>
            </div>
            <div className="landing-footer-col">
              <h4>Support</h4>
              <a href="#docs">Docs</a>
              <a href="mailto:support@stealthpay.aleo">Contact</a>
              <a href="#status">Status</a>
            </div>
          </div>
        </div>
      </footer>
      <ConnectWalletModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
      />
    </>
  );
}
