// Wallet connection + survey contract interaction. Wallet connection is
// shared across the whole app (one connect, every tab sees it); contract
// calls are parameterized by whichever survey address is currently in
// view, since a single browser session can create or answer more than one.

import { useCallback, useMemo, useState } from "react";
import type { ConnectedAPI, InitialAPI } from "@midnight-ntwrk/dapp-connector-api";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { deployContract, findDeployedContract } from "@midnight-ntwrk/midnight-js-contracts";
import { httpClientProofProvider } from "@midnight-ntwrk/midnight-js-http-client-proof-provider";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { FetchZkConfigProvider } from "@midnight-ntwrk/midnight-js-fetch-zk-config-provider";
import { CompiledContract } from "@midnight-ntwrk/midnight-js-protocol/compact-js";
import { fromHex, toHex, persistentHash, CompactTypeBytes, CompactTypeVector } from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";
import { Binding, Proof, SignatureEnabled, Transaction } from "@midnight-ntwrk/midnight-js-protocol/ledger";
import satisfies from "semver/functions/satisfies.js";

import * as SurveyContract from "../../managed/survey/contract/index.js";
import { inMemoryPrivateStateProvider } from "../in-memory-private-state-provider";

// 255 means "no answer for this slot": either the survey has fewer than 4
// questions, or (in principle) a question left blank.
export const NO_ANSWER = 255;
export const MAX_QUESTIONS = 4;
export const OPTIONS_PER_QUESTION = 3;

// Plain-language versions of what the contract's own asserts say. Someone
// using this shouldn't need to know what an "assert" or a "circuit" is to
// understand why a button didn't work.
function humanizeError(raw: string): string {
  const assertMatch = raw.match(/failed assert:\s*(.+)$/);
  const message = assertMatch ? assertMatch[1].trim() : raw;

  if (message.includes("not on this survey's member list")) {
    return "That key doesn't belong to this survey.";
  }
  if (message.includes("already responded")) {
    return "That key has already been used to answer this survey. One answer per person.";
  }
  if (raw.includes("disconnected from") || raw.includes("ECONNREFUSED")) {
    return "Lost the connection partway through. This usually clears up, try again.";
  }
  return message;
}

const NETWORK_ID = (import.meta.env.VITE_NETWORK_ID as string) || "preview";
const DEFAULT_CONTRACT_ADDRESS = import.meta.env.VITE_SURVEY_CONTRACT_ADDRESS as string | undefined;
const PRIVATE_STATE_ID = "surveyPrivateState";
const ROSTER_SIZE = 8;

setNetworkId(NETWORK_ID as never);

function memberKeyStorageKey(address: string): string {
  return `unsourced:member-key:${address}`;
}
function respondedStorageKey(address: string): string {
  return `unsourced:responded:${address}`;
}

