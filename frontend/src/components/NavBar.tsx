import { Link, useLocation } from "react-router-dom";
import { WalletMultiButton } from "@provablehq/aleo-wallet-adaptor-react-ui";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/employer", label: "Employer" },
  { href: "/employee", label: "Employee" },
  { href: "/analytics", label: "Analytics" },
];

export default function NavBar() {
  const location = useLocation();

  return (
    <header className="border-b border-white/10 bg-black/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
            <span className="text-black text-xs font-bold">A</span>
          </div>
          <span className="font-bold text-white hidden sm:block font-serif">
            Stealth<span className="text-white/60">Pay</span>
          </span>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-1">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              to={href}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                location.pathname.startsWith(href)
                  ? "bg-white text-black"
                  : "text-muted-foreground hover:text-white hover:bg-white/10"
              )}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Wallet */}
        <WalletMultiButton />
      </div>
    </header>
  );
}
