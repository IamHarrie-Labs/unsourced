interface Props {
  onEnterApp: () => void;
  onOpenDocs: () => void;
}

export function Landing({ onEnterApp, onOpenDocs }: Props) {
  return (
    <div className="landing">
      <div className="landing-nav">
        <div className="landing-logo">Unsourced</div>
        <div className="landing-nav-links">
          <a href="#how">How it works</a>
          <a href="#docs" onClick={onOpenDocs}>
            Docs
          </a>
          <button className="btn btn-solid" onClick={onEnterApp}>
            Connect wallet
          </button>
        </div>
      </div>

      <div className="landing-hero">
        <div className="landing-hero-title">
          <span>UN</span>
          <span className="outline">SOURCED</span>
        </div>
        <div className="landing-hero-grid">
          <div className="landing-hero-lede">
            Ask your group a question. Everyone answers once. Nobody, not even you, can tell who said what.
          </div>
          <div className="landing-hero-actions">
            <div className="landing-hero-sub">
              A survey where every response is provably from an eligible member, and nobody, including whoever ran
              it, can tell which one.
            </div>
            <div className="landing-hero-buttons">
              <button className="btn btn-solid btn-display" onClick={onEnterApp}>
                Create a survey
              </button>
              <button className="btn btn-outline btn-display" onClick={onOpenDocs}>
                Read the docs
              </button>
            </div>
            <div className="landing-hero-tag">Midnight network · Preview · Lace wallet</div>
          </div>
        </div>
      </div>

      <div className="landing-strip">
        <span>Up to 8 people per survey</span>
        <span>One answer each</span>
        <span>Results hidden until your threshold</span>
        <span>No accounts, no emails</span>
      </div>

      <div id="how" className="section">
        <div className="section-title">How it works</div>
        <div className="how-grid">
          <div className="how-cell">
            <div className="how-number">01</div>
            <div className="how-heading">Write the question</div>
            <div className="how-body">
              Three answer options, up to eight people, and how many answers you want in before results unlock.
            </div>
          </div>
          <div className="how-cell">
            <div className="how-number">02</div>
            <div className="how-heading">Hand out the keys</div>
            <div className="how-body">
              You get one single-use key per person. Only the hash of each key goes on-chain, never the key itself.
            </div>
          </div>
          <div className="how-cell">
            <div className="how-number">03</div>
            <div className="how-heading">They answer once</div>
            <div className="how-body">
              Their device proves the key is on your list without saying which one it is. The tally goes up by one.
              Nothing else is written.
            </div>
          </div>
        </div>
      </div>

      <div className="ledger-section">
        <div className="ledger-section-inner">
          <div className="section-title">What the ledger sees</div>
          <div className="ledger-grid">
            <div>
              <div className="ledger-col-title">Public</div>
              <div>
                <div className="ledger-item">The eight key hashes, written once when the survey is made.</div>
                <div className="ledger-item">How many people have answered, and the three totals.</div>
                <div className="ledger-item">That someone on the list answered, and which total went up.</div>
              </div>
            </div>
            <div>
              <div className="ledger-col-title">Never leaves the device</div>
              <div>
                <div className="ledger-item">Anyone's key. It is read only inside a proof made on their own machine.</div>
                <div className="ledger-item">Which of the eight people sent any given answer.</div>
                <div className="ledger-item">
                  Any link between a person and the answer they picked. The two are never stored together.
                </div>
              </div>
            </div>
          </div>
          <div className="ledger-note">
            The threshold is a display choice, not a cryptographic seal. Tallies live on a public ledger, so someone
            querying it directly could read them early. The point is that a handful of early answers can't be
            pinned on individuals by process of elimination.
          </div>
        </div>
      </div>

      <div className="landing-cta">
        <div className="landing-cta-title">Ask the thing nobody will say out loud</div>
        <button className="btn btn-solid btn-display" onClick={onEnterApp}>
          Connect wallet
        </button>
      </div>

      <div className="landing-footer">
        <span>Unsourced</span>
        <div className="landing-footer-links">
          <a href="#docs" onClick={onOpenDocs}>
            Docs
          </a>
          <a href="#docs" onClick={onOpenDocs}>
            Privacy model
          </a>
          <span style={{ opacity: 0.6 }}>Preview network</span>
        </div>
      </div>
    </div>
  );
}
