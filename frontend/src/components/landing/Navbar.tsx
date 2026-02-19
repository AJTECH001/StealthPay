import aleoLogo from "../../assets/aleo.svg";
import { WalletMultiButton } from "@provablehq/aleo-wallet-adaptor-react-ui";

export function Navbar() {
  return (
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
        <div className="landing-nav-wallet-btn stealthpay-wallet-adapter-wrapper">
          <WalletMultiButton className="stealthpay-wallet-multi-button" />
        </div>
      </div>
    </nav>
  );
}
