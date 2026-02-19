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
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Static orbs only — animating large blur causes browser jank/freezing */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-black/[0.03] rounded-full blur-[120px]" />
        <div className="absolute top-[20%] right-[-5%] w-[30%] h-[30%] bg-gray-400/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[20%] w-[35%] h-[35%] bg-black/[0.03] rounded-full blur-[120px]" />
      </div>

      <Navbar />

      <main className="relative z-10 pt-24 px-4 pb-12 container-custom">
        <DesktopRoutes />
      </main>
    </div>
  );
}
