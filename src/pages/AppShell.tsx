import { useState } from "react";
import { useSurveyContract, type Wallet } from "../hooks/useSurvey";
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
  initialQuestion?: string;
  initialOptions?: [string, string, string];
}

const DEFAULT_OPTIONS: [string, string, string] = ["Going well", "Mixed", "Needs work"];

export function AppShell({ wallet, onGoHome, onOpenDocs, initialSurveyAddress, initialQuestion, initialOptions }: Props) {
  const survey = useSurveyContract(wallet, initialSurveyAddress);
  const [tab, setTab] = useState<Tab>(initialSurveyAddress ? "answer" : "create");
  const [question, setQuestion] = useState<string | undefined>(initialQuestion);
  const [options, setOptions] = useState<[string, string, string]>(initialOptions ?? DEFAULT_OPTIONS);

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
              setQuestion(deployed.question);
              setOptions(deployed.options);
              setTab("results");
            }}
          />
        )}
        {tab === "answer" && <AnswerSurvey wallet={wallet} survey={survey} question={question} options={options} onAnswered={() => {}} />}
        {tab === "results" && <ResultsView wallet={wallet} survey={survey} question={question} options={options} />}
        {tab === "history" && <HistoryView wallet={wallet} />}
      </div>
    </div>
  );
}
