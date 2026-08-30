import {
  type CircuitContext,
  sampleContractAddress,
  createConstructorContext,
  createCircuitContext,
} from "@midnight-ntwrk/compact-runtime";
import { Contract, type Ledger, ledger } from "../managed/survey/contract/index.js";
import { type SurveyPrivateState, surveyWitnesses } from "../contracts/survey-witnesses.js";

// 255 means "no answer for this slot", used both for questions past
// questionCount and for a real question left unanswered.
export const NO_ANSWER = 255n;

// Thin wrapper mirroring CounterSimulator, sized for the survey's fixed
// 8-member roster and up to 4 questions of 3 options each.
export class SurveySimulator {
  readonly contract: Contract<SurveyPrivateState>;
  circuitContext: CircuitContext<SurveyPrivateState>;

  constructor(members: Uint8Array[], numQuestions: bigint, threshold: bigint, callerSecretKey: Uint8Array) {
    if (members.length !== 8) throw new Error("SurveySimulator needs exactly 8 member commitments");
    this.contract = new Contract<SurveyPrivateState>(surveyWitnesses);
    const { currentPrivateState, currentContractState, currentZswapLocalState } =
      this.contract.initialState(
        createConstructorContext({ secretKey: callerSecretKey }, "0".repeat(64)),
        members[0],
        members[1],
        members[2],
        members[3],
        members[4],
        members[5],
        members[6],
        members[7],
        numQuestions,
        threshold,
      );
    this.circuitContext = createCircuitContext(
      sampleContractAddress(),
      currentZswapLocalState,
      currentContractState,
      currentPrivateState,
    );
  }

  public getLedger(): Ledger {
    return ledger(this.circuitContext.currentQueryContext.state);
  }

  public respond(
    secretKey: Uint8Array,
    answers: [bigint, bigint, bigint, bigint] = [NO_ANSWER, NO_ANSWER, NO_ANSWER, NO_ANSWER],
  ): Ledger {
    this.circuitContext = {
      ...this.circuitContext,
      currentPrivateState: { secretKey },
    };
    this.circuitContext = this.contract.impureCircuits.respond(this.circuitContext, ...answers).context;
    return ledger(this.circuitContext.currentQueryContext.state);
  }
}
