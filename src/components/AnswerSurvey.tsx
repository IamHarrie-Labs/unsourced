import { useState } from "react";
import type { Wallet } from "../hooks/useSurvey";
import type { useSurveyContract, SurveyOption } from "../hooks/useSurvey";
import { recordAnsweredSurvey } from "../hooks/useSurvey";

interface Props {
  wallet: Wallet;
  survey: ReturnType<typeof useSurveyContract>;
  question?: string;
  options: [string, string, string];
  onAnswered: () => void;
}

const OPTION_KEYS: SurveyOption[] = ["respondA", "respondB", "respondC"];

export function AnswerSurvey({ wallet, survey, question, options, onAnswered }: Props) {
  const { contractAddress, memberKeyHex, hasResponded, busyOption, error, lastResult, setMemberKey, respond } = survey;
  const [draftKey, setDraftKey] = useState("");
  const [keyError, setKeyError] = useState("");

  if (!contractAddress) {
    return (
      <div>
        <div className="page-title">Answer a survey</div>
        <div className="page-sub">Open the link you were sent to answer a survey. There's nothing to answer here yet.</div>
      </div>
    );
  }

  if (wallet.status !== "connected") {
    return (
      <div>
        <div className="page-title">{question ?? "Answer a survey"}</div>
        <div className="page-sub">Connect your wallet to continue, it's how you sign your answer, nothing is spent.</div>
      </div>
    );
  }

  function handleContinue() {
    const trimmed = draftKey.trim();
    if (!trimmed) {
      setKeyError("Paste the key you were given.");
      return;
    }
    setKeyError("");
    setMemberKey(trimmed);
  }

  function handlePick(option: SurveyOption) {
    respond(option).then(() => {
      recordAnsweredSurvey({ address: contractAddress!, question: question ?? "Untitled survey", answeredAt: new Date().toISOString() });
      onAnswered();
    });
  }

  if (hasResponded) {
    return (
      <div>
        <div className="page-title">Answer sent</div>
        <div className="page-sub" style={{ fontSize: 16, color: "var(--cream)" }}>
          The tally for your option went up by one. Your key is now marked as used. There is no record anywhere of
          which option you picked.
        </div>
        {lastResult && <p className="stage-footnote">{lastResult}</p>}
      </div>
    );
  }

  if (!memberKeyHex) {
    return (
      <div>
        <div className="page-title">{question ?? "Answer a survey"}</div>
        <div className="page-sub">Paste the key you were given. It stays in this browser and is never sent anywhere.</div>
        <div style={{ marginTop: 36 }}>
          <label className="field-label">Your key</label>
          <input
            className="key-input"
            value={draftKey}
            onChange={(e) => { setDraftKey(e.target.value); setKeyError(""); }}
            placeholder="The key from whoever invited you"
          />
          {(keyError || error) && <div className="field-error">{keyError || error}</div>}
          <button className="btn-yellow" style={{ marginTop: 24 }} onClick={handleContinue}>
            Unlock survey
          </button>
        </div>
      </div>
    );
  }

  const busy = busyOption !== null;

  if (busy) {
    return (
      <div>
        <div className="page-title">Sending</div>
        <div className="stage-list">
          <div className="stage-row" style={{ color: "var(--cream)" }}>
            <span className="stage-mark">·</span>
            <span className="stage-label">Proving your key is on the roster, without saying which one</span>
          </div>
        </div>
        <div className="stage-footnote">Proof built locally, nothing about your key leaves the machine.</div>
      </div>
    );
  }

  return (
    <div>
      <div className="eyebrow">Key accepted · on the roster</div>
      <div className="big-title">{question ?? "Pick an option"}</div>
      <div className="option-rows" style={{ marginTop: 36 }}>
        {OPTION_KEYS.map((key, i) => (
          <button key={key} className="option-pick" disabled={busy} onClick={() => handlePick(key)}>
            <span className="option-pick-letter">{"ABC"[i]}</span>
            <span>{options[i]}</span>
          </button>
        ))}
      </div>
      <div className="answer-locked-hint">
        One answer only. After you send it, your key is spent and the app has no way to change or read back what
        you picked.
      </div>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
