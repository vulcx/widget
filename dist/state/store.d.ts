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
    allBalances: Map<string, {
        amount: string;
        decimals: number;
    }>;
    nativeBalance: string;
    selectorOpen: SelectorTarget;
    selectorSearch: string;
}
export type Listener = (state: WidgetState) => void;
export declare function createInitialState(inputMint: string, outputMint: string): WidgetState;
export declare class Store {
    private state;
    private listeners;
    constructor(initial: WidgetState);
    getState(): WidgetState;
    setState(partial: Partial<WidgetState>): void;
    subscribe(fn: Listener): () => void;
}
