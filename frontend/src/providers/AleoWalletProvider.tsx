import React, { useMemo } from "react";
import { AleoWalletProvider as ProvableWalletProvider } from "@provablehq/aleo-wallet-adaptor-react";
import { WalletModalProvider } from "@provablehq/aleo-wallet-adaptor-react-ui";
import { LeoWalletAdapter } from "@provablehq/aleo-wallet-adaptor-leo";
import { ShieldWalletAdapter } from "@provablehq/aleo-wallet-adaptor-shield";
import { DecryptPermission } from "@provablehq/aleo-wallet-adaptor-core";
import { Network } from "@provablehq/aleo-types";
import "@provablehq/aleo-wallet-adaptor-react-ui/dist/styles.css";

interface AleoWalletProviderProps {
  children: React.ReactNode;
}

export function AleoWalletProvider({ children }: AleoWalletProviderProps) {
  const wallets = useMemo(
    () => [
      new LeoWalletAdapter({ appName: "StealthPay" }),
      new ShieldWalletAdapter({ appName: "StealthPay" }),
    ],
    []
  );

  return (
    <ProvableWalletProvider
      wallets={wallets}
      decryptPermission={DecryptPermission.AutoDecrypt}
      network={Network.TESTNET}
      autoConnect={false}
      programs={["stealthpay.aleo", "credits.aleo"]}
    >
      <WalletModalProvider>{children}</WalletModalProvider>
    </ProvableWalletProvider>
  );
}
