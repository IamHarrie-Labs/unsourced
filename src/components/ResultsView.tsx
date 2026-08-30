import { useEffect, useState } from "react";
import type { Wallet } from "../hooks/useSurvey";
import type { useSurveyContract, SurveyLedgerView } from "../hooks/useSurvey";

interface Props {
  wallet: Wallet;
  survey: ReturnType<typeof useSurveyContract>;
  question?: string;
  options: [string, string, string];
}

export function ResultsView({ wallet, survey, question, options }: Props) {
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

  if (!contractAddress) {
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
  const total = ledger ? Number(ledger.tallyA) + Number(ledger.tallyB) + Number(ledger.tallyC) || 1 : 1;

  return (
    <div style={{ maxWidth: 860 }}>
      <div className="eyebrow">
        Survey · {contractAddress.slice(0, 10)}…{contractAddress.slice(-6)}
      </div>
      <div className="big-title">{question ?? "Untitled survey"}</div>

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
        <>
          <div className="tally-list">
            <TallyBar label={options[0]} count={Number(ledger.tallyA)} total={total} />
            <TallyBar label={options[1]} count={Number(ledger.tallyB)} total={total} />
            <TallyBar label={options[2]} count={Number(ledger.tallyC)} total={total} />
          </div>
          <div className="results-footnote">
            Totals only. The ledger holds three numbers and a list of spent keys, no row anywhere ties a person to
            an option.
          </div>
        </>
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
