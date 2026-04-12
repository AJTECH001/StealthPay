import { Link } from "react-router-dom";

export default function FooterSection() {
  return (
    <footer className="border-t border-white/10 py-10 px-4 bg-black/40">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center">
            <span className="text-black text-xs font-bold">A</span>
          </div>
          <span className="font-bold text-white font-serif">
            Stealth<span className="text-white/40">Pay</span>
          </span>
          <span className="text-white/20 text-xs ml-2">· stealthpay_payroll_v3.aleo</span>
        </div>

        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <Link to="/employer" className="hover:text-white transition-colors">Employer</Link>
          <Link to="/employee" className="hover:text-white transition-colors">Employee</Link>
          <Link to="/analytics" className="hover:text-white transition-colors">Analytics</Link>
          <a
            href="https://testnet.explorer.provable.com/program/stealthpay_payroll_v3.aleo"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors"
          >
            Explorer
          </a>
        </div>

        <p className="text-xs text-white/20">
          MIT License · Built on{" "}
          <a
            href="https://aleo.org"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white/40 transition-colors"
          >
            Aleo
          </a>
        </p>
      </div>
    </footer>
  );
}
