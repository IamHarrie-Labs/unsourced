import { useState } from "react";
import { useWallet } from "./hooks/useSurvey";
import { Landing } from "./pages/Landing";
import { Docs } from "./pages/Docs";
import { AppShell } from "./pages/AppShell";
import "./App.css";

type Page = "landing" | "app" | "docs";

const params = new URLSearchParams(window.location.search);
const SURVEY_FROM_LINK = params.get("survey") ?? undefined;
const QUESTION_FROM_LINK = params.get("q") ?? undefined;
const OPTIONS_FROM_LINK: [string, string, string] | undefined =
  params.get("a") && params.get("b") && params.get("c")
    ? [params.get("a")!, params.get("b")!, params.get("c")!]
    : undefined;

function App() {
  const wallet = useWallet();
  const [page, setPage] = useState<Page>(SURVEY_FROM_LINK ? "app" : "landing");

  async function enterApp() {
    if (wallet.status !== "connected") await wallet.connect();
    setPage("app");
  }

  if (page === "docs") {
    return <Docs onOpenApp={enterApp} onGoHome={() => setPage("landing")} />;
  }

  if (page === "app") {
    return (
      <AppShell
        wallet={wallet}
        onGoHome={() => setPage("landing")}
        onOpenDocs={() => setPage("docs")}
        initialSurveyAddress={SURVEY_FROM_LINK}
        initialQuestion={QUESTION_FROM_LINK}
        initialOptions={OPTIONS_FROM_LINK}
      />
    );
  }

  return <Landing onEnterApp={enterApp} onOpenDocs={() => setPage("docs")} />;
}

export default App;
