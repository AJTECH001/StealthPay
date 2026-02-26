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


function createPatchedLeoAdapter(appName: string): LeoWalletAdapter {
  const adapter = new LeoWalletAdapter({ appName });
  const originalConnect = adapter.connect.bind(adapter);

  (adapter as any).connect = async function (
    ...args: Parameters<typeof originalConnect>
  ) {
    try {
      return await originalConnect(...args);
    } catch (err: any) {
      if (err?.message === "No address returned from wallet") {
        // Poll for publicKey for up to 1 second (5 × 200 ms)
        const leoWallet = (adapter as any)._leoWallet;
        for (let i = 0; i < 5; i++) {
          await new Promise((r) => setTimeout(r, 200));
          const publicKey = leoWallet?.publicKey;
          if (publicKey) {
            (adapter as any)._publicKey = publicKey;
            (adapter as any).network = args[0];
            const account = { address: publicKey };
            (adapter as any).account = account;
            adapter.emit("connect", account);
            return account;
          }
        }
      }
      throw err;
    }
  };

  return adapter;
}

export function AleoWalletProvider({ children }: AleoWalletProviderProps) {
  const wallets = useMemo(
    () => [
      createPatchedLeoAdapter("StealthPay"),
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