function getLocalMemberKey(address: string): Uint8Array | null {
  const stored = localStorage.getItem(memberKeyStorageKey(address));
  if (!stored) return null;
  return new Uint8Array(stored.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
}

const COMPATIBLE_API_VERSION = "4.x";

function findCompatibleWallet(): InitialAPI | undefined {
  const injected = (window as unknown as { midnight?: Record<string, InitialAPI> }).midnight;
  if (!injected) return undefined;
  return Object.values(injected).find(
    (wallet) => !!wallet && typeof wallet === "object" && "apiVersion" in wallet && satisfies(wallet.apiVersion, COMPATIBLE_API_VERSION),
  );
}

// Same hash shape the contract computes for `persistentHash<Vector<1, Bytes<32>>>([secretKey()])`.
const COMMITMENT_DESCRIPTOR = new CompactTypeVector(1, new CompactTypeBytes(32));
function commitmentOf(secretKey: Uint8Array): Uint8Array {
  return persistentHash(COMMITMENT_DESCRIPTOR, [secretKey]);
}

export interface SurveyLedgerView {
  questionCount: number;
  tallies: [bigint, bigint, bigint][];
  responseCount: bigint;
  revealThreshold: bigint;
  revealed: boolean;
}

type WalletStatus = "disconnected" | "connecting" | "connected" | "error";

// ---------- Shared wallet connection (one per app, not per tab) ----------

export function useWallet() {
  const [status, setStatus] = useState<WalletStatus>("disconnected");
  const [address, setAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connectedApi, setConnectedApi] = useState<ConnectedAPI | null>(null);

  const connect = useCallback(async () => {
    setStatus("connecting");
    setError(null);
    try {
      const wallet = findCompatibleWallet();
      if (!wallet) {
        throw new Error("No Midnight wallet found. Is the Lace extension installed and unlocked?");
      }
      const api = await wallet.connect(NETWORK_ID);
      const connectionStatus = await api.getConnectionStatus();
      if (connectionStatus.status !== "connected") {
        throw new Error("Wallet did not confirm the connection. Did you approve it in Lace?");
      }
      const { unshieldedAddress } = await api.getUnshieldedAddress();
      setConnectedApi(api);
      setAddress(unshieldedAddress);
      setStatus("connected");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Failed to connect to wallet");
    }
  }, []);

  const disconnect = useCallback(() => {
    setConnectedApi(null);
    setAddress(null);
    setStatus("disconnected");
    setError(null);
  }, []);

  return { status, address, error, connectedApi, connect, disconnect, networkId: NETWORK_ID };
}

export type Wallet = ReturnType<typeof useWallet>;

async function buildProviders(connectedApi: ConnectedAPI) {
  const config = await connectedApi.getConfiguration();
  const zkConfigProvider = new FetchZkConfigProvider(window.location.origin, fetch.bind(window));
  const { shieldedCoinPublicKey, shieldedEncryptionPublicKey } = await connectedApi.getShieldedAddresses();

  return {
    privateStateProvider: inMemoryPrivateStateProvider(),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(config.proverServerUri ?? "http://127.0.0.1:6300", zkConfigProvider),
    publicDataProvider: indexerPublicDataProvider(config.indexerUri, config.indexerWsUri),
    walletProvider: {
      getCoinPublicKey: () => shieldedCoinPublicKey,
      getEncryptionPublicKey: () => shieldedEncryptionPublicKey,
      balanceTx: async (tx: { serialize: () => Uint8Array }) => {
        const { tx: balanced } = await connectedApi.balanceUnsealedTransaction(toHex(tx.serialize()));
        return Transaction.deserialize("signature", "proof", "binding", fromHex(balanced));
      },
    },
    midnightProvider: {
      submitTx: async (tx: Transaction<SignatureEnabled, Proof, Binding>) => {
        await connectedApi.submitTransaction(toHex(tx.serialize()));
        return tx.identifiers()[0];
      },
    },
  };
}

function readTallies(ledgerState: SurveyContract.Ledger): [bigint, bigint, bigint][] {
  return [
    [ledgerState.tallyQ1A, ledgerState.tallyQ1B, ledgerState.tallyQ1C],
    [ledgerState.tallyQ2A, ledgerState.tallyQ2B, ledgerState.tallyQ2C],
    [ledgerState.tallyQ3A, ledgerState.tallyQ3B, ledgerState.tallyQ3C],
    [ledgerState.tallyQ4A, ledgerState.tallyQ4B, ledgerState.tallyQ4C],
  ];
}

// Ledger reads don't need proof generation, only the indexer, so a survey
// can be checked without spinning up the full provider stack.
export async function readSurveyLedger(connectedApi: ConnectedAPI, contractAddress: string): Promise<SurveyLedgerView | null> {
  const config = await connectedApi.getConfiguration();
  const publicDataProvider = indexerPublicDataProvider(config.indexerUri, config.indexerWsUri);
  const state = await publicDataProvider.queryContractState(contractAddress);
  if (!state) return null;
  const ledgerState = SurveyContract.ledger(state.data);
  return {
    questionCount: Number(ledgerState.questionCount),
    tallies: readTallies(ledgerState),
    responseCount: ledgerState.responseCount,
    revealThreshold: ledgerState.revealThreshold,
    revealed: ledgerState.responseCount >= ledgerState.revealThreshold,
  };
}

// ---------- Per-survey contract interaction ----------

export function useSurveyContract(wallet: Wallet, initialContractAddress?: string) {
  const [contractAddress, setContractAddress] = useState<string | undefined>(
    initialContractAddress ?? DEFAULT_CONTRACT_ADDRESS,
  );
  const [submitting, setSubmitting] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [memberKeyHex, setMemberKeyHex] = useState<string | null>(() => {
    if (!contractAddress) return null;
    const key = getLocalMemberKey(contractAddress);
    return key ? toHex(key) : null;
  });
  const [hasResponded, setHasResponded] = useState<boolean>(
    () => !!contractAddress && localStorage.getItem(respondedStorageKey(contractAddress)) === "true",
  );

  const setMemberKey = useCallback(
    (hex: string) => {
      if (!contractAddress) return;
      localStorage.setItem(memberKeyStorageKey(contractAddress), hex.trim());
      setMemberKeyHex(hex.trim());
    },
    [contractAddress],
  );

  const compiledContract = useMemo(() => {
    const witnesses = {
      secretKey: ({ privateState }: { privateState: { secretKey: Uint8Array } }) => [
        privateState,
        privateState.secretKey,
      ],
    };
    return CompiledContract.make("survey", SurveyContract.Contract).pipe(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      CompiledContract.withWitnesses(witnesses as any),
    );
  }, []);

  // answers is always 4 slots long, NO_ANSWER for anything past the
  // survey's real questionCount. One call, one proof, one nullifier check,
  // no matter how many of the 4 questions are real.
  const respond = useCallback(
    async (answers: number[]) => {
      if (!wallet.connectedApi) {
        setError("Connect your wallet first.");
        return;
      }
      if (!contractAddress) {
        setError("No survey to respond to.");
        return;
      }
      const memberKey = getLocalMemberKey(contractAddress);
      if (!memberKey) {
        setError("Enter your access key first.");
        return;
      }
      setSubmitting(true);
      setError(null);
      setLastResult(null);
      try {
        const providers = await buildProviders(wallet.connectedApi);
        const deployed = await findDeployedContract(providers as never, {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          compiledContract: compiledContract as any,
          contractAddress,
          privateStateId: PRIVATE_STATE_ID,
          initialPrivateState: { secretKey: memberKey },
        });
        const padded = Array.from({ length: MAX_QUESTIONS }, (_, i) => BigInt(answers[i] ?? NO_ANSWER));
        const tx = await deployed.callTx.respond(...(padded as [bigint, bigint, bigint, bigint]));
        setLastResult(`Sent. Transaction id: ${tx.public.txId}`);
        localStorage.setItem(respondedStorageKey(contractAddress), "true");
        setHasResponded(true);
      } catch (e) {
        const raw = e instanceof Error ? e.message : `Failed to send your answer`;
        setError(humanizeError(raw));
      } finally {
        setSubmitting(false);
      }
    },
    [contractAddress, compiledContract, wallet.connectedApi],
  );

  const readLedger = useCallback(async (): Promise<SurveyLedgerView | null> => {
    if (!contractAddress || !wallet.connectedApi) return null;
    return readSurveyLedger(wallet.connectedApi, contractAddress);
  }, [contractAddress, wallet.connectedApi]);

  // Deploys a brand new survey: generates a fresh access key for every
  // member slot, hashes each one the same way the contract does, and
  // deploys with those hashes baked in. The keys themselves never leave
  // this browser except in the list handed back to the caller, nothing
  // is sent anywhere but the hashes.
  const createSurvey = useCallback(
    async (memberCount: number, questionCount: number, revealThreshold: number): Promise<{ contractAddress: string; memberKeys: string[] } | null> => {
      if (!wallet.connectedApi) {
        setError("Connect your wallet first.");
        return null;
      }
      setDeploying(true);
      setError(null);
      try {
        const providers = await buildProviders(wallet.connectedApi);
        const realKeys = Array.from({ length: memberCount }, () => crypto.getRandomValues(new Uint8Array(32)));
        const paddingKeys = Array.from({ length: ROSTER_SIZE - memberCount }, () => crypto.getRandomValues(new Uint8Array(32)));
        const allKeys = [...realKeys, ...paddingKeys];
        const commitments = allKeys.map(commitmentOf);

        const deployed = await deployContract(providers as never, {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          compiledContract: compiledContract as any,
          args: [...commitments, BigInt(questionCount), BigInt(revealThreshold)],
          privateStateId: PRIVATE_STATE_ID,
          initialPrivateState: { secretKey: allKeys[0] },
        });

        const newAddress = deployed.deployTxData.public.contractAddress;
        setContractAddress(newAddress);
        return { contractAddress: newAddress, memberKeys: realKeys.map(toHex) };
      } catch (e) {
        const raw = e instanceof Error ? e.message : "Failed to create the survey";
        setError(humanizeError(raw));
        return null;
      } finally {
        setDeploying(false);
      }
    },
    [compiledContract, wallet.connectedApi],
  );

  return {
    contractAddress,
    setContractAddress,
    submitting,
    deploying,
    error,
    lastResult,
    memberKeyHex,
    hasResponded,
    setMemberKey,
    respond,
    readLedger,
    createSurvey,
  };
}

// ---------- Local history (this browser only) ----------

export interface SurveyQuestion {
  text: string;
  options: [string, string, string];
}

export interface CreatedSurveyRecord {
  address: string;
  questions: SurveyQuestion[];
  people: number;
  threshold: number;
  createdAt: string;
}

export interface AnsweredSurveyRecord {
  address: string;
  questions: SurveyQuestion[];
  answeredAt: string;
}

const CREATED_HISTORY_KEY = "unsourced:history:created";
const ANSWERED_HISTORY_KEY = "unsourced:history:answered";

function readHistory<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

export function getCreatedHistory(): CreatedSurveyRecord[] {
  return readHistory<CreatedSurveyRecord>(CREATED_HISTORY_KEY);
}

export function recordCreatedSurvey(record: CreatedSurveyRecord): void {
  const list = [record, ...getCreatedHistory().filter((r) => r.address !== record.address)];
  localStorage.setItem(CREATED_HISTORY_KEY, JSON.stringify(list));
}

export function getAnsweredHistory(): AnsweredSurveyRecord[] {
  return readHistory<AnsweredSurveyRecord>(ANSWERED_HISTORY_KEY);
}

export function recordAnsweredSurvey(record: AnsweredSurveyRecord): void {
  const list = [record, ...getAnsweredHistory().filter((r) => r.address !== record.address)];
  localStorage.setItem(ANSWERED_HISTORY_KEY, JSON.stringify(list));
}

// ---------- Share-link payload ----------
// Question text and option labels never touch the chain, only their
// count and which option was picked do. The link carries the wording so
// whoever opens it sees real questions instead of "Option A/B/C".

export function encodeShareData(questions: SurveyQuestion[]): string {
  const json = JSON.stringify({ questions });
  return btoa(unescape(encodeURIComponent(json)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function decodeShareData(encoded: string): SurveyQuestion[] | null {
  try {
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(escape(atob(base64)));
    const parsed = JSON.parse(json) as { questions: SurveyQuestion[] };
    return parsed.questions;
  } catch {
    return null;
  }
}
