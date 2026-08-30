import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
  secretKey(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
}

export type ImpureCircuits<PS> = {
  respond(context: __compactRuntime.CircuitContext<PS>,
          q1_0: bigint,
          q2_0: bigint,
          q3_0: bigint,
          q4_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  respond(context: __compactRuntime.CircuitContext<PS>,
          q1_0: bigint,
          q2_0: bigint,
          q3_0: bigint,
          q4_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  respond(context: __compactRuntime.CircuitContext<PS>,
          q1_0: bigint,
          q2_0: bigint,
          q3_0: bigint,
          q4_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  memberCommitments: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  usedCommitments: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  readonly questionCount: bigint;
  readonly tallyQ1A: bigint;
  readonly tallyQ1B: bigint;
  readonly tallyQ1C: bigint;
  readonly tallyQ2A: bigint;
  readonly tallyQ2B: bigint;
  readonly tallyQ2C: bigint;
  readonly tallyQ3A: bigint;
  readonly tallyQ3B: bigint;
  readonly tallyQ3C: bigint;
  readonly tallyQ4A: bigint;
  readonly tallyQ4B: bigint;
  readonly tallyQ4C: bigint;
  readonly responseCount: bigint;
  readonly revealThreshold: bigint;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>,
               member0_0: Uint8Array,
               member1_0: Uint8Array,
               member2_0: Uint8Array,
               member3_0: Uint8Array,
               member4_0: Uint8Array,
               member5_0: Uint8Array,
               member6_0: Uint8Array,
               member7_0: Uint8Array,
               numQuestions_0: bigint,
               threshold_0: bigint): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
