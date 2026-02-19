import { Link, useLocation } from "react-router-dom";
import { WalletMultiButton } from "@provablehq/aleo-wallet-adaptor-react-ui";
import { useWallet } from "@provablehq/aleo-wallet-adaptor-react";
import { cn } from "../../utils/cn";

const landingNavItems = [
  { path: "/docs", label: "Docs" },
  { path: "/privacy", label: "Privacy" },
  { path: "/verify", label: "Verify" },
];

const appNavItems = [
  { path: "/explorer", label: "Explorer" },
  { path: "/create", label: "Create Invoice" },
  { path: "/profile", label: "Profile" },
  { path: "/docs", label: "Docs" },
  { path: "/privacy", label: "Privacy" },
  { path: "/verify", label: "Verify" },
];



export default function Navbar() {
  const location = useLocation();
  const { address, connecting } = useWallet();
  const isLanding = location.pathname === "/";
  const navItems = isLanding ? landingNavItems : appNavItems;
  const isActive = (path: string) => location.pathname === path;
  const isProduction = typeof window !== "undefined" && !window.location.hostname.includes("localhost");

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-24 flex items-center justify-center px-6 pointer-events-none">
      <div className="w-full max-w-7xl flex items-center justify-between pointer-events-auto">
        <Link to="/" className="group flex items-center gap-3 no-underline">
          <div className="flex flex-col">
            <span className="text-xl font-bold text-foreground tracking-tight group-hover:text-neon-primary transition-colors duration-300">
              StealthPay
            </span>
           
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <div className="bg-white/90 backdrop-blur-xl border border-glass-border rounded-full p-1 flex items-center gap-1 shadow-glass">
            {navItems.map((item) => {
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "relative px-5 py-2.5 rounded-full text-sm font-medium transition-colors duration-300",
                    active
                      ? "text-neon-primary"
                      : "text-gray-500 hover:text-foreground"
                  )}
                >
                  {active && (
                    <span className="absolute inset-0 rounded-full bg-neon-primary/10 border border-neon-primary/20 shadow-[0_0_15px_rgba(0,0,0,0.08)]" />
                  )}
                  <span className="relative z-10">{item.label}</span>
                </Link>
              );
            })}
          </div>
          {isLanding && (
            <Link
              to="/explorer"
              className="inline-flex items-center px-5 py-2.5 rounded-full text-sm font-semibold bg-foreground text-white border border-foreground/20 shadow-glass hover:opacity-90"
            >
              Launch App
            </Link>
          )}
          <div className="wallet-adapter-wrapper flex flex-col items-end">
            <WalletMultiButton className="!bg-foreground !border !border-foreground/20 !rounded-full !py-3 !px-6 !h-auto !font-sans !font-semibold !text-sm !text-white hover:!opacity-90 transition-all shadow-glass hover:!shadow-glass-hover" />
            {isProduction && !address && !connecting && (
              <p className="text-[10px] text-gray-500 mt-1 max-w-[180px] text-right">
                Use Leo Wallet on <strong>Aleo Testnet</strong>; unlock then connect.
              </p>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
