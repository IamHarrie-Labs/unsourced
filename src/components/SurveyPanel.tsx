import { useState } from "react";
import type { useSurvey, SurveyLedgerView } from "../hooks/useSurvey";
import { WalletConnect } from "./WalletConnect";

type Props = ReturnType<typeof useSurvey> & { ledger: SurveyLedgerView | null; question?: string };

const OPTION_LABELS: Record<"respondA" | "respondB" | "respondC", string> = {
  respondA: "Going well",
  respondB: "Mixed",
  respondC: "Needs work",
};

export function SurveyPanel(props: Props) {
  const { status, busyOption, lastResult, error, memberKeyHex, hasResponded, setMemberKey, respond, ledger, question } = props;
  const [draftKey, setDraftKey] = useState("");
  const disabled = status !== "connected" || busyOption !== null || !memberKeyHex || hasResponded;
  const responseCount = ledger ? Number(ledger.responseCount) : 0;
  const revealThreshold = ledger ? Number(ledger.revealThreshold) : null;
  const stillNeeded = revealThreshold !== null ? Math.max(0, revealThreshold - responseCount) : null;

  return (
    <div className="survey-panel">
      <header>
        <h1>{question ?? "You've been invited to answer a survey"}</h1>
        <WalletConnect status={status} address={props.address} error={error} connect={props.connect} disconnect={props.disconnect} />
      </header>

      <p className="survey-question">
        Your answer can't be traced back to you — not by whoever's running this, not by anyone reading the
        results. You can only answer once.
      </p>

      {status !== "connected" && (
        <p className="circuit-hint">Connect your wallet to get started — it's how you sign your answer, nothing is spent.</p>
      )}

      {status === "connected" && !memberKeyHex && (
        <div className="member-key-form">
          <label>Paste the access key you were sent</label>
          <div className="copy-row">
            <input
              type="text"
              placeholder="The key from whoever invited you"
              value={draftKey}
              onChange={(e) => setDraftKey(e.target.value)}
            />
            <button onClick={() => setMemberKey(draftKey)} disabled={!draftKey.trim()}>
              Continue
            </button>
          </div>
        </div>
      )}

      {memberKeyHex && !hasResponded && (
        <div className="circuit-buttons">
          {(["respondA", "respondB", "respondC"] as const).map((option) => (
            <button key={option} disabled={disabled} onClick={() => respond(option)}>
              {busyOption === option ? "Sending your answer…" : OPTION_LABELS[option]}
            </button>
          ))}
        </div>
      )}

      {hasResponded && <p className="circuit-status">Thanks — your answer is in. You can close this page.</p>}
      {lastResult && <p className="circuit-result">{lastResult}</p>}
      {error && <p className="circuit-error">{error}</p>}

      <hr className="panel-divider" />

      <section className="ledger">
        <div>
          <span className="label">Answers so far</span>
          <span className="value">{ledger ? responseCount : "—"}</span>
        </div>
        <div>
          <span className="label">Needed to unlock results</span>
          <span className="value">{revealThreshold ?? "—"}</span>
        </div>
      </section>

      {ledger?.revealed ? (
        <div className="survey-results">
          <ResultBar label={OPTION_LABELS.respondA} count={ledger.tallyA} total={ledger.responseCount} />
          <ResultBar label={OPTION_LABELS.respondB} count={ledger.tallyB} total={ledger.responseCount} />
          <ResultBar label={OPTION_LABELS.respondC} count={ledger.tallyC} total={ledger.responseCount} />
        </div>
      ) : (
        <p className="circuit-hint">
          {stillNeeded !== null && stillNeeded > 0
            ? `Results are hidden until ${stillNeeded} more ${stillNeeded === 1 ? "person answers" : "people answer"}. That's on purpose — it stops a handful of early answers from being pinned on specific people.`
            : "Results will appear here once enough people have answered."}
        </p>
      )}
    </div>
  );
}

function ResultBar({ label, count, total }: { label: string; count: bigint; total: bigint }) {
  const pct = total > 0n ? Number((count * 100n) / total) : 0;
  return (
    <div className="result-bar">
      <div className="result-bar-label">
        <span>{label}</span>
        <span>{count.toString()}</span>
      </div>
      <div className="result-bar-track">
        <div className="result-bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
