import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Landing from "./pages/Landing";
import Explorer from "./pages/Explorer";
import CreateInvoice from "./pages/CreateInvoice";
import PaymentPage from "./pages/PaymentPage";
import Profile from "./pages/Profile";
import Docs from "./pages/Docs";
import Privacy from "./pages/Privacy";
import Verification from "./pages/Verification";

function DesktopRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/explorer" element={<Explorer />} />
      <Route path="/create" element={<CreateInvoice />} />
      <Route path="/pay" element={<PaymentPage />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/docs" element={<Docs />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/verify" element={<Verification />} />
    </Routes>
  );
}

export default function DesktopApp() {
  return (
    <div className="min-h-screen bg-black relative overflow-hidden text-white selection:bg-white/20">
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Extremely subtle premium glows */}
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-white/[0.03] rounded-full blur-[160px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-white/[0.02] rounded-full blur-[140px]" />
      </div>

      <Navbar />

      <main className="relative z-10 pt-32 px-6 pb-20 container-custom">
        <DesktopRoutes />
      </main>
      
      {/* Texture Overlay handled in index.css body::after */}
    </div>
  );
}

