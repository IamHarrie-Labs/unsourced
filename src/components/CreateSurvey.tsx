import { useState } from "react";
import type { Wallet } from "../hooks/useSurvey";
import { useSurveyContract, recordCreatedSurvey } from "../hooks/useSurvey";

interface Props {
  wallet: Wallet;
  survey: ReturnType<typeof useSurveyContract>;
  onDeployed: (args: { address: string; question: string; options: [string, string, string] }) => void;
}

interface DoneState {
  address: string;
  question: string;
  options: [string, string, string];
  memberKeys: string[];
}

export function CreateSurvey({ wallet, survey, onDeployed }: Props) {
  const { deploying, error, createSurvey } = survey;
  const [question, setQuestion] = useState("");
  const [oA, setOA] = useState("");
  const [oB, setOB] = useState("");
  const [oC, setOC] = useState("");
  const [people, setPeople] = useState(5);
  const [threshold, setThreshold] = useState(3);
  const [stage, setStage] = useState<"deploy" | "hashing" | "deploying">("deploy");
  const [done, setDone] = useState<DoneState | null>(null);
  const [copied, setCopied] = useState(false);

  const canDeploy = wallet.status === "connected" && question.trim().length > 0 && oA.trim() && oB.trim() && oC.trim() && !deploying;

  async function handleDeploy() {
    setStage("hashing");
    const options: [string, string, string] = [oA.trim(), oB.trim(), oC.trim()];
    setStage("deploying");
    const outcome = await createSurvey(people, threshold);
    if (outcome) {
      const record = { address: outcome.contractAddress, question: question.trim(), options, memberKeys: outcome.memberKeys };
      setDone(record);
      recordCreatedSurvey({
        address: record.address,
        question: record.question,
        options: record.options,
        people,
        threshold,
        createdAt: new Date().toISOString(),
      });
      onDeployed({ address: record.address, question: record.question, options: record.options });
    }
    setStage("deploy");
  }

  function shareLink(record: DoneState): string {
    const params = new URLSearchParams({
      survey: record.address,
      q: record.question,
      a: record.options[0],
      b: record.options[1],
      c: record.options[2],
    });
    return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
  }

  function resetCreate() {
    setDone(null);
    setQuestion("");
    setOA("");
    setOB("");
    setOC("");
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
          <button className="btn-yellow" onClick={() => onDeployed({ address: done.address, question: done.question, options: done.options })}>
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
        Everything here except the question wording ends up on-chain as numbers and hashes. The wording stays in
        the app.
      </div>

      <div className="field-group">
        <div>
          <label className="field-label">Question</label>
          <input
            className="field-big-input"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="How is the sprint going?"
          />
        </div>

        <div>
          <label className="field-label">Three options</label>
          <div className="option-rows">
            <OptionInput letter="A" value={oA} onChange={setOA} placeholder="Fine" />
            <OptionInput letter="B" value={oB} onChange={setOB} placeholder="Rough" />
            <OptionInput letter="C" value={oC} onChange={setOC} placeholder="Great" />
          </div>
        </div>

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
