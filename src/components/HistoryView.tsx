import { useEffect, useState } from "react";
import type { Wallet } from "../hooks/useSurvey";
import { getCreatedHistory, getAnsweredHistory, readSurveyLedger, buildShareLink, type CreatedSurveyRecord, type AnsweredSurveyRecord } from "../hooks/useSurvey";

interface Props {
  wallet: Wallet;
}

type LiveState = Record<string, { responseCount: number; revealed: boolean } | "loading" | "error">;

export function HistoryView({ wallet }: Props) {
  const [tab, setTab] = useState<"created" | "answered">("created");
  const created = getCreatedHistory();
  const answered = getAnsweredHistory();
  const [live, setLive] = useState<LiveState>({});

  useEffect(() => {
    if (wallet.status !== "connected" || !wallet.connectedApi || tab !== "created" || created.length === 0) return;
    const api = wallet.connectedApi;
    created.forEach((record) => {
      setLive((prev) => ({ ...prev, [record.address]: "loading" }));
      readSurveyLedger(api, record.address)
        .then((ledger) => {
          setLive((prev) => ({
            ...prev,
            [record.address]: ledger ? { responseCount: Number(ledger.responseCount), revealed: ledger.revealed } : "error",
          }));
        })
        .catch(() => setLive((prev) => ({ ...prev, [record.address]: "error" })));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet.status, wallet.connectedApi, tab]);

  return (
    <div style={{ maxWidth: 900 }}>
      <div className="page-title">My history</div>
      <div className="hist-tabs">
        <button className={tab === "created" ? "hist-tab hist-tab--active" : "hist-tab"} onClick={() => setTab("created")}>
          I created
        </button>
        <button className={tab === "answered" ? "hist-tab hist-tab--active" : "hist-tab"} onClick={() => setTab("answered")}>
          I answered
        </button>
      </div>

      {tab === "created" && (
        <div className="hist-list">
          {created.length === 0 && <div className="hist-empty">Nothing here yet. Surveys you create in this browser will show up in this list.</div>}
          {created.map((record) => (
            <CreatedRow key={record.address} record={record} state={live[record.address]} connected={wallet.status === "connected"} />
          ))}
        </div>
      )}

      {tab === "answered" && (
        <div className="hist-list">
          {answered.length === 0 && <div className="hist-empty">Nothing here yet. Surveys you answer in this browser will show up in this list.</div>}
          {answered.map((record) => (
            <AnsweredRow key={record.address} record={record} />
          ))}
          {answered.length > 0 && (
            <div className="hist-footnote">
              This list is kept in your browser so you know where you've been. What you picked is not in it,
              because it isn't recorded anywhere.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CreatedRow({ record, state, connected }: { record: CreatedSurveyRecord; state: LiveState[string] | undefined; connected: boolean }) {
  const date = new Date(record.createdAt).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
  let progress = "Connect your wallet to check";
  let stateLabel = "";
  let stateClass = "hist-row-state--dim";
  if (!connected) {
    progress = "Connect your wallet to check";
  } else if (state === "loading" || state === undefined) {
    progress = "Checking…";
  } else if (state === "error") {
    progress = "Couldn't load";
  } else {
    progress = `${state.responseCount} of ${record.people} answered`;
    stateLabel = state.revealed ? "Results open" : "Locked";
    stateClass = state.revealed ? "hist-row-state--yellow" : "hist-row-state--dim";
  }
  const title = record.questions.length === 1 ? record.questions[0].text : `${record.questions[0].text} +${record.questions.length - 1} more`;
  const [copied, setCopied] = useState(false);
  const link = buildShareLink(record.address, record.questions);
  return (
    <div className="hist-row">
      <div>
        <div className="hist-row-q">{title}</div>
        <div className="hist-row-meta">
          {record.address.slice(0, 10)}… · {date}
        </div>
      </div>
      <div className="hist-row-progress">{progress}</div>
      <div className={`hist-row-state ${stateClass}`}>{stateLabel}</div>
      <button
        className="btn-ghost-yellow"
        style={{ justifySelf: "start" }}
        onClick={() => navigator.clipboard.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1600); })}
      >
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}

function AnsweredRow({ record }: { record: AnsweredSurveyRecord }) {
  const date = new Date(record.answeredAt).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
  const title = record.questions.length === 1 ? record.questions[0].text : `${record.questions[0].text} +${record.questions.length - 1} more`;
  return (
    <div className="hist-row">
      <div>
        <div className="hist-row-q">{title}</div>
        <div className="hist-row-meta">
          {record.address.slice(0, 10)}… · {date}
        </div>
      </div>
      <div className="hist-row-progress">Key spent</div>
      <div className="hist-row-progress">Your answer: not stored</div>
    </div>
  );
}
