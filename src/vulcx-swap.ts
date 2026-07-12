import { VulcxSDK } from "@vulcx/sdk";
import type { Chain, QuoteResponse, SwapResponse } from "@vulcx/sdk";
import { WIDGET_CSS } from "./ui/styles";
import { Store, createInitialState } from "./state/store";
import type { WidgetState, TokenInfo, SelectorTarget } from "./state/store";
import { formatAmount, shortenAddress } from "./utils/format";
import { getNativeBalance, getTokenBalances, NATIVE_SOL_MINT } from "./utils/rpc";

const DEBOUNCE_MS = 400;
const DEFAULT_RPC = "https://mainnet.fogo.io/";

const SWAP_ICON_SVG = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4v16M7 20l-3-3m3 3l3-3M17 20V4m0 0l-3 3m3-3l3 3"/></svg>`;
const CHEVRON_SVG = `<svg class="badge-chevron" viewBox="0 0 12 8" fill="currentColor"><path d="M1.4 1.4L6 6l4.6-4.6"/></svg>`;
const WALLET_SVG = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20"/><circle cx="17" cy="14" r="1.5"/></svg>`;
const COPY_SVG = `<svg class="tli-copy" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>`;
const CLOSE_SVG = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>`;
const TAG_SVG = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M2 4a2 2 0 012-2h5.586a2 2 0 011.414.586l9.414 9.414a2 2 0 010 2.828l-5.586 5.586a2 2 0 01-2.828 0L2.586 11A2 2 0 012 9.586V4zm4.5 3a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/></svg>`;

const POPULAR_MINTS = [
  "So11111111111111111111111111111111111111112",
  "uSd2czE61Evaf76RNbq4KPpXnkiL3irdzgLFUMe3NoG",
];

export class VulcxSwapElement extends HTMLElement {
  private shadow: ShadowRoot;
  private sdk!: VulcxSDK;
  private store!: Store;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private unsubscribe: (() => void) | null = null;
  private mounted = false;
  private rpcUrl = DEFAULT_RPC;
  private quoteDetailOpen = false;

