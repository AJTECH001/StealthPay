import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { WalletProvider } from "./providers/WalletContext";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <WalletProvider>
      <App />
    </WalletProvider>
  </React.StrictMode>,
);
