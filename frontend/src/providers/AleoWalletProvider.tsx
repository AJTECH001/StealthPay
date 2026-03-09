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

function createPatchedShieldAdapter(appName: string): ShieldWalletAdapter {
  const adapter = new ShieldWalletAdapter({ appName });

  // The Shield extension validates `network` strictly against its enum values.
  // Network.TESTNET = "testnet" is correct — the extension maps this internally.
  // Do NOT override to "testnetbeta" — that causes "Invalid transaction payload".

  const originalExecute = adapter.executeTransaction.bind(adapter);
  const originalDeploy = adapter.executeDeployment.bind(adapter);

  (adapter as any).executeTransaction = async function (options: any) {
    // Pass only fields defined in ShieldTransaction (extends TransactionOptions + network)
    // Extra fields like `address`, `publicKey`, `chainId` confuse the extension validator.
    // Shield extension Zod schema: { program, function, inputs, fee (positive int microcredits), network, privateFee? }
    // Hook passes fee in credits (0.001) — extension requires positive integer microcredits (1000).
    const feeMicrocredits = options.fee
      ? Math.max(1, Math.round(options.fee * 1_000_000))
      : 1000;
    const cleanOptions = {
      program: options.program,
      function: options.function,
      inputs: options.inputs,
      fee: feeMicrocredits,
      ...(options.privateFee !== undefined && { privateFee: options.privateFee }),
      ...(options.recordIndices !== undefined && { recordIndices: options.recordIndices }),
    };
    return await originalExecute(cleanOptions);
  };

  (adapter as any).executeDeployment = async function (deployment: any) {
    return await originalDeploy(deployment);
  };

  return adapter;
}

function createPatchedLeoAdapter(appName: string): LeoWalletAdapter {
  const adapter = new LeoWalletAdapter({ 
    appName,
    programIdPermissions: {
      "testnetbeta": ["credits.aleo", "stealthpay.aleo"]
    }
  });
  const originalConnect = adapter.connect.bind(adapter);

  (adapter as any).connect = async function (
    ...args: Parameters<typeof originalConnect>
  ) {
   
    const leoWin = (window as any).leoWallet ?? (window as any).leo;
    if (leoWin && typeof leoWin.connect === "function") {
      (adapter as any)._leoWallet = leoWin;
    }

    try {
      return await originalConnect(...args);
    } catch (err: any) {
      if (err?.message === "No address returned from wallet") {
       
        for (let i = 0; i < 20; i++) {
          await new Promise((r) => setTimeout(r, 300));
          const freshWallet = (window as any).leoWallet ?? (window as any).leo;
          const publicKey =
            freshWallet?.publicKey ?? freshWallet?.account?.address;
          if (publicKey) {
            (adapter as any)._publicKey = publicKey;
            (adapter as any)._leoWallet = freshWallet;
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
      createPatchedShieldAdapter("StealthPay"),
      createPatchedLeoAdapter("StealthPay"),
    ],
    []
  );

  return (
    <ProvableWalletProvider
      wallets={wallets}
      decryptPermission={DecryptPermission.OnChainHistory}
      network={Network.TESTNET}
      autoConnect
      programs={["credits.aleo", "stealthpay.aleo"]}
    >
      <WalletModalProvider>{children}</WalletModalProvider>
    </ProvableWalletProvider>
  );
}
