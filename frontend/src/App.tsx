import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { AleoWalletProvider } from "./providers/AleoWalletProvider";
import NavBar from "@/components/NavBar";
import HomePage from "@/pages/HomePage";
import EmployerPage from "@/pages/EmployerPage";
import EmployeePage from "@/pages/EmployeePage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import "./index.css";

function App() {
  return (
    <Router>
      <AleoWalletProvider>
        <div className="min-h-screen">
          <NavBar />
          <main className="min-h-[calc(100vh-4rem)]">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/employer" element={<EmployerPage />} />
              <Route path="/employee" element={<EmployeePage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
            </Routes>
          </main>
        </div>
        <Toaster richColors position="top-right" />
      </AleoWalletProvider>
    </Router>
  );
}

export default App;
