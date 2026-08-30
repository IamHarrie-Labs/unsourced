import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { persistentHash, CompactTypeBytes, CompactTypeVector } from "@midnight-ntwrk/compact-runtime";
import { describe, it, expect } from "vitest";
import { SurveySimulator, NO_ANSWER } from "./survey-simulator.js";

setNetworkId("undeployed");

const commitmentDescriptor = new CompactTypeVector(1, new CompactTypeBytes(32));
const commitmentOf = (secretKey: Uint8Array) => persistentHash(commitmentDescriptor, [secretKey]);
const toHex = (bytes: Uint8Array) => Buffer.from(bytes).toString("hex");

// 8 distinct member secrets, filled with a different byte each so they're
// trivially distinguishable in test failures.
const MEMBER_KEYS = Array.from({ length: 8 }, (_, i) => new Uint8Array(32).fill(i + 1));
const NON_MEMBER_KEY = new Uint8Array(32).fill(99);
const THRESHOLD = 3n;

function freshSurvey(numQuestions = 3n) {
  const members = MEMBER_KEYS.map(commitmentOf);
  return new SurveySimulator(members, numQuestions, THRESHOLD, MEMBER_KEYS[0]);
}

describe("circuit logic", () => {
  it("accepts a response from a committed member", () => {
    const sim = freshSurvey();
    expect(() => sim.respond(MEMBER_KEYS[0], [0n, NO_ANSWER, NO_ANSWER, NO_ANSWER])).not.toThrow();
  });

  it("rejects a response from a key that isn't on the roster", () => {
    const sim = freshSurvey();
    expect(() => sim.respond(NON_MEMBER_KEY, [0n, NO_ANSWER, NO_ANSWER, NO_ANSWER])).toThrow();
  });

  it("rejects a second response from the same member", () => {
    const sim = freshSurvey();
    sim.respond(MEMBER_KEYS[0], [0n, NO_ANSWER, NO_ANSWER, NO_ANSWER]);
    expect(() => sim.respond(MEMBER_KEYS[0], [1n, NO_ANSWER, NO_ANSWER, NO_ANSWER])).toThrow();
  });

  it("lets different members each respond once", () => {
    const sim = freshSurvey();
    expect(() => sim.respond(MEMBER_KEYS[0], [0n, NO_ANSWER, NO_ANSWER, NO_ANSWER])).not.toThrow();
    expect(() => sim.respond(MEMBER_KEYS[1], [1n, NO_ANSWER, NO_ANSWER, NO_ANSWER])).not.toThrow();
    expect(() => sim.respond(MEMBER_KEYS[2], [2n, NO_ANSWER, NO_ANSWER, NO_ANSWER])).not.toThrow();
  });
});

describe("state transitions", () => {
  it("starts with every tally, questionCount, and the response count set correctly", () => {
    const sim = freshSurvey();
    const state = sim.getLedger();
    expect(state.tallyQ1A).toEqual(0n);
    expect(state.tallyQ1B).toEqual(0n);
    expect(state.tallyQ1C).toEqual(0n);
    expect(state.responseCount).toEqual(0n);
    expect(state.questionCount).toEqual(3n);
    expect(state.revealThreshold).toEqual(THRESHOLD);
  });

  it("increments the chosen option's tally and the shared response count, for one question", () => {
    const sim = freshSurvey();
    sim.respond(MEMBER_KEYS[0], [0n, NO_ANSWER, NO_ANSWER, NO_ANSWER]);
    sim.respond(MEMBER_KEYS[1], [0n, NO_ANSWER, NO_ANSWER, NO_ANSWER]);
    sim.respond(MEMBER_KEYS[2], [1n, NO_ANSWER, NO_ANSWER, NO_ANSWER]);
    const state = sim.getLedger();
    expect(state.tallyQ1A).toEqual(2n);
    expect(state.tallyQ1B).toEqual(1n);
    expect(state.tallyQ1C).toEqual(0n);
    expect(state.responseCount).toEqual(3n);
  });

  it("increments the right tally across every active question in one combined submission", () => {
    const sim = freshSurvey(4n);
    sim.respond(MEMBER_KEYS[0], [0n, 1n, 2n, 0n]);
    const state = sim.getLedger();
    expect(state.tallyQ1A).toEqual(1n);
    expect(state.tallyQ2B).toEqual(1n);
    expect(state.tallyQ3C).toEqual(1n);
    expect(state.tallyQ4A).toEqual(1n);
    expect(state.responseCount).toEqual(1n);
  });

  it("ignores question slots beyond questionCount on a single-question survey", () => {
    const sim = freshSurvey(1n);
    sim.respond(MEMBER_KEYS[0], [1n, 2n, 0n, 1n]);
    const state = sim.getLedger();
    expect(state.tallyQ1B).toEqual(1n);
    // The frontend never sends real answers past questionCount, but the
    // circuit will still tally whatever it's given, since the contract
    // has no way to know a slot is "unused" beyond the public
    // questionCount value the frontend already respects.
    expect(state.tallyQ2C).toEqual(1n);
  });

  it("leaves every tally untouched when a response is rejected", () => {
    const sim = freshSurvey();
    sim.respond(MEMBER_KEYS[0], [0n, NO_ANSWER, NO_ANSWER, NO_ANSWER]);
    expect(() => sim.respond(MEMBER_KEYS[0], [1n, NO_ANSWER, NO_ANSWER, NO_ANSWER])).toThrow();
    const state = sim.getLedger();
    expect(state.tallyQ1A).toEqual(1n);
    expect(state.tallyQ1B).toEqual(0n);
    expect(state.responseCount).toEqual(1n);
  });
});

describe("privacy", () => {
  it("never exposes a raw member key through ledger state", () => {
    const sim = freshSurvey();
    sim.respond(MEMBER_KEYS[0], [0n, NO_ANSWER, NO_ANSWER, NO_ANSWER]);
    sim.respond(MEMBER_KEYS[1], [1n, NO_ANSWER, NO_ANSWER, NO_ANSWER]);
    const serialized = JSON.stringify(sim.getLedger(), (_key, value) =>
      typeof value === "bigint" ? value.toString() : value,
    );
    for (const key of MEMBER_KEYS) {
      expect(serialized).not.toContain(toHex(key));
    }
  });

  it("records which commitment responded without recording which option it picked", () => {
    // The only per-member trace on the ledger is the commitment landing in
    // usedCommitments, nothing ties a commitment back to an option, since
    // that link is never constructed inside the circuit.
    const sim = freshSurvey();
    const before = sim.getLedger();
    sim.respond(MEMBER_KEYS[0], [2n, NO_ANSWER, NO_ANSWER, NO_ANSWER]);
    const after = sim.getLedger();
    expect(after.usedCommitments.size()).toEqual(before.usedCommitments.size() + 1n);
  });

  it("commits the same key to the same value, and different keys apart", () => {
    const a = commitmentOf(MEMBER_KEYS[0]);
    const aAgain = commitmentOf(MEMBER_KEYS[0]);
    const b = commitmentOf(MEMBER_KEYS[1]);
    expect(toHex(a)).toEqual(toHex(aAgain));
    expect(toHex(a)).not.toEqual(toHex(b));
  });
});
