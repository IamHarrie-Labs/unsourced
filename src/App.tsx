import { useEffect, useState } from "react";
import { useWallet, decodeShareData, type SurveyQuestion } from "./hooks/useSurvey";
import { Landing } from "./pages/Landing";
import { Docs } from "./pages/Docs";
import { AppShell } from "./pages/AppShell";
import "./App.css";

// A tiny path-based router, no library, matching how the rest of this app
// avoids extra dependencies. Each page gets a real path instead of a hash
// fragment, so the URL is shareable, bookmarkable, and survives a refresh.
export function navigate(path: string) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function App() {
  const wallet = useWallet();
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    function onPopState() {
      setPath(window.location.pathname);
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const params = new URLSearchParams(window.location.search);
  const surveyFromLink = params.get("survey") ?? undefined;
  const questionsFromLink: SurveyQuestion[] | undefined = params.get("data")
    ? (decodeShareData(params.get("data")!) ?? undefined)
    : undefined;
  const initialTab = params.get("view") === "results" ? "results" : undefined;

  async function enterApp() {
    const connected = wallet.status === "connected" || (await wallet.connect());
    if (connected) navigate("/app");
  }

  if (path === "/docs") {
    return <Docs onOpenApp={enterApp} onGoHome={() => navigate("/")} />;
  }

  if (path === "/app") {
    return (
      <AppShell
        wallet={wallet}
        onGoHome={() => navigate("/")}
        onOpenDocs={() => navigate("/docs")}
        initialSurveyAddress={surveyFromLink}
        initialQuestions={questionsFromLink}
        initialTab={initialTab}
      />
    );
  }

  return <Landing wallet={wallet} onEnterApp={enterApp} onOpenDocs={() => navigate("/docs")} />;
}

export default App;
