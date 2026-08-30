interface Props {
  onOpenApp: () => void;
  onGoHome: () => void;
}

export function Docs({ onOpenApp, onGoHome }: Props) {
  return (
    <div className="docs">
      <div className="landing-nav">
        <a href="#home" onClick={onGoHome} className="landing-logo">
          Unsourced
        </a>
        <div className="landing-nav-links" style={{ fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.1em" }}>
          <span style={{ opacity: 0.6 }}>Docs</span>
          <button className="btn btn-solid" onClick={onOpenApp}>
            Open app
          </button>
        </div>
      </div>

      <div className="docs-inner">
        <div className="docs-title">Docs</div>
        <div className="docs-sub">Plain language first. Everything a developer needs is further down.</div>

        <div className="docs-sections">
          <div>
            <div className="docs-heading">What it is</div>
            <p className="docs-p">
              Unsourced is an anonymous survey for a group you already know: a team, a class, a DAO. You pick who
              can answer, hand each of them a single-use key, and ask your question. Everyone can answer once.
              Afterwards you can see the totals, and nobody can see who chose what, including you.
            </p>
            <p className="docs-p">
              The value isn't hiding from a stranger. It's hiding from the person who'll actually read the results.
            </p>
          </div>

          <div>
            <div className="docs-heading">Running a survey</div>
            <div className="docs-steps">
              <div className="docs-step">
                <span className="docs-step-n">01</span>
                <span className="docs-step-body">Connect Lace, set to the Preview network.</span>
              </div>
              <div className="docs-step">
                <span className="docs-step-n">02</span>
                <span className="docs-step-body">
                  Write your question and three options. Choose how many people you're asking (up to eight) and how
                  many answers should arrive before results unlock.
                </span>
              </div>
              <div className="docs-step">
                <span className="docs-step-n">03</span>
                <span className="docs-step-body">
                  Deploy. You get a link and one key per person. Send each person the link and one key, privately.
                </span>
              </div>
              <div className="docs-step">
                <span className="docs-step-n">04</span>
                <span className="docs-step-body">
                  Watch the count climb. Once it hits your threshold, the totals appear.
                </span>
              </div>
            </div>
            <div className="docs-note">
              Keys are shown once, at deploy time. The app cannot recover them. If you lose one before sending it,
              that seat simply goes unused.
            </div>
          </div>

          <div>
            <div className="docs-heading">Answering one</div>
            <p className="docs-p">
              Open the link, paste your key, pick an option. Your browser builds a proof that your key is one of the
              keys on that survey's list, without revealing which. The survey's total for your option goes up by
              one and your key is marked as spent. You cannot answer twice, and you cannot change your answer.
            </p>
          </div>

          <div>
            <div className="docs-heading">Privacy model</div>
            <div className="docs-label">What an observer can learn</div>
            <div className="docs-list">
              <div className="docs-list-item">The 8 member commitments, published once at deploy time.</div>
              <div className="docs-list-item">The response count and the three tally totals.</div>
              <div className="docs-list-item">
                That some committed member responded, and which of the three tallies grew: never which member.
              </div>
            </div>
            <div className="docs-label" style={{ marginTop: 28 }}>
              What an observer cannot learn
            </div>
            <div className="docs-list">
              <div className="docs-list-item">
                Any member's secret key. It's a private witness, read only inside a proof generated on that member's
                own machine: never in the transaction, never in the ledger.
              </div>
              <div className="docs-list-item">Which of the 8 members submitted any given response.</div>
              <div className="docs-list-item">
                Whether two responses came from the same member or two different ones (impossible anyway: one
                response per member is enforced on-chain).
              </div>
            </div>
            <p className="docs-p" style={{ marginTop: 24 }}>
              What is proved without being revealed: that the caller holds a key on this survey's roster, and that
              this key hasn't responded before. That's the entire access control and anti-double-voting mechanism,
              and neither ever puts a key on chain.
            </p>
            <p className="docs-p">
              Results stay hidden in the frontend until the response count reaches a threshold set at deploy time.
              That's a display choice, not a cryptographic seal: the tallies are always on the public ledger, so
              anyone querying the indexer directly could read them early. The point of the threshold is that a
              handful of early answers can't be pinned on individuals by process of elimination.
            </p>
          </div>

          <div>
            <div className="docs-heading">Contract address</div>
            <div className="docs-table">
              <div className="docs-table-head">
                <span className="docs-table-key">Network</span>
                <span>Address</span>
              </div>
              <div className="docs-table-row">
                <span className="docs-table-key">Preview</span>
                <span>d2549a8f19f9bea396225d835cd54b5df552acf12649bb64260ee6dcad8e6765</span>
              </div>
            </div>
            <p className="docs-p" style={{ marginTop: 14 }}>
              That's the address of the demo survey; every survey created through the app gets its own fresh address
              the same way.
            </p>
            <p className="docs-p" style={{ marginTop: 14 }}>
              A note on the network: the live demo runs against Preview instead of Preprod. Preprod's own
              RPC/indexer has been down every time I've checked over several weeks: every deploy attempt hangs
              indefinitely at wallet sync. Midnight's own forum confirms Preprod is mid-reset for mainnet prep and
              "intermittently unavailable during testing." Preview is fully functional and this is the same
              contract, same circuits, same frontend, only the network target differs.
            </p>
          </div>

          <div>
            <div className="docs-heading">Tech stack</div>
            <p className="docs-p">
              Midnight network, Compact, Midnight.js SDK, React + Vite, Lace wallet, Node.js v22, Docker (for the
              local proof server).
            </p>
          </div>

          <div>
            <div className="docs-heading">Setup</div>
            <p className="docs-p">
              Prerequisites: Node.js v22, Docker Desktop running, the Compact toolchain (on Windows this needs
              WSL2), the Lace wallet extension with a Preview account.
            </p>
            <div className="docs-code">{"git clone <your repo url>\ncd unsourced\nnpm install"}</div>
            <p className="docs-p">
              Compile the contract. This generates <span className="mono">managed/survey</span> with the compiled
              circuits and keys.
            </p>
            <div className="docs-code">npm run compact</div>
            <p className="docs-p">Start the proof server in a separate terminal and leave it running.</p>
            <div className="docs-code">docker run -p 6300:6300 midnightntwrk/proof-server:8.1.0 midnight-proof-server -v</div>
            <p className="docs-p">
              Run the frontend. Opens at <span className="mono">http://localhost:5173</span>.{" "}
              <span className="mono">VITE_NETWORK_ID</span> and <span className="mono">VITE_SURVEY_CONTRACT_ADDRESS</span> in{" "}
              <span className="mono">.env</span> control which network and contract the UI points at: make sure
              Lace is unlocked and set to the matching network.
            </p>
            <div className="docs-code">npm run dev</div>
          </div>

          <div>
            <div className="docs-heading">Tests and CI</div>
            <div className="docs-code">{"npm test\nnpm run test:verbose"}</div>
            <p className="docs-p">
              10 tests split into circuit logic, state transitions, and privacy: a committed member can respond
              once; a non-member is rejected; a second response from the same member is rejected; tallies match the
              chosen option; no raw member key ever appears in ledger state.
            </p>
            <p className="docs-p">
              Every push and pull request to main runs <span className="mono">.github/workflows/ci.yml</span>,
              which checks out the repo, installs Node 22 and the Compact toolchain, compiles the contract from
              source, and runs the full test suite.
            </p>
          </div>

          <div>
            <div className="docs-heading">Create a survey from the CLI</div>
            <p className="docs-p">
              The app itself is the normal way to create a survey; this is only for scripting or testing without a
              browser.
            </p>
            <div className="docs-code">npm run deploy -- --network preview</div>
            <p className="docs-p">
              Generates 8 fresh member keys, deploys with their commitments baked in, and writes the keys to a local{" "}
              <span className="mono">.survey-roster-keys.&lt;network&gt;.json</span> (gitignored, never commit it).
              Distribute one key per real member out of band, then delete the unused ones from your copy.
            </p>
          </div>
        </div>

        <div className="docs-footer">
          <a href="#home" onClick={onGoHome}>
            ← Back to home
          </a>
          <button onClick={onOpenApp}>Open the app →</button>
        </div>
      </div>
    </div>
  );
}
