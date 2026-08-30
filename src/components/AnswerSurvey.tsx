import { useState } from "react";
import type { Wallet, SurveyQuestion } from "../hooks/useSurvey";
import type { useSurveyContract } from "../hooks/useSurvey";
import { recordAnsweredSurvey, NO_ANSWER } from "../hooks/useSurvey";

interface Props {
  wallet: Wallet;
  survey: ReturnType<typeof useSurveyContract>;
  questions: SurveyQuestion[];
  onAnswered: () => void;
}

export function AnswerSurvey({ wallet, survey, questions, onAnswered }: Props) {
  const { contractAddress, memberKeyHex, hasResponded, submitting, error, lastResult, setMemberKey, respond } = survey;
  const [draftKey, setDraftKey] = useState("");
  const [keyError, setKeyError] = useState("");
  const [step, setStep] = useState(0);
  const [picks, setPicks] = useState<number[]>(Array(questions.length).fill(-1));

  if (!contractAddress || questions.length === 0) {
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
        <div className="page-title">{questions[0].text}</div>
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

  function pick(option: number) {
    setPicks((prev) => prev.map((p, i) => (i === step ? option : p)));
    if (step < questions.length - 1) {
      setStep(step + 1);
    }
  }

  async function handleSubmit() {
    const answers = Array.from({ length: 4 }, (_, i) => (i < picks.length && picks[i] >= 0 ? picks[i] : NO_ANSWER));
    await respond(answers);
    recordAnsweredSurvey({ address: contractAddress!, questions, answeredAt: new Date().toISOString() });
    onAnswered();
  }

  if (hasResponded) {
    return (
      <div>
        <div className="page-title">Answer sent</div>
        <div className="page-sub" style={{ fontSize: 16, color: "var(--cream)" }}>
          The tally for each answer you picked went up by one. Your key is now marked as used. There is no record
          anywhere of which options you picked.
        </div>
        {lastResult && <p className="stage-footnote">{lastResult}</p>}
      </div>
    );
  }

  if (!memberKeyHex) {
    return (
      <div>
        <div className="page-title">{questions[0].text}</div>
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

  if (submitting) {
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

  const question = questions[step];
  const isLastStep = step === questions.length - 1;
  const allPicked = picks.every((p) => p >= 0);

  return (
    <div>
      <div className="eyebrow">
        Key accepted · on the roster{questions.length > 1 ? ` · question ${step + 1} of ${questions.length}` : ""}
      </div>
      <div className="big-title">{question.text}</div>
      <div className="option-rows" style={{ marginTop: 36 }}>
        {question.options.map((label, i) => (
          <button
            key={i}
            className={picks[step] === i ? "option-pick option-pick--picked" : "option-pick"}
            onClick={() => pick(i)}
          >
            <span className="option-pick-letter">{"ABC"[i]}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>

      {questions.length > 1 && (
        <div className="action-row">
          <button className="btn-outline-dark" disabled={step === 0} onClick={() => setStep(step - 1)}>
            Back
          </button>
          {!isLastStep && (
            <button className="btn-outline-dark" disabled={picks[step] < 0} onClick={() => setStep(step + 1)}>
              Next
            </button>
          )}
        </div>
      )}

      {isLastStep && (
        <div className="action-row">
          <button className="btn-yellow" disabled={!allPicked} onClick={handleSubmit}>
            Send answers
          </button>
        </div>
      )}

      <div className="answer-locked-hint">
        One set of answers only. After you send it, your key is spent and the app has no way to change or read
        back what you picked.
      </div>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
