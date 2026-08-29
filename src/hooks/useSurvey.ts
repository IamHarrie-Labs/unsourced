// Wallet connection + survey contract interaction — both joining an
// existing survey and deploying a brand new one from the browser. No CLI
// step required: whoever creates a survey does it by clicking a button
// here, using their own connected wallet to pay for the deploy.

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
    return "That key has already been used to answer this survey — one answer per person.";
  }
  if (raw.includes("disconnected from") || raw.includes("ECONNREFUSED")) {
    return "Lost the connection partway through. This usually clears up — try again.";
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

export type SurveyOption = "respondA" | "respondB" | "respondC";

export interface SurveyLedgerView {
  tallyA: bigint;
  tallyB: bigint;
  tallyC: bigint;
  responseCount: bigint;
  revealThreshold: bigint;
  revealed: boolean;
}

type WalletStatus = "disconnected" | "connecting" | "connected" | "error";

export function useSurvey(initialContractAddress?: string) {
  const [contractAddress, setContractAddress] = useState<string | undefined>(
    initialContractAddress ?? DEFAULT_CONTRACT_ADDRESS,
  );
  const [status, setStatus] = useState<WalletStatus>("disconnected");
  const [address, setAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connectedApi, setConnectedApi] = useState<ConnectedAPI | null>(null);
  const [busyOption, setBusyOption] = useState<SurveyOption | null>(null);
  const [deploying, setDeploying] = useState(false);
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

  const getProviders = useCallback(async () => {
    if (!connectedApi) throw new Error("Wallet not connected");
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
  }, [connectedApi]);

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

  const respond = useCallback(
    async (option: SurveyOption) => {
      if (!contractAddress) {
        setError("No survey to respond to.");
        return;
      }
      const memberKey = getLocalMemberKey(contractAddress);
      if (!memberKey) {
        setError("Enter your access key first.");
        return;
      }
      setBusyOption(option);
      setError(null);
      setLastResult(null);
      try {
        const providers = await getProviders();
        const deployed = await findDeployedContract(providers as never, {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          compiledContract: compiledContract as any,
          contractAddress,
          privateStateId: PRIVATE_STATE_ID,
          initialPrivateState: { secretKey: memberKey },
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tx = await (deployed.callTx as any)[option]();
        setLastResult(`Sent. Transaction id: ${tx.public.txId}`);
        localStorage.setItem(respondedStorageKey(contractAddress), "true");
        setHasResponded(true);
      } catch (e) {
        const raw = e instanceof Error ? e.message : `Failed to send your answer`;
        setError(humanizeError(raw));
      } finally {
        setBusyOption(null);
      }
    },
    [contractAddress, compiledContract, getProviders],
  );

  const readLedger = useCallback(async (): Promise<SurveyLedgerView | null> => {
    if (!contractAddress) return null;
    const providers = await getProviders();
    const state = await providers.publicDataProvider.queryContractState(contractAddress);
    if (!state) return null;
    const ledgerState = SurveyContract.ledger(state.data);
    return {
      tallyA: ledgerState.tallyA,
      tallyB: ledgerState.tallyB,
      tallyC: ledgerState.tallyC,
      responseCount: ledgerState.responseCount,
      revealThreshold: ledgerState.revealThreshold,
      revealed: ledgerState.responseCount >= ledgerState.revealThreshold,
    };
  }, [contractAddress, getProviders]);

  // Deploys a brand new survey: generates a fresh access key for every
  // member slot, hashes each one the same way the contract does, and
  // deploys with those hashes baked in. The keys themselves never leave
  // this browser except in the list handed back to the caller — nothing
  // is sent anywhere but the 8 hashes.
  const createSurvey = useCallback(
    async (memberCount: number, revealThreshold: number): Promise<{ contractAddress: string; memberKeys: string[] } | null> => {
      setDeploying(true);
      setError(null);
      try {
        const providers = await getProviders();
        const realKeys = Array.from({ length: memberCount }, () => crypto.getRandomValues(new Uint8Array(32)));
        const paddingKeys = Array.from({ length: ROSTER_SIZE - memberCount }, () => crypto.getRandomValues(new Uint8Array(32)));
        const allKeys = [...realKeys, ...paddingKeys];
        const commitments = allKeys.map(commitmentOf);

        const deployed = await deployContract(providers as never, {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          compiledContract: compiledContract as any,
          args: [...commitments, BigInt(revealThreshold)],
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
    [compiledContract, getProviders],
  );

  return {
    status,
    address,
    error,
    busyOption,
    deploying,
    lastResult,
    memberKeyHex,
    hasResponded,
    setMemberKey,
    connect,
    disconnect,
    respond,
    readLedger,
    createSurvey,
    contractAddress,
    networkId: NETWORK_ID,
  };
}
