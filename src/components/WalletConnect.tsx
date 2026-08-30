import type { Wallet } from "../hooks/useSurvey";

function shorten(address: string): string {
  return address.length > 20 ? `${address.slice(0, 10)}…${address.slice(-4)}` : address;
}

export function WalletConnect({ status, address, error, connect, disconnect }: Wallet) {
  if (status === "connected" && address) {
    return (
      <button className="wallet-pill" onClick={disconnect} title="Disconnect">
        <span className="wallet-dot" />
        <span>{shorten(address)}</span>
      </button>
    );
  }

  return (
    <div>
      <button className="btn btn-solid" onClick={connect} disabled={status === "connecting"}>
        {status === "connecting" ? "Connecting…" : "Connect wallet"}
      </button>
      {status === "error" && error && (
        <p className="wallet-connect-error">
          {error.includes("No Midnight wallet found")
            ? "Couldn't find a wallet. Install the Lace extension and unlock it, then try again."
            : error}
        </p>
      )}
    </div>
  );
}
