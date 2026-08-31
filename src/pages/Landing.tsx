import { useEffect, useState } from "react";
import type { Wallet } from "../hooks/useSurvey";

interface Props {
  wallet: Wallet;
  onEnterApp: () => void;
  onOpenDocs: () => void;
}

export function Landing({ wallet, onEnterApp, onOpenDocs }: Props) {
  const [navVisible, setNavVisible] = useState(false);
  const connecting = wallet.status === "connecting";
  const connectLabel = connecting ? "Connecting…" : "Connect wallet";

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
          <a href="/docs" onClick={(e) => { e.preventDefault(); onOpenDocs(); }}>
            Docs
          </a>
          <button className="btn btn-solid" onClick={onEnterApp} disabled={connecting}>
            {connectLabel}
          </button>
        </div>
      </div>

      <div className="landing-hero">
        <div className="landing-hero-title">
          <span>UN</span>
          <span className="outline">SOURCED</span>
        </div>
        <div className="landing-hero-grid">
          <div className="landing-hero-lede">Some questions are easier to answer when nobody knows who said what.</div>
          <div className="landing-hero-actions">
            <div className="landing-hero-sub">
              Every answer comes from someone you invited, but once it's sent there's no way to tell who picked
              what. Not you. Not anyone.
            </div>
            <div className="landing-hero-buttons">
              <button className="btn btn-solid btn-display" onClick={onEnterApp} disabled={connecting}>
                {connecting ? "Connecting…" : "Create a survey"}
              </button>
              <button className="btn btn-outline btn-display" onClick={onOpenDocs}>
                Read the docs
              </button>
            </div>
            {wallet.status === "error" && wallet.error && (
              <p className="landing-error">
                {wallet.error.includes("No Midnight wallet found")
                  ? "Couldn't find a wallet. Install the Lace extension and unlock it, then try again."
                  : wallet.error}
              </p>
            )}
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
              Write your question, choose three possible answers, and decide how many people need to answer before
              results appear.
            </div>
          </div>
          <div className="how-cell">
            <div className="how-number">02</div>
            <div className="how-heading">Hand out the keys</div>
            <div className="how-body">
              Everyone gets their own one-time access key. It isn't tied to their response, so nobody can work
              backwards from the results to figure out who said what.
            </div>
          </div>
          <div className="how-cell">
            <div className="how-number">03</div>
            <div className="how-heading">They answer once</div>
            <div className="how-body">
              Each person can answer once. Their response gets added to the total with everyone else's. What you
              see afterward is the count, not who picked what.
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
            If only a couple of people have answered, it's often easy to guess who they were. Waiting until enough
            responses are in makes that guessing much harder, so people can answer honestly without worrying their
            answer will stand out.
          </div>
        </div>
      </div>

      <div className="landing-cta">
        <div className="landing-cta-title">Ask the question nobody wants to answer in public</div>
        <button className="btn btn-solid btn-display" onClick={onEnterApp} disabled={connecting}>
          {connectLabel}
        </button>
      </div>

      <div className="landing-footer">
        <span>Unsourced</span>
        <div className="landing-footer-links">
          <a href="/docs" onClick={(e) => { e.preventDefault(); onOpenDocs(); }}>
            Docs
          </a>
          <a href="/docs" onClick={(e) => { e.preventDefault(); onOpenDocs(); }}>
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
      <span>Invite up to 8 people</span>
      <span>One response per person</span>
      <span>Results stay locked until your threshold is met</span>
      <span>No accounts, no email signups</span>
    </div>
  );
}
