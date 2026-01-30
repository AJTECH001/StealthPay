import { useState } from "react";
import aleoLogo from "../../assets/aleo.svg";
import { useWalletAddress } from "../../providers/WalletContext";
import { ConnectWalletModal } from "./ConnectWalletModal";

export function Navbar() {
  const [showWalletModal, setShowWalletModal] = useState(false);
  const { address, disconnect } = useWalletAddress();

  const shortAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : null;

  return (
    <>
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <a href="/" className="landing-nav-logo">
            <img src={aleoLogo} alt="Aleo" className="landing-nav-logo-img" />
            <span className="landing-nav-brand">StealthPay</span>
          </a>
          <ul className="landing-nav-links">
            <li>
              <button className="landing-nav-link">Features</button>
            </li>
            <li>
              <button className="landing-nav-link">Docs</button>
            </li>
            <li>
              <a href="#company" className="landing-nav-link">Company</a>
            </li>
          </ul>
          <div className="landing-nav-wallet-btn">
            {address ? (
              <div className="landing-nav-wallet-connected">
                <span className="landing-nav-wallet-address">{shortAddress}</span>
                <button
                  type="button"
                  className="landing-nav-wallet-disconnect"
                  onClick={disconnect}
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                className="landing-nav-cta"
                onClick={() => setShowWalletModal(true)}
                type="button"
              >
                <span className="landing-nav-cta-icon">🔗</span>
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </nav>
      <ConnectWalletModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
      />
    </>
  );
}
