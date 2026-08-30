import { useEffect, useRef, useState } from "react";
import { useSurveyContract, type Wallet, type SurveyQuestion } from "../hooks/useSurvey";
import { WalletConnect } from "../components/WalletConnect";
import { CreateSurvey } from "../components/CreateSurvey";
import { AnswerSurvey } from "../components/AnswerSurvey";
import { ResultsView } from "../components/ResultsView";
import { HistoryView } from "../components/HistoryView";

type Tab = "create" | "answer" | "results" | "history";

interface Props {
  wallet: Wallet;
  onGoHome: () => void;
  onOpenDocs: () => void;
  initialSurveyAddress?: string;
  initialQuestions?: SurveyQuestion[];
}

const DEFAULT_QUESTIONS: SurveyQuestion[] = [];

export function AppShell({ wallet, onGoHome, onOpenDocs, initialSurveyAddress, initialQuestions }: Props) {
  const survey = useSurveyContract(wallet, initialSurveyAddress);
  const [tab, setTab] = useState<Tab>(initialSurveyAddress ? "answer" : "create");
  const [questions, setQuestions] = useState<SurveyQuestion[]>(initialQuestions ?? DEFAULT_QUESTIONS);

  // Disconnecting mid-session should drop you back to the landing page,
  // not leave you staring at a dashboard with no wallet behind it. Only
  // fires on an actual disconnect, not on first render before anyone's
  // connected (arriving here straight from a survey link starts out
  // "disconnected" too, and that's a normal state, not an exit).
  const wasConnected = useRef(false);
  useEffect(() => {
    if (wallet.status === "connected") wasConnected.current = true;
    if (wasConnected.current && wallet.status === "disconnected") {
      onGoHome();
    }
  }, [wallet.status, onGoHome]);

  function tabClass(name: Tab): string {
    return tab === name ? "app-tab app-tab--active" : "app-tab";
  }

  return (
    <div className="app-shell">
      <div className="app-nav">
        <a href="#home" onClick={onGoHome} className="app-logo">
          Unsourced
        </a>
        <div className="app-nav-right">
          <a href="#docs" onClick={onOpenDocs} className="app-docs-link">
            Docs
          </a>
          <WalletConnect {...wallet} />
        </div>
      </div>

      <div className="app-tabs">
        <button className={tabClass("create")} onClick={() => setTab("create")}>
          Create
        </button>
        <button className={tabClass("answer")} onClick={() => setTab("answer")}>
          Answer
        </button>
        <button className={tabClass("results")} onClick={() => setTab("results")}>
          Results
        </button>
        <button className={tabClass("history")} onClick={() => setTab("history")}>
          History
        </button>
      </div>

      <div className="app-body">
        {tab === "create" && (
          <CreateSurvey
            wallet={wallet}
            survey={survey}
            onDeployed={(deployed) => {
              setQuestions(deployed.questions);
              setTab("results");
            }}
          />
        )}
        {tab === "answer" && <AnswerSurvey wallet={wallet} survey={survey} questions={questions} onAnswered={() => {}} />}
        {tab === "results" && <ResultsView wallet={wallet} survey={survey} questions={questions} />}
        {tab === "history" && <HistoryView wallet={wallet} />}
      </div>
    </div>
  );
}
