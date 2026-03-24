// Simple pass-through on Aleo — network enforcement will be added once
// the Aleo testnet program is deployed.
export default function NetworkGuard({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
