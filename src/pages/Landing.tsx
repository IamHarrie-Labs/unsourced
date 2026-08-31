import { useEffect, useState } from "react";

interface Props {
  onEnterApp: () => void;
  onOpenDocs: () => void;
}

export function Landing({ onEnterApp, onOpenDocs }: Props) {
  const [navVisible, setNavVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setNavVisible(window.scrollY > 40);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="landing">
      <div className={navVisible ? "landing-nav landing-nav--visible" : "landing-nav"}>
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
          <div className="landing-hero-lede">Ask your group something. Everyone gets one answer, and even you can't tell who said what.</div>
          <div className="landing-hero-actions">
            <div className="landing-hero-sub">
              Every answer here comes from someone on your list, but nobody, not even whoever's running the
              survey, can tell whose it was.
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
        <div className="landing-strip-track">
          <StripItems />
          <StripItems hidden />
        </div>
      </div>

      <div id="how" className="section">
        <div className="section-title">How it works</div>
        <div className="how-grid">
          <div className="how-cell">
            <div className="how-number">01</div>
            <div className="how-heading">Write the question</div>
            <div className="how-body">
              Pick three options, decide how many people you're asking, and set how many answers you want in
              before results show up.
            </div>
          </div>
          <div className="how-cell">
            <div className="how-number">02</div>
            <div className="how-heading">Hand out the keys</div>
            <div className="how-body">Each person gets one key that only works once. The chain only ever sees a hash of it, never the key.</div>
          </div>
          <div className="how-cell">
            <div className="how-number">03</div>
            <div className="how-heading">They answer once</div>
            <div className="how-body">Their device proves the key is on your list, not which one it is. One tally goes up. That's all that gets written.</div>
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
                <div className="ledger-item">How many people have answered, and the tally for each question.</div>
                <div className="ledger-item">That someone on the list answered, and which tally went up.</div>
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
            The threshold just controls what the app shows you. Tallies sit on the public ledger the whole time,
            so anyone reading it directly could see them early. It's there so a few early answers can't be traced
            back to specific people just by elimination.
          </div>
        </div>
      </div>

      <div className="landing-cta">
        <div className="landing-cta-title">Ask the thing nobody says out loud</div>
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

function StripItems({ hidden }: { hidden?: boolean }) {
  return (
    <div className="landing-strip-set" aria-hidden={hidden || undefined}>
      <span>Up to 8 people per survey</span>
      <span>One answer each</span>
      <span>Results hidden until your threshold</span>
      <span>No accounts, no emails</span>
    </div>
  );
}
