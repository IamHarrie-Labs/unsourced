import { useState } from "react";
import type { Wallet, SurveyQuestion } from "../hooks/useSurvey";
import { useSurveyContract, recordCreatedSurvey, encodeShareData, MAX_QUESTIONS } from "../hooks/useSurvey";

interface Props {
  wallet: Wallet;
  survey: ReturnType<typeof useSurveyContract>;
  onDeployed: (args: { address: string; questions: SurveyQuestion[] }) => void;
}

interface DoneState {
  address: string;
  questions: SurveyQuestion[];
  memberKeys: string[];
}

function emptyQuestion(): SurveyQuestion {
  return { text: "", options: ["", "", ""] };
}

export function CreateSurvey({ wallet, survey, onDeployed }: Props) {
  const { deploying, error, createSurvey } = survey;
  const [questions, setQuestions] = useState<SurveyQuestion[]>([emptyQuestion()]);
  const [people, setPeople] = useState(5);
  const [threshold, setThreshold] = useState(3);
  const [stage, setStage] = useState<"deploy" | "hashing" | "deploying">("deploy");
  const [done, setDone] = useState<DoneState | null>(null);
  const [copied, setCopied] = useState(false);

  const questionsFilled = questions.every((q) => q.text.trim() && q.options.every((o) => o.trim()));
  const canDeploy = wallet.status === "connected" && questionsFilled && !deploying;

  function updateQuestionText(index: number, text: string) {
    setQuestions((qs) => qs.map((q, i) => (i === index ? { ...q, text } : q)));
  }

  function updateOption(qIndex: number, oIndex: number, value: string) {
    setQuestions((qs) =>
      qs.map((q, i) => (i === qIndex ? { ...q, options: q.options.map((o, j) => (j === oIndex ? value : o)) as [string, string, string] } : q)),
    );
  }

  function addQuestion() {
    if (questions.length < MAX_QUESTIONS) setQuestions((qs) => [...qs, emptyQuestion()]);
  }

  function removeQuestion(index: number) {
    setQuestions((qs) => qs.filter((_, i) => i !== index));
  }

  async function handleDeploy() {
    setStage("hashing");
    const trimmedQuestions = questions.map((q) => ({ text: q.text.trim(), options: q.options.map((o) => o.trim()) as [string, string, string] }));
    setStage("deploying");
    const outcome = await createSurvey(people, trimmedQuestions.length, threshold);
    if (outcome) {
      const record = { address: outcome.contractAddress, questions: trimmedQuestions, memberKeys: outcome.memberKeys };
      setDone(record);
      recordCreatedSurvey({
        address: record.address,
        questions: record.questions,
        people,
        threshold,
        createdAt: new Date().toISOString(),
      });
      onDeployed({ address: record.address, questions: record.questions });
    }
    setStage("deploy");
  }

  function shareLink(record: DoneState): string {
    const params = new URLSearchParams({
      survey: record.address,
      data: encodeShareData(record.questions),
    });
    return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
  }

  function resetCreate() {
    setDone(null);
    setQuestions([emptyQuestion()]);
    setCopied(false);
  }

  if (stage === "hashing" || stage === "deploying" || deploying) {
    return (
      <div>
        <div className="page-title">Deploying</div>
        <div className="stage-list">
          <StageRow label="Generating your keys" state={stage === "hashing" ? "active" : "done"} />
          <StageRow label="Deploying the contract" state={stage === "deploying" ? "active" : stage === "hashing" ? "pending" : "done"} />
        </div>
      </div>
    );
  }

  if (done) {
    const link = shareLink(done);
    return (
      <div>
        <div className="page-title">Survey is live</div>
        <div className="page-sub" style={{ maxWidth: "62ch" }}>
          Send each person the link plus one key. Each key works once. Keys are shown here only now, the app
          cannot recover them later.
        </div>

        <div className="panel-box">
          <div className="panel-box-title">Shareable link</div>
          <div className="link-row">
            <span>{link}</span>
            <button
              className="btn-ghost-yellow"
              onClick={() => navigator.clipboard.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1600); })}
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>

        <div className="key-box">
          <div className="key-box-title">Single-use keys</div>
          {done.memberKeys.map((key, i) => (
            <KeyRow key={key} n={String(i + 1).padStart(2, "0")} value={key} />
          ))}
        </div>

        <div className="action-row">
          <button className="btn-yellow" onClick={() => onDeployed({ address: done.address, questions: done.questions })}>
            See results
          </button>
          <button className="btn-outline-dark" onClick={resetCreate}>
            New survey
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-title">New survey</div>
      <div className="page-sub">
        Everything here except the question wording ends up on-chain as numbers and hashes. The wording rides
        along in the link you share, not on the ledger.
      </div>

      <div className="field-group">
        {questions.map((q, qIndex) => (
          <div key={qIndex} className="panel-box" style={{ marginTop: 0 }}>
            <div className="link-row" style={{ marginTop: 0 }}>
              <label className="field-label" style={{ marginBottom: 0 }}>
                Question {qIndex + 1}
              </label>
              {questions.length > 1 && (
                <button className="btn-ghost-yellow" onClick={() => removeQuestion(qIndex)}>
                  Remove
                </button>
              )}
            </div>
            <input
              className="field-big-input"
              value={q.text}
              onChange={(e) => updateQuestionText(qIndex, e.target.value)}
              placeholder="How is the sprint going?"
              style={{ marginTop: 12 }}
            />
            <div className="option-rows" style={{ marginTop: 20 }}>
              {(["A", "B", "C"] as const).map((letter, oIndex) => (
                <OptionInput
                  key={letter}
                  letter={letter}
                  value={q.options[oIndex]}
                  onChange={(v) => updateOption(qIndex, oIndex, v)}
                  placeholder={["Fine", "Rough", "Great"][oIndex]}
                />
              ))}
            </div>
          </div>
        ))}

        {questions.length < MAX_QUESTIONS && (
          <button className="btn-outline-dark" style={{ alignSelf: "flex-start" }} onClick={addQuestion}>
            Add another question
          </button>
        )}

        <div className="chip-row-group">
          <div>
            <label className="field-label">People you're asking</label>
            <div className="chip-row">
              {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  className={n === people ? "chip chip--active" : "chip"}
                  onClick={() => {
                    setPeople(n);
                    if (threshold > n) setThreshold(n);
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="field-label">Show results after</label>
            <div className="chip-row">
              {Array.from({ length: people }, (_, i) => i + 1).map((n) => (
                <button key={n} className={n === threshold ? "chip chip--active" : "chip"} onClick={() => setThreshold(n)}>
                  {n}
                </button>
              ))}
            </div>
            <div className="chip-hint">answers arrive</div>
          </div>
        </div>

        <div className="deploy-row">
          <button className="btn-yellow" disabled={!canDeploy} onClick={handleDeploy}>
            Deploy survey
          </button>
          <span className="deploy-note">One transaction · Preview network</span>
        </div>
      </div>

      {wallet.status !== "connected" && <p className="answer-locked-hint">Connect your wallet to deploy, it pays the small network fee.</p>}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

function OptionInput({ letter, value, onChange, placeholder }: { letter: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="option-row">
      <span className="option-row-letter">{letter}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function KeyRow({ n, value }: { n: string; value: string }) {
  return (
    <div className="key-row">
      <span className="key-row-n">{n}</span>
      <span className="key-row-key">{value}</span>
    </div>
  );
}

function StageRow({ label, state }: { label: string; state: "pending" | "active" | "done" }) {
  const mark = state === "done" ? "✓" : state === "active" ? "·" : " ";
  const color = state === "done" ? "var(--yellow)" : state === "active" ? "var(--cream)" : "#4a4a46";
  return (
    <div className="stage-row" style={{ color }}>
      <span className="stage-mark">{mark}</span>
      <span className="stage-label">{label}</span>
    </div>
  );
}
