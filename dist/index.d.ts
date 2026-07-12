import { QuoteResponse } from '@vulcx/sdk';

declare class VulcxSwapElement extends HTMLElement {
    private shadow;
    private sdk;
    private store;
    private debounceTimer;
    private unsubscribe;
    private mounted;
    private rpcUrl;
    private quoteDetailOpen;
    static get observedAttributes(): string[];
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(): void;
    private emit;
    private loadTokenList;
    private loadBalances;
    private fetchQuote;
    private debouncedQuote;
    private executeSwap;
    private handleSwapDirection;
    setWallet(address: string): void;
    private getTokenInfo;
    private renderBadge;
    private getButtonText;
    private isButtonDisabled;
    private renderQuoteInfoHTML;
    private formatBalance;
    private getTokenBalance;
    private getFilteredTokens;
    private openSelector;
    private closeSelector;
    private selectToken;
    private renderModal;
    private bindModalEvents;
    private mount;
    private bindEvents;
    private update;
    private $;
}

type WidgetStatus = "idle" | "quoting" | "swapping" | "success" | "error";
interface TokenInfo {
    mint: string;
    symbol: string;
    name: string;
    decimals: number;
    logoURI: string;
}
type SelectorTarget = "input" | "output" | null;
interface WidgetState {
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

export { VulcxSwapElement };
export type { TokenInfo, WidgetState, WidgetStatus };
