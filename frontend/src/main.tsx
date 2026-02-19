import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AleoWalletProvider } from "./providers/AleoWalletProvider";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AleoWalletProvider>
      <App />
    </AleoWalletProvider>
  </React.StrictMode>,
);
