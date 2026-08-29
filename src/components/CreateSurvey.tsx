import { useState } from "react";
import type { useSurvey } from "../hooks/useSurvey";
import { WalletConnect } from "./WalletConnect";

type Props = ReturnType<typeof useSurvey>;

export function CreateSurvey(props: Props) {
  const { status, error, deploying, connect, disconnect, address, createSurvey } = props;
  const [question, setQuestion] = useState("");
  const [memberCount, setMemberCount] = useState(5);
  const [threshold, setThreshold] = useState(3);
  const [result, setResult] = useState<{ contractAddress: string; memberKeys: string[]; question: string } | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const canCreate = status === "connected" && question.trim().length > 0 && !deploying;

  async function handleCreate() {
    const outcome = await createSurvey(memberCount, threshold);
    if (outcome) setResult({ ...outcome, question: question.trim() });
  }

  function copy(text: string, mark: () => void) {
    navigator.clipboard.writeText(text).then(mark);
  }

  if (result) {
    const link = `${window.location.origin}/?survey=${result.contractAddress}&q=${encodeURIComponent(result.question)}`;
    return (
      <div className="survey-panel">
        <header>
          <h1>Your survey is live</h1>
        </header>

        <p className="survey-question">
          Send the link to your group, then give each person exactly one key below. Anyone holding a key on this
          list can answer once, in complete privacy — including from you.
        </p>

        <div className="create-field">
          <label>Link to share</label>
          <div className="copy-row">
            <input type="text" readOnly value={link} onClick={(e) => e.currentTarget.select()} />
            <button
              onClick={() => copy(link, () => { setLinkCopied(true); setTimeout(() => setLinkCopied(false), 1500); })}
            >
              {linkCopied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>

        <div className="create-field">
          <label>Keys — one per person, never reuse a line</label>
          <div className="key-list">
            {result.memberKeys.map((key, i) => (
              <div className="copy-row" key={key}>
                <input type="text" readOnly value={key} onClick={(e) => e.currentTarget.select()} />
                <button
                  onClick={() => copy(key, () => { setCopiedIndex(i); setTimeout(() => setCopiedIndex(null), 1500); })}
                >
                  {copiedIndex === i ? "Copied" : `Copy #${i + 1}`}
                </button>
              </div>
            ))}
          </div>
        </div>

        <p className="circuit-hint">
          This is the only time these keys are shown. Nothing is saved anywhere — if you navigate away without
          copying them, they're gone for good and you'd need to start a new survey.
        </p>
      </div>
    );
  }

  return (
    <div className="survey-panel">
      <header>
        <h1>Start a survey</h1>
        <WalletConnect status={status} address={address} error={error} connect={connect} disconnect={disconnect} />
      </header>

      <p className="survey-question">
        Ask your group something and get an honest answer back — nobody, including you, will be able to tell who
        picked what.
      </p>

      <div className="create-field">
        <label>What do you want to ask?</label>
        <input
          type="text"
          placeholder={'e.g. "How\'s this cycle going?"'}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
      </div>

      <div className="create-field create-field--row">
        <div>
          <label>How many people?</label>
          <input
            type="number"
            min={1}
            max={8}
            value={memberCount}
            onChange={(e) => {
              const n = Math.min(8, Math.max(1, Number(e.target.value) || 1));
              setMemberCount(n);
              if (threshold > n) setThreshold(n);
            }}
          />
        </div>
        <div>
          <label>Answers needed before results show</label>
          <input
            type="number"
            min={1}
            max={memberCount}
            value={threshold}
            onChange={(e) => setThreshold(Math.min(memberCount, Math.max(1, Number(e.target.value) || 1)))}
          />
        </div>
      </div>

      <p className="circuit-hint">
        Up to 8 people for now. A higher number here means more answers come in before anyone can see how the
        results are shaping up — that's what keeps a handful of early answers from being traceable to specific
        people.
      </p>

      <button className="create-button" disabled={!canCreate} onClick={handleCreate}>
        {deploying ? "Creating your survey…" : "Create survey"}
      </button>

      {status !== "connected" && <p className="circuit-hint">Connect your wallet first — it pays the small network fee to set this up.</p>}
      {error && <p className="circuit-error">{error}</p>}
    </div>
  );
}
