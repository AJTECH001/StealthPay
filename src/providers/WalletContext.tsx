import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface WalletContextValue {
  address: string | null;
  setAddress: (address: string | null) => void;
  connect: (address: string) => void;
  disconnect: () => void;
  isConnected: boolean;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddressState] = useState<string | null>(() => {
    try {
      return localStorage.getItem("stealthpay-address");
    } catch {
      return null;
    }
  });

  const setAddress = useCallback((addr: string | null) => {
    setAddressState(addr);
    try {
      if (addr) {
        localStorage.setItem("stealthpay-address", addr);
      } else {
        localStorage.removeItem("stealthpay-address");
      }
    } catch {
      // ignore
    }
  }, []);

  const connect = useCallback(
    (addr: string) => {
      const trimmed = addr.trim();
      if (trimmed) setAddress(trimmed);
    },
    [setAddress]
  );

  const disconnect = useCallback(() => setAddress(null), [setAddress]);

  return (
    <WalletContext.Provider
      value={{
        address,
        setAddress,
        connect,
        disconnect,
        isConnected: !!address,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWalletAddress() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWalletAddress must be used within WalletProvider");
  return ctx;
}
