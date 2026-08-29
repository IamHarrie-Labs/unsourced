import { useEffect, useState } from "react";
import { useSurvey, type SurveyLedgerView } from "./hooks/useSurvey";
import { SurveyPanel } from "./components/SurveyPanel";
import "./App.css";

function App() {
  const survey = useSurvey();
  const [ledger, setLedger] = useState<SurveyLedgerView | null>(null);

  useEffect(() => {
    if (survey.status !== "connected") return;
    let cancelled = false;
    survey.readLedger().then((view) => {
      if (!cancelled) setLedger(view);
    });
    return () => {
      cancelled = true;
    };
    // Refetch after any call attempt settles — a "failed assert" error can
    // still mean an earlier attempt actually landed on-chain, so the ledger
    // needs re-reading on error too, not just on success.
  }, [survey.status, survey.lastResult, survey.error]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="app">
      <main>
        <SurveyPanel {...survey} ledger={ledger} />
        <p className="network-note">
          Network: {survey.networkId}
          {survey.contractAddress ? ` · Contract: ${survey.contractAddress.slice(0, 12)}…` : " · No contract configured"}
        </p>
      </main>
    </div>
  );
}

export default App;
