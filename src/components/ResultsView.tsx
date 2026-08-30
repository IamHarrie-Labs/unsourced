import { useEffect, useState } from "react";
import type { Wallet, SurveyQuestion } from "../hooks/useSurvey";
import type { useSurveyContract, SurveyLedgerView } from "../hooks/useSurvey";

interface Props {
  wallet: Wallet;
  survey: ReturnType<typeof useSurveyContract>;
  questions: SurveyQuestion[];
}

export function ResultsView({ wallet, survey, questions }: Props) {
  const { contractAddress, readLedger } = survey;
  const [ledger, setLedger] = useState<SurveyLedgerView | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (wallet.status !== "connected" || !contractAddress) return;
    let cancelled = false;
    setLoading(true);
    readLedger()
      .then((view) => {
        if (!cancelled) setLedger(view);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [wallet.status, contractAddress, readLedger]);

  function refresh() {
    setLoading(true);
    readLedger()
      .then(setLedger)
      .finally(() => setLoading(false));
  }

  if (!contractAddress || questions.length === 0) {
    return (
      <div>
        <div className="page-title">Results</div>
        <div className="page-sub">Create or open a survey to see results here.</div>
      </div>
    );
  }

  if (wallet.status !== "connected") {
    return (
      <div>
        <div className="page-title">Results</div>
        <div className="page-sub">Connect your wallet to read this survey's results.</div>
      </div>
    );
  }

  const responseCount = ledger ? Number(ledger.responseCount) : 0;
  const threshold = ledger ? Number(ledger.revealThreshold) : 0;
  const revealed = ledger?.revealed ?? false;

  return (
    <div style={{ maxWidth: 860 }}>
      <div className="eyebrow">
        Survey · {contractAddress.slice(0, 10)}…{contractAddress.slice(-6)}
      </div>
      <div className="big-title">{questions.length === 1 ? questions[0].text : `${questions.length} questions`}</div>

      <div className="stat-grid">
        <div className="stat-cell">
          <div className="stat-value stat-value--yellow">{loading && !ledger ? "…" : responseCount}</div>
          <div className="stat-label">Answers in</div>
        </div>
        <div className="stat-cell">
          <div className="stat-value">{loading && !ledger ? "…" : threshold}</div>
          <div className="stat-label">Needed to unlock</div>
        </div>
      </div>

      {ledger && !revealed && (
        <div className="locked-box">
          <div className="locked-title">Locked</div>
          <div className="locked-copy">
            Totals appear once {threshold} answers are in. {Math.max(0, threshold - responseCount)} to go.
          </div>
          <button className="btn-ghost-yellow" style={{ marginTop: 24 }} onClick={refresh}>
            {loading ? "Checking…" : "Check again"}
          </button>
        </div>
      )}

      {ledger && revealed && (
        <div style={{ marginTop: 36, display: "flex", flexDirection: "column", gap: 44 }}>
          {questions.map((question, qIndex) => {
            const [a, b, c] = ledger.tallies[qIndex] ?? [0n, 0n, 0n];
            const total = Number(a) + Number(b) + Number(c) || 1;
            return (
              <div key={qIndex}>
                {questions.length > 1 && <div className="eyebrow">Question {qIndex + 1}</div>}
                <div style={{ fontSize: 18, fontWeight: 600, marginTop: questions.length > 1 ? 8 : 0, marginBottom: 16 }}>
                  {question.text}
                </div>
                <div className="tally-list" style={{ marginTop: 0 }}>
                  <TallyBar label={question.options[0]} count={Number(a)} total={total} />
                  <TallyBar label={question.options[1]} count={Number(b)} total={total} />
                  <TallyBar label={question.options[2]} count={Number(c)} total={total} />
                </div>
              </div>
            );
          })}
          <div className="results-footnote">
            Totals only. The ledger holds a handful of numbers and a list of spent keys, no row anywhere ties a
            person to an option.
          </div>
        </div>
      )}
    </div>
  );
}

function TallyBar({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = Math.round((count / total) * 100);
  return (
    <div>
      <div className="tally-header">
        <span className="tally-label">{label}</span>
        <span className="tally-count">{count}</span>
      </div>
      <div className="tally-track">
        <div className="tally-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
