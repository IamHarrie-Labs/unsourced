import { useEffect, useState } from "react";
import { useSurvey, type SurveyLedgerView } from "./hooks/useSurvey";
import { SurveyPanel } from "./components/SurveyPanel";
import { CreateSurvey } from "./components/CreateSurvey";
import "./App.css";

// A link with ?survey=<address> is someone joining an existing survey.
// No link means there's nothing to join yet — show the create flow instead.
const params = new URLSearchParams(window.location.search);
const SURVEY_FROM_LINK = params.get("survey") ?? undefined;
const QUESTION_FROM_LINK = params.get("q") ?? undefined;

function RespondView({ contractAddress, question }: { contractAddress: string; question?: string }) {
  const survey = useSurvey(contractAddress);
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
    // Refetch after any attempt settles — a rejected answer can still mean
    // an earlier attempt actually landed, so re-read on error too.
  }, [survey.status, survey.lastResult, survey.error]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main>
      <SurveyPanel {...survey} ledger={ledger} question={question} />
      <p className="network-note">
        Network: {survey.networkId}
        {survey.contractAddress ? ` · Contract: ${survey.contractAddress.slice(0, 12)}…` : ""}
      </p>
    </main>
  );
}

function CreateView() {
  const survey = useSurvey();
  return (
    <main>
      <CreateSurvey {...survey} />
    </main>
  );
}

function App() {
  return <div className="app">{SURVEY_FROM_LINK ? <RespondView contractAddress={SURVEY_FROM_LINK} question={QUESTION_FROM_LINK} /> : <CreateView />}</div>;
}

export default App;
