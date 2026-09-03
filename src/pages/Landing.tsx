import { useEffect, useRef, useState } from "react";
import type { Wallet } from "../hooks/useSurvey";

const LEDGER_ITEMS: { group: "Public" | "Never leaves the device"; text: string }[] = [
  { group: "Public", text: "The eight key hashes, written once when the survey is made." },
  { group: "Public", text: "How many people have answered, and the tally for each question." },
  { group: "Public", text: "That someone on the list answered, and which tally went up." },
  { group: "Never leaves the device", text: "Anyone's key. It is read only inside a proof made on their own machine." },
  { group: "Never leaves the device", text: "Which of the eight people sent any given answer." },
  { group: "Never leaves the device", text: "Any link between a person and the answer they picked. The two are never stored together." },
];

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
        <LedgerStack />
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
          <a href="https://x.com/tryunsourced" target="_blank" rel="noreferrer">
            X
          </a>
          <span style={{ opacity: 0.6 }}>Preview network</span>
        </div>
      </div>
    </div>
  );
}

// A vertical scroll through this section drives a horizontal slide: the
// wrapper is tall enough to hold the whole scroll range, an inner sticky
// pane stays pinned to the viewport while that range plays out, and the
// card row translates sideways in step with it.
function LedgerStack() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [maxShift, setMaxShift] = useState(0);
  const [shift, setShift] = useState(0);

  useEffect(() => {
    function measure() {
      if (!trackRef.current) return;
      const overshoot = trackRef.current.scrollWidth - window.innerWidth;
      setMaxShift(Math.max(0, overshoot + 64));
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    function onScroll() {
      const wrapper = wrapperRef.current;
      if (!wrapper || maxShift === 0) return;
      const rect = wrapper.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, -rect.top / maxShift));
      setShift(progress * maxShift);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [maxShift]);

  return (
    <div className="ledger-stack-wrapper" ref={wrapperRef} style={{ height: `calc(100vh + ${maxShift}px)` }}>
      <div className="ledger-stack-sticky">
        <div className="section-title">What the ledger sees</div>
        <div className="ledger-track" ref={trackRef} style={{ transform: `translateX(-${shift}px)` }}>
          {LEDGER_ITEMS.map((item, i) => (
            <div className="ledger-stack-card" key={i} style={{ zIndex: i + 1 }}>
              <div className={item.group === "Public" ? "ledger-stack-tag ledger-stack-tag--public" : "ledger-stack-tag ledger-stack-tag--device"}>
                {item.group}
              </div>
              <div className="ledger-stack-text">{item.text}</div>
            </div>
          ))}
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
