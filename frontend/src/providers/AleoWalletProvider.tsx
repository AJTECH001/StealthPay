import React, { useMemo } from "react";
import { AleoWalletProvider as ProvableWalletProvider } from "@provablehq/aleo-wallet-adaptor-react";
import { WalletModalProvider } from "@provablehq/aleo-wallet-adaptor-react-ui";
import { ShieldWalletAdapter } from "@provablehq/aleo-wallet-adaptor-shield";
import { DecryptPermission } from "@provablehq/aleo-wallet-adaptor-core";
import { Network } from "@provablehq/aleo-types";
import "@provablehq/aleo-wallet-adaptor-react-ui/dist/styles.css";

interface AleoWalletProviderProps {
  children: React.ReactNode;
}

const PROGRAMS = ["credits.aleo", "stealthpay_payroll_v3.aleo", "test_usdcx_stablecoin.aleo"];

function createPatchedShieldAdapter(appName: string): ShieldWalletAdapter {
  const adapter = new ShieldWalletAdapter({
    appName,
    programs: PROGRAMS
  });

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
      : 50000;
    const cleanOptions = {
      ...options,
      fee: feeMicrocredits,
      feePrivate: false,
      privateFee: false,
    };
    return await originalExecute(cleanOptions);
  };

  (adapter as any).executeDeployment = async function (deployment: any) {
    return await originalDeploy(deployment);
  };

  return adapter;
}

export function AleoWalletProvider({ children }: AleoWalletProviderProps) {
  const wallets = useMemo(
    () => [createPatchedShieldAdapter("StealthPay")],
    []
  );

  return (
    <ProvableWalletProvider
      wallets={wallets}
      decryptPermission={DecryptPermission.AutoDecrypt}
      network={Network.TESTNET}
      autoConnect
      programs={PROGRAMS}
    >
      <WalletModalProvider>{children}</WalletModalProvider>
    </ProvableWalletProvider>
  );
}
