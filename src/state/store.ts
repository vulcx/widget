import type { QuoteResponse } from "@vulcx/sdk";

export type WidgetStatus = "idle" | "quoting" | "swapping" | "success" | "error";

export interface TokenInfo {
  mint: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI: string;
}

export type SelectorTarget = "input" | "output" | null;

export interface WidgetState {
  inputMint: string;
  outputMint: string;
  inputAmount: string;
  outputAmount: string;
  slippageBps: number;
  quote: QuoteResponse | null;
  status: WidgetStatus;
  error: string;
  walletAddress: string;
  inputBalance: string;
  outputBalance: string;
  inputDecimals: number;
  outputDecimals: number;
  tokenMap: Map<string, TokenInfo>;
  allBalances: Map<string, { amount: string; decimals: number }>;
  nativeBalance: string;
  selectorOpen: SelectorTarget;
  selectorSearch: string;
}

export type Listener = (state: WidgetState) => void;

export function createInitialState(
  inputMint: string,
  outputMint: string
): WidgetState {
  return {
    inputMint,
    outputMint,
    inputAmount: "",
    outputAmount: "",
    slippageBps: 50,
    quote: null,
    status: "idle",
    error: "",
    walletAddress: "",
    inputBalance: "0",
    outputBalance: "0",
    inputDecimals: 9,
    outputDecimals: 9,
    tokenMap: new Map(),
    allBalances: new Map(),
    nativeBalance: "0",
    selectorOpen: null,
    selectorSearch: "",
  };
}

export class Store {
  private state: WidgetState;
  private listeners: Set<Listener> = new Set();

  constructor(initial: WidgetState) {
    this.state = { ...initial };
  }

  getState(): WidgetState {
    return this.state;
  }

  setState(partial: Partial<WidgetState>): void {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach((fn) => fn(this.state));
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}