  static get observedAttributes(): string[] {
    return [
      "api-key", "chain", "base-url",
      "default-input-mint", "default-output-mint",
      "theme", "rpc-url",
    ];
  }

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
  }

  connectedCallback(): void {
    const apiKey = this.getAttribute("api-key") || "";
    const chain = (this.getAttribute("chain") as Chain) || "solana";
    const baseUrl = this.getAttribute("base-url") || undefined;
    const inputMint = this.getAttribute("default-input-mint") || "";
    const outputMint = this.getAttribute("default-output-mint") || "";
    this.rpcUrl = this.getAttribute("rpc-url") || DEFAULT_RPC;

    this.sdk = new VulcxSDK({ apiKey, chain, baseUrl });
    this.store = new Store(createInitialState(inputMint, outputMint));
    this.unsubscribe = this.store.subscribe(() => this.update());
    this.mount();
    this.loadTokenList();
  }

  disconnectedCallback(): void {
    this.unsubscribe?.();
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.mounted = false;
  }

  attributeChangedCallback(): void {
    if (!this.store) return;
    const apiKey = this.getAttribute("api-key") || "";
    const chain = (this.getAttribute("chain") as Chain) || "solana";
    const baseUrl = this.getAttribute("base-url") || undefined;
    this.rpcUrl = this.getAttribute("rpc-url") || DEFAULT_RPC;
    this.sdk = new VulcxSDK({ apiKey, chain, baseUrl });
  }

  private emit(name: string, detail: unknown): void {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }

  private async loadTokenList(): Promise<void> {
    try {
      const baseUrl = this.getAttribute("base-url") || "https://api.vulcx.xyz";
      const res = await fetch(`${baseUrl}/api/v1/tokens`);
      if (!res.ok) return;
      const data = await res.json();
      const map = new Map<string, TokenInfo>();
      for (const t of data.tokens || []) {
        map.set(t.mint, t);
      }
      this.store.setState({ tokenMap: map });
    } catch { /* silent */ }
  }

  private async loadBalances(): Promise<void> {
    const { walletAddress, inputMint, outputMint } = this.store.getState();
    if (!walletAddress) return;

    try {
      const [nativeBal, tokenBals] = await Promise.all([
        getNativeBalance(this.rpcUrl, walletAddress),
        getTokenBalances(this.rpcUrl, walletAddress),
      ]);

      let inputBal = "0";
      let outputBal = "0";
      let inputDec = 9;
      let outputDec = 9;

      const tokenMap = this.store.getState().tokenMap;

      if (inputMint === NATIVE_SOL_MINT) {
        inputBal = nativeBal;
        inputDec = 9;
      } else if (tokenBals.has(inputMint)) {
        const b = tokenBals.get(inputMint)!;
        inputBal = b.amount;
        inputDec = b.decimals;
      }
      if (tokenMap.has(inputMint)) inputDec = tokenMap.get(inputMint)!.decimals;

      if (outputMint === NATIVE_SOL_MINT) {
        outputBal = nativeBal;
        outputDec = 9;
      } else if (tokenBals.has(outputMint)) {
        const b = tokenBals.get(outputMint)!;
        outputBal = b.amount;
        outputDec = b.decimals;
      }
      if (tokenMap.has(outputMint)) outputDec = tokenMap.get(outputMint)!.decimals;

      this.store.setState({
        inputBalance: inputBal,
        outputBalance: outputBal,
        inputDecimals: inputDec,
        outputDecimals: outputDec,
        allBalances: tokenBals,
        nativeBalance: nativeBal,
      });
    } catch { /* silent */ }
  }

  private async fetchQuote(): Promise<void> {
    const { inputMint, outputMint, inputAmount, slippageBps } = this.store.getState();
    if (!inputMint || !outputMint || !inputAmount || inputAmount === "0") {
      this.store.setState({ quote: null, outputAmount: "", status: "idle" });
      return;
    }
    this.store.setState({ status: "quoting", error: "" });
    try {
      const quote = await this.sdk.quote({
        inputMint, outputMint, amount: inputAmount,
        swapMode: "ExactIn", slippageBps,
      });
      this.store.setState({ quote, outputAmount: quote.amountOut, status: "idle" });
      this.emit("quote-update", quote);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Quote failed";
      this.store.setState({ status: "error", error: msg, quote: null, outputAmount: "" });
    }
  }

  private debouncedQuote(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.fetchQuote(), DEBOUNCE_MS);
  }

  private async executeSwap(): Promise<void> {
    const { inputMint, outputMint, inputAmount, slippageBps, walletAddress } = this.store.getState();
    if (!walletAddress) { this.store.setState({ error: "Connect wallet first" }); return; }
    this.store.setState({ status: "swapping", error: "" });
    this.emit("swap-initiated", { inputMint, outputMint, amount: inputAmount });
    try {
      const result: SwapResponse = await this.sdk.swap({
        userWallet: walletAddress, inputMint, outputMint,
        amount: inputAmount, swapMode: "ExactIn", slippageBps,
      });
      this.store.setState({ status: "success" });
      this.emit("swap-complete", result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Swap failed";
      this.store.setState({ status: "error", error: msg });
      this.emit("swap-error", { error: msg });
    }
  }

  private handleSwapDirection(): void {
    const { inputMint, outputMint, inputBalance, outputBalance, inputDecimals, outputDecimals } = this.store.getState();
    this.store.setState({
      inputMint: outputMint, outputMint: inputMint,
      inputAmount: "", outputAmount: "", quote: null, status: "idle",
      inputBalance: outputBalance, outputBalance: inputBalance,
      inputDecimals: outputDecimals, outputDecimals: inputDecimals,
    });
  }

  public setWallet(address: string): void {
    this.store.setState({ walletAddress: address });
    if (address) this.loadBalances();
  }

  private getTokenInfo(mint: string): TokenInfo | undefined {
    return this.store.getState().tokenMap.get(mint);
  }

  private renderBadge(mint: string): string {
    const info = this.getTokenInfo(mint);
    if (info) {
      return `<img class="token-icon" src="${info.logoURI}" alt="${info.symbol}" onerror="this.style.display='none'"/><span>${info.symbol}</span>${CHEVRON_SVG}`;
    }
    if (!mint) return `<span>Select</span>${CHEVRON_SVG}`;
    const short = mint.length > 8 ? mint.slice(0, 4) + "..." + mint.slice(-4) : mint;
    return `<div class="token-icon-placeholder"></div><span>${short}</span>${CHEVRON_SVG}`;
  }

  private getButtonText(state: WidgetState): string {
    if (!state.walletAddress) return "Connect";
    if (state.status === "quoting") return "Fetching Quote...";
    if (state.status === "swapping") return "Swapping...";
    if (!state.inputAmount) return "Enter Amount";
    if (!state.inputMint || !state.outputMint) return "Select Tokens";
    return "Swap";
  }

  private isButtonDisabled(state: WidgetState): boolean {
    if (!state.walletAddress) return false;
    return state.status === "quoting" || state.status === "swapping" || !state.inputAmount || !state.inputMint || !state.outputMint;
  }

  private renderQuoteInfoHTML(quote: QuoteResponse): string {
    const fee = (quote.feeBps / 100).toFixed(quote.feeBps % 100 === 0 ? 0 : 1);
    const pools = quote.routes.map(r => r.poolType);
    const uniquePools = [...new Set(pools)];
    const moreCount = uniquePools.length > 2 ? uniquePools.length - 2 : 0;
    const shown = uniquePools.slice(0, 2).join(", ");
    const routeText = moreCount > 0 ? `via ${shown} & ${moreCount} more` : `via ${shown}`;

    const impactClass = (quote.priceImpactSeverity === "high" || quote.priceImpactSeverity === "extreme")
      ? "impact-high" : quote.priceImpactSeverity === "moderate" ? "impact-warning" : "";

    let html = `
      <div class="quote-bar" id="quote-bar">
        <span class="quote-bar-tag">${TAG_SVG} Quotes</span>
        <span class="quote-bar-fee">${fee} %</span>
        <span class="quote-bar-route">${routeText}</span>
        <span class="quote-bar-info">i</span>
      </div>`;

    if (this.quoteDetailOpen) {
      html += `
      <div class="quote-detail">
        <div class="quote-detail-row"><span class="quote-detail-label">Price Impact</span><span class="${impactClass}">${quote.priceImpactPercent}</span></div>
        <div class="quote-detail-row"><span class="quote-detail-label">Route</span><span>${quote.hopCount} hop${quote.hopCount > 1 ? "s" : ""} via ${pools.join(" → ")}</span></div>
        <div class="quote-detail-row"><span class="quote-detail-label">Fee</span><span>${fee}%</span></div>
        <div class="quote-detail-row"><span class="quote-detail-label">Min Received</span><span>${quote.otherAmountThreshold}</span></div>
      </div>`;
    }

    return html;
  }

  private formatBalance(raw: string, decimals: number, symbol: string): string {
    const formatted = formatAmount(raw, decimals);
    return `${formatted} ${symbol}`;
  }

  private getTokenBalance(mint: string): { amount: string; decimals: number } {
    const state = this.store.getState();
    if (mint === NATIVE_SOL_MINT) return { amount: state.nativeBalance, decimals: 9 };
    const bal = state.allBalances.get(mint);
    if (bal) return bal;
    const info = state.tokenMap.get(mint);
    return { amount: "0", decimals: info?.decimals ?? 9 };
  }

  private getFilteredTokens(): TokenInfo[] {
    const state = this.store.getState();
    const search = state.selectorSearch.toLowerCase().trim();
    const tokens = Array.from(state.tokenMap.values());
    if (!search) return tokens;
    return tokens.filter(t =>
      t.symbol.toLowerCase().includes(search) ||
      t.name.toLowerCase().includes(search) ||
      t.mint.toLowerCase().includes(search)
    );
  }

  private openSelector(target: SelectorTarget): void {
    this.store.setState({ selectorOpen: target, selectorSearch: "" });
    this.renderModal();
  }

  private closeSelector(): void {
    this.store.setState({ selectorOpen: null, selectorSearch: "" });
    const overlay = this.shadow.querySelector("#token-modal") as HTMLElement | null;
    if (overlay) overlay.remove();
  }

  private selectToken(mint: string): void {
    const target = this.store.getState().selectorOpen;
    if (!target) return;

    const bal = this.getTokenBalance(mint);
    const info = this.store.getState().tokenMap.get(mint);
    const decimals = info?.decimals ?? bal.decimals;

    if (target === "input") {
      this.store.setState({
        inputMint: mint,
        inputBalance: bal.amount,
        inputDecimals: decimals,
        inputAmount: "",
        outputAmount: "",
        quote: null,
      });
    } else {
      this.store.setState({
        outputMint: mint,
        outputBalance: bal.amount,
        outputDecimals: decimals,
        outputAmount: "",
        quote: null,
      });
    }
    this.closeSelector();
  }

  private renderModal(): void {
    let overlay = this.shadow.querySelector("#token-modal") as HTMLElement | null;
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "token-modal";
      overlay.className = "modal-overlay";
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) this.closeSelector();
      });
      this.shadow.appendChild(overlay);
    }

    const state = this.store.getState();
    const filtered = this.getFilteredTokens();

    const popularChips = POPULAR_MINTS
      .map(m => state.tokenMap.get(m))
      .filter((t): t is TokenInfo => !!t);

    const allPopular = Array.from(state.tokenMap.values())
      .filter(t => !POPULAR_MINTS.includes(t.mint))
      .slice(0, 3);
    const chips = [...popularChips, ...allPopular];

    const chipsHTML = chips.map(t =>
      `<button class="popular-chip" data-mint="${t.mint}"><img src="${t.logoURI}" alt="${t.symbol}" onerror="this.style.display='none'"/>${t.symbol}</button>`
    ).join("");

    const listHTML = filtered.length === 0
      ? `<div class="token-list-empty">No tokens found</div>`
      : filtered.map(t => {
          const bal = this.getTokenBalance(t.mint);
          const balDisplay = formatAmount(bal.amount, bal.decimals);
          const addr = shortenAddress(t.mint);
          const icon = t.logoURI
            ? `<img class="tli-icon" src="${t.logoURI}" alt="${t.symbol}" onerror="this.className='tli-icon-placeholder'"/>`
            : `<div class="tli-icon-placeholder"></div>`;
          return `<div class="token-list-item" data-mint="${t.mint}">
            ${icon}
            <div class="tli-info">
              <div class="tli-symbol">${t.symbol}</div>
              <div class="tli-name">${t.name}</div>
              <div class="tli-address"><span>${addr}</span> <span class="tli-copy-btn" data-addr="${t.mint}">${COPY_SVG}</span></div>
            </div>
            <div class="tli-balance">
              <div class="tli-balance-amount">${balDisplay}</div>
              <div class="tli-balance-usd">$0.00</div>
            </div>
          </div>`;
        }).join("");

    overlay.innerHTML = `
      <div class="modal-panel">
        <button class="modal-close" id="modal-close">${CLOSE_SVG}</button>
        <input class="modal-search" type="text" placeholder="Search for a token or address" id="modal-search" value="${state.selectorSearch}" />
        <div class="popular-chips" id="popular-chips">${chipsHTML}</div>
        <div class="token-list" id="token-list">${listHTML}</div>
      </div>
    `;

    this.bindModalEvents(overlay);

    const searchInput = overlay.querySelector("#modal-search") as HTMLInputElement | null;
    if (searchInput) searchInput.focus();
  }

  private bindModalEvents(overlay: HTMLElement): void {
    const closeBtn = overlay.querySelector("#modal-close");
    if (closeBtn) closeBtn.addEventListener("click", () => this.closeSelector());

    const searchInput = overlay.querySelector("#modal-search") as HTMLInputElement | null;
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        this.store.setState({ selectorSearch: searchInput.value });
        this.renderModal();
      });
    }

    overlay.querySelectorAll(".popular-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        const mint = (chip as HTMLElement).dataset.mint;
        if (mint) this.selectToken(mint);
      });
    });

    overlay.querySelectorAll(".token-list-item").forEach(item => {
      item.addEventListener("click", (e) => {
        if ((e.target as HTMLElement).closest(".tli-copy-btn")) return;
        const mint = (item as HTMLElement).dataset.mint;
        if (mint) this.selectToken(mint);
      });
    });

    overlay.querySelectorAll(".tli-copy-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const addr = (btn as HTMLElement).dataset.addr;
        if (addr) navigator.clipboard?.writeText(addr);
      });
    });
  }

  private mount(): void {
    const state = this.store.getState();
    const inputInfo = this.getTokenInfo(state.inputMint);
    const outputInfo = this.getTokenInfo(state.outputMint);
    const inputSymbol = inputInfo?.symbol || "Token";
    const outputSymbol = outputInfo?.symbol || "Token";

    this.shadow.innerHTML = `
      <style>${WIDGET_CSS}</style>
      <div class="swap-container">

        <div class="token-panel">
          <div class="token-panel-label">You're selling</div>
          <div class="token-row">
            <input class="amount-input" type="text" inputmode="decimal" placeholder="0.00" value="${state.inputAmount}" id="input-amount" />
            <div class="token-badge" id="select-input">${this.renderBadge(state.inputMint)}</div>
          </div>
          <div class="usd-value" id="input-usd">$0.00</div>
          <div class="balance-row">
            <span class="balance-label">${WALLET_SVG}<span id="input-balance-label">${this.formatBalance(state.inputBalance, state.inputDecimals, inputSymbol)}</span></span>
            <div class="balance-actions">
              <button class="half-max-btn" id="btn-half">HALF</button>
              <button class="half-max-btn" id="btn-max">MAX</button>
            </div>
          </div>
        </div>

        <div class="swap-direction">
          <button class="swap-direction-btn" id="swap-direction">${SWAP_ICON_SVG}</button>
        </div>

        <div class="token-panel">
          <div class="token-panel-label">To buy</div>
          <div class="token-row">
            <input class="amount-input" type="text" placeholder="0.00" value="${state.outputAmount}" disabled id="output-amount" />
            <div class="token-badge" id="select-output">${this.renderBadge(state.outputMint)}</div>
          </div>
          <div class="usd-value" id="output-usd">$0.00</div>
          <div class="balance-row">
            <span class="balance-label">${WALLET_SVG}<span id="output-balance-label">${this.formatBalance(state.outputBalance, state.outputDecimals, outputSymbol)}</span></span>
            <div class="balance-actions">
              <button class="half-max-btn" id="btn-half-out">HALF</button>
              <button class="half-max-btn" id="btn-max-out">MAX</button>
            </div>
          </div>
        </div>

        <button class="swap-btn" id="swap-btn">${this.getButtonText(state)}</button>
        <div id="quote-info"></div>
        <div id="status-msg"></div>
      </div>
    `;

    this.bindEvents();
    this.mounted = true;
  }

  private bindEvents(): void {
    this.$("#input-amount", (el: HTMLInputElement) => {
      el.oninput = () => {
        const val = el.value.replace(/[^0-9.]/g, "");
        if (val !== el.value) el.value = val;
        this.store.setState({ inputAmount: val });
        this.debouncedQuote();
      };
    });

    this.$("#select-input", el => { el.onclick = () => this.openSelector("input"); });
    this.$("#select-output", el => { el.onclick = () => this.openSelector("output"); });

    this.$("#swap-direction", el => { el.onclick = () => this.handleSwapDirection(); });

    this.$("#swap-btn", el => {
      el.onclick = () => {
        const s = this.store.getState();
        if (!s.walletAddress) this.emit("connect-wallet", {});
        else this.executeSwap();
      };
    });

    this.$("#btn-half", el => {
      el.onclick = () => {
        const { inputBalance, inputDecimals } = this.store.getState();
        const half = (BigInt(inputBalance || "0") / 2n).toString();
        const display = formatAmount(half, inputDecimals);
        this.store.setState({ inputAmount: half });
        this.$<HTMLInputElement>("#input-amount", inp => { inp.value = display; });
        this.debouncedQuote();
      };
    });

    this.$("#btn-max", el => {
      el.onclick = () => {
        const { inputBalance, inputDecimals } = this.store.getState();
        const display = formatAmount(inputBalance, inputDecimals);
        this.store.setState({ inputAmount: inputBalance });
        this.$<HTMLInputElement>("#input-amount", inp => { inp.value = display; });
        this.debouncedQuote();
      };
    });
  }

  private update(): void {
    if (!this.mounted) return;
    const state = this.store.getState();
    const inputInfo = this.getTokenInfo(state.inputMint);
    const outputInfo = this.getTokenInfo(state.outputMint);
    const inputSymbol = inputInfo?.symbol || "Token";
    const outputSymbol = outputInfo?.symbol || "Token";

    this.$<HTMLInputElement>("#input-amount", el => {
      if (this.shadow.activeElement !== el) el.value = state.inputAmount;
    });
    this.$<HTMLInputElement>("#output-amount", el => { el.value = state.outputAmount; });

    this.$("#select-input", el => { el.innerHTML = this.renderBadge(state.inputMint); });
    this.$("#select-output", el => { el.innerHTML = this.renderBadge(state.outputMint); });

    this.$("#input-balance-label", el => {
      el.textContent = this.formatBalance(state.inputBalance, state.inputDecimals, inputSymbol);
    });
    this.$("#output-balance-label", el => {
      el.textContent = this.formatBalance(state.outputBalance, state.outputDecimals, outputSymbol);
    });

    const btnText = this.getButtonText(state);
    const btnDisabled = this.isButtonDisabled(state);
    const showSpinner = state.status === "quoting" || state.status === "swapping";

    this.$<HTMLButtonElement>("#swap-btn", el => {
      el.innerHTML = showSpinner ? `<span class="loading-spinner"></span>${btnText}` : btnText;
      el.disabled = btnDisabled;
    });

    this.$("#quote-info", el => {
      el.innerHTML = state.quote ? this.renderQuoteInfoHTML(state.quote) : "";
      const bar = el.querySelector("#quote-bar");
      if (bar) {
        bar.addEventListener("click", () => {
          this.quoteDetailOpen = !this.quoteDetailOpen;
          this.update();
        });
      }
    });

    this.$("#status-msg", el => {
      if (state.status === "error") el.innerHTML = `<div class="error-msg">${state.error}</div>`;
      else if (state.status === "success") el.innerHTML = `<div class="success-msg">Swap successful!</div>`;
      else el.innerHTML = "";
    });
  }

  private $<T extends HTMLElement = HTMLElement>(sel: string, fn: (el: T) => void): void {
    const el = this.shadow.querySelector(sel) as T | null;
    if (el) fn(el);
  }
}
