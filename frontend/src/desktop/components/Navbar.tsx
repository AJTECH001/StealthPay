import { Link, useLocation } from "react-router-dom";
import { WalletMultiButton } from "@provablehq/aleo-wallet-adaptor-react-ui";
import { motion } from "framer-motion";
import { cn } from "../../utils/cn";

const landingNavItems = [
  { path: "/docs", label: "Docs" },
  { path: "/privacy", label: "Privacy" },
  { path: "/verify", label: "Verify" },
];

const appNavItems = [
  { path: "/explorer", label: "Explorer" },
  { path: "/create", label: "Create" },
  { path: "/profile", label: "Profile" },
  { path: "/docs", label: "Docs" },
  { path: "/privacy", label: "Privacy" },
  { path: "/verify", label: "Verify" },
];

export default function Navbar() {
  const location = useLocation();
  const isLanding = location.pathname === "/";
  const navItems = isLanding ? landingNavItems : appNavItems;
  const isActive = (path: string) => location.pathname === path;

  return (
    <motion.nav 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-50 h-24 flex items-center justify-center px-6 pointer-events-none"
    >
      <div className="w-full max-w-7xl flex items-center justify-between pointer-events-auto">
        <Link to="/" className="group flex items-center gap-3 no-underline">
          <div className="flex flex-col">
            <span className="text-xl font-bold text-white tracking-tight group-hover:text-slate-11 transition-colors duration-300">
              StealthPay
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-6">
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-full p-1 flex items-center gap-1 shadow-2xl">
            {navItems.map((item) => {
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "relative px-5 py-2 rounded-full text-xs font-semibold transition-all duration-300 uppercase tracking-wider",
                    active
                      ? "text-white"
                      : "text-slate-11 hover:text-white"
                  )}
                >
                  {active && (
                    <motion.span 
                      layoutId="nav-active"
                      className="absolute inset-0 rounded-full bg-white/10 border border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.05)]" 
                    />
                  )}
                  <span className="relative z-10">{item.label}</span>
                </Link>
              );
            })}
          </div>
          
          <div className="flex items-center gap-3">
            {isLanding && (
              <Link
                to="/explorer"
                className="btn-premium py-2 px-5 text-xs uppercase tracking-widest"
              >
                Launch App
              </Link>
            )}
            <div className="wallet-adapter-wrapper scale-90 origin-right">
              <WalletMultiButton className="!bg-white/[0.05] !backdrop-blur-lg !border !border-white/10 !rounded-full !py-2.5 !px-6 !h-auto !font-sans !font-bold !text-xs !uppercase !tracking-widest !text-white hover:!bg-white/10 hover:!border-white/30 transition-all" />
            </div>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}

