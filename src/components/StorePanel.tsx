import { COIN_PACKS, type CoinPackKey } from "../api/payments";

interface StorePanelProps {
  signedIn: boolean;
  paymentStatus: string;
  paymentMessage: string;
  onBuyPack: (packKey: CoinPackKey) => void;
}

export function StorePanel({ signedIn, paymentStatus, paymentMessage, onBuyPack }: StorePanelProps) {
  return (
    <section className="panel" aria-labelledby="store-title">
      <div className="panel-header">
        <div>
          <h2 id="store-title" className="panel-title">Coin packs</h2>
          <p className="panel-note">Add coins for booster refills and longer runs.</p>
        </div>
        <span className="chip chip-amber">Store</span>
      </div>
      <ul className="reward-list">
        {COIN_PACKS.map((pack) => (
          <li className="reward-item store-item" key={pack.key}>
            <span className="chip chip-amber">{pack.coins.toLocaleString()}</span>
            <span>
              <strong>{pack.name}</strong>
              <br />
              <span className="subtle">{pack.description} {pack.bonus}</span>
            </span>
            <button
              className="button button-secondary store-button"
              type="button"
              onClick={() => onBuyPack(pack.key)}
              disabled={!signedIn || paymentStatus === "redirecting" || paymentStatus === "settling"}
            >
              ${(pack.amountCents / 100).toFixed(2)}
            </button>
          </li>
        ))}
      </ul>
      {!signedIn ? <p className="empty-state">Sign in to buy coin packs.</p> : null}
      {paymentMessage ? (
        <p className={paymentStatus === "complete" ? "success-state" : paymentStatus === "error" ? "error-state" : "empty-state"}>
          {paymentMessage}
        </p>
      ) : null}
    </section>
  );
}
