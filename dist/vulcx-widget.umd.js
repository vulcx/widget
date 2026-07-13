(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.VulcxWidget = {}));
})(this, (function (exports) { 'use strict';

    class VulcxError extends Error {
        constructor(message, statusCode, body) {
            super(message);
            this.statusCode = statusCode;
            this.body = body;
            this.name = "VulcxError";
        }
    }
    class RateLimitError extends VulcxError {
        constructor(body) {
            super("Rate limit exceeded", 429, body);
            this.name = "RateLimitError";
        }
    }
    class NoRouteError extends VulcxError {
        constructor(body) {
            super("No route found", 404, body);
            this.name = "NoRouteError";
        }
    }
    class BadRequestError extends VulcxError {
        constructor(message, body) {
            super(message, 400, body);
            this.name = "BadRequestError";
        }
    }
    class AuthError extends VulcxError {
        constructor(body) {
            super("Invalid or missing API key", 401, body);
            this.name = "AuthError";
        }
    }
    class ServerError extends VulcxError {
        constructor(message, body) {
            super(message, 500, body);
            this.name = "ServerError";
        }
    }

    const DEFAULT_BASE_URL = "https://api.vulcx.xyz";
    const DEFAULT_TIMEOUT = 30000;
    const DEFAULT_RETRIES = 2;
    class VulcxSDK {
        constructor(config) {
            if (!config.apiKey)
                throw new Error("apiKey is required");
            this.apiKey = config.apiKey;
            this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
            this.timeout = config.timeout ?? DEFAULT_TIMEOUT;
            this.retries = config.retries ?? DEFAULT_RETRIES;
        }
        async quote(params) {
            const qs = new URLSearchParams({
                inputMint: params.inputMint,
                outputMint: params.outputMint,
                amount: params.amount,
                swapMode: params.swapMode,
            });
            if (params.slippageBps !== undefined) {
                qs.set("slippageBps", String(params.slippageBps));
            }
            return this.request("GET", `/api/v1/quote?${qs}`);
        }
        async swap(params) {
            return this.request("POST", "/api/v1/swap", params);
        }
        async instructions(params) {
            return this.request("POST", "/api/v1/instructions", params);
        }
        async request(method, path, body) {
            const url = `${this.baseUrl}${path}`;
            const headers = {
                Authorization: `Bearer ${this.apiKey}`,
                Accept: "application/json",
            };
            if (body) {
                headers["Content-Type"] = "application/json";
            }
            let lastError;
            for (let attempt = 0; attempt <= this.retries; attempt++) {
                if (attempt > 0) {
                    await sleep(Math.min(1000 * 2 ** (attempt - 1), 8000));
                }
                try {
                    const controller = new AbortController();
                    const timer = setTimeout(() => controller.abort(), this.timeout);
                    const res = await fetch(url, {
                        method,
                        headers,
                        body: body ? JSON.stringify(body) : undefined,
                        signal: controller.signal,
                    });
                    clearTimeout(timer);
                    if (res.ok) {
                        const parsed = (await res.json());
                        // API responses wrap the payload in {success, data}; hand back the
                        // payload the way the method signatures promise.
                        if (parsed && typeof parsed === "object" && "success" in parsed) {
                            if (!parsed.success) {
                                throw new VulcxError(parsed.error ?? "request failed", res.status, parsed);
                            }
                            return parsed.data;
                        }
                        return parsed;
                    }
                    const errBody = await res.json().catch(() => ({}));
                    const errMsg = errBody?.error ?? res.statusText;
                    switch (res.status) {
                        case 401:
                        case 403:
                            throw new AuthError(errBody);
                        case 400:
                            throw new BadRequestError(errMsg, errBody);
                        case 404:
                            throw new NoRouteError(errBody);
                        case 429:
                            lastError = new RateLimitError(errBody);
                            continue;
                        default:
                            if (res.status >= 500) {
                                lastError = new ServerError(errMsg, errBody);
                                continue;
                            }
                            throw new VulcxError(errMsg, res.status, errBody);
                    }
                }
                catch (err) {
                    if (err instanceof AuthError ||
                        err instanceof BadRequestError ||
                        err instanceof NoRouteError ||
                        err instanceof VulcxError) {
                        throw err;
                    }
                    lastError = err;
                }
            }
            throw lastError ?? new Error("request failed");
        }
    }
    function sleep(ms) {
        return new Promise((r) => setTimeout(r, ms));
    }

    const CSS_VARS = {
        "--vulcx-bg": "#0c0c10",
        "--vulcx-surface": "#151519",
        "--vulcx-surface-hover": "#1e1e25",
        "--vulcx-border": "#252530",
        "--vulcx-text": "#e8e8ed",
        "--vulcx-text-secondary": "#7a7a8a",
        "--vulcx-text-dim": "#555565",
        "--vulcx-accent": "#c8ff00",
        "--vulcx-accent-hover": "#d4ff33",
        "--vulcx-error": "#ff4d6a",
        "--vulcx-warning": "#ffaa00",
        "--vulcx-success": "#00d68f",
        "--vulcx-radius": "20px",
        "--vulcx-radius-sm": "14px",
        "--vulcx-badge-bg": "#0a0a0e",
        "--vulcx-font": "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    };

    const defaultVars = Object.entries(CSS_VARS)
        .map(([k, v]) => `${k}: ${v};`)
        .join("\n  ");
    const WIDGET_CSS = `
:host {
  ${defaultVars}
  display: block;
  font-family: var(--vulcx-font);
  color: var(--vulcx-text);
  box-sizing: border-box;
}

:host([theme="light"]) {
  --vulcx-bg: #ffffff;
  --vulcx-surface: #f5f5f7;
  --vulcx-surface-hover: #ebebef;
  --vulcx-border: #d4d4dc;
  --vulcx-text: #1a1a2e;
  --vulcx-text-secondary: #6b6b7a;
  --vulcx-text-dim: #9a9aaa;
  --vulcx-accent: #1a1a2e;
  --vulcx-accent-hover: #2d2d45;
  --vulcx-badge-bg: #e8e8ed;
}

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.swap-container {
  background: var(--vulcx-bg);
  border-radius: var(--vulcx-radius);
  padding: 12px;
  max-width: 460px;
  width: 100%;
}

/* ── Token Panel ── */
.token-panel {
  background: var(--vulcx-surface);
  border-radius: var(--vulcx-radius-sm);
  padding: 18px 18px 14px;
  margin-bottom: 4px;
}

.token-panel-label {
  font-size: 13px;
  color: var(--vulcx-text-secondary);
  margin-bottom: 10px;
}

.token-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.amount-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-size: 36px;
  font-weight: 500;
  color: var(--vulcx-text);
  font-family: var(--vulcx-font);
  min-width: 0;
}

.amount-input::placeholder {
  color: var(--vulcx-text-dim);
  font-weight: 400;
}

.amount-input:disabled {
  opacity: 0.6;
}

/* ── Token Badge ── */
.token-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--vulcx-badge-bg);
  border: 1px solid var(--vulcx-border);
  border-radius: 24px;
  padding: 6px 14px 6px 6px;
  cursor: pointer;
  font-size: 17px;
  font-weight: 700;
  color: var(--vulcx-text);
  white-space: nowrap;
  transition: background 0.15s;
  height: 44px;
}

.token-badge:hover {
  background: var(--vulcx-surface-hover);
}

.token-icon {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.token-icon-placeholder {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--vulcx-border);
  flex-shrink: 0;
}

.badge-chevron {
  width: 12px;
  height: 12px;
  opacity: 0.5;
  flex-shrink: 0;
}

/* ── USD Value ── */
.usd-value {
  font-size: 13px;
  color: var(--vulcx-text-secondary);
  margin-top: 6px;
  font-family: 'SF Mono', 'Fira Code', monospace;
}

/* ── Balance Row ── */
.balance-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--vulcx-border);
}

.balance-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--vulcx-text-secondary);
}

.balance-label svg {
  width: 16px;
  height: 16px;
  opacity: 0.5;
}

.balance-actions {
  display: flex;
  gap: 6px;
}

.half-max-btn {
  font-size: 12px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 8px;
  border: 1px solid var(--vulcx-border);
  background: var(--vulcx-surface-hover);
  color: var(--vulcx-text-secondary);
  cursor: pointer;
  font-family: var(--vulcx-font);
  transition: background 0.15s, color 0.15s;
}

.half-max-btn:hover {
  background: var(--vulcx-border);
  color: var(--vulcx-text);
}

/* ── Swap Direction ── */
.swap-direction {
  display: flex;
  justify-content: center;
  margin: -10px 0;
  position: relative;
  z-index: 1;
}

.swap-direction-btn {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 4px solid var(--vulcx-bg);
  background: var(--vulcx-surface);
  color: var(--vulcx-text);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, transform 0.2s;
}

.swap-direction-btn:hover {
  background: var(--vulcx-surface-hover);
  transform: rotate(180deg);
}

.swap-direction-btn svg {
  width: 22px;
  height: 22px;
}

/* ── Swap Button ── */
.swap-btn {
  width: 100%;
  padding: 18px;
  border: none;
  border-radius: var(--vulcx-radius-sm);
  background: var(--vulcx-accent);
  color: #0a0a0f;
  font-size: 17px;
  font-weight: 700;
  cursor: pointer;
  margin-top: 10px;
  font-family: var(--vulcx-font);
  transition: background 0.15s, opacity 0.15s;
  letter-spacing: -0.2px;
}

.swap-btn:hover:not(:disabled) {
  background: var(--vulcx-accent-hover);
}

.swap-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ── Quote Bar ── */
.quote-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
  padding: 10px 14px;
  background: var(--vulcx-surface);
  border-radius: var(--vulcx-radius-sm);
  font-size: 13px;
  color: var(--vulcx-text-secondary);
  cursor: pointer;
  transition: background 0.15s;
  position: relative;
}

.quote-bar:hover {
  background: var(--vulcx-surface-hover);
}

.quote-bar-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--vulcx-accent);
  font-weight: 600;
  flex-shrink: 0;
}

.quote-bar-tag svg {
  width: 16px;
  height: 16px;
}

.quote-bar-fee {
  padding: 2px 8px;
  border-radius: 6px;
  background: var(--vulcx-badge-bg);
  border: 1px solid var(--vulcx-border);
  font-size: 12px;
  font-weight: 600;
  color: var(--vulcx-text);
  flex-shrink: 0;
}

.quote-bar-route {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  color: var(--vulcx-text-secondary);
}

.quote-bar-info {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1.5px solid var(--vulcx-border);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--vulcx-text-dim);
  font-size: 12px;
  font-weight: 700;
  transition: border-color 0.15s, color 0.15s;
}

.quote-bar:hover .quote-bar-info {
  border-color: var(--vulcx-text-secondary);
  color: var(--vulcx-text);
}

/* ── Quote Detail Panel ── */
.quote-detail {
  margin-top: 6px;
  padding: 12px 14px;
  background: var(--vulcx-surface);
  border-radius: var(--vulcx-radius-sm);
  font-size: 12px;
  color: var(--vulcx-text-secondary);
}

.quote-detail-row {
  display: flex;
  justify-content: space-between;
  padding: 5px 0;
}

.quote-detail-label {
  opacity: 0.7;
}

.impact-warning {
  color: var(--vulcx-warning);
}

.impact-high {
  color: var(--vulcx-error);
}

/* ── Status Messages ── */
.error-msg {
  margin-top: 8px;
  padding: 10px 14px;
  background: rgba(255, 77, 106, 0.08);
  border: 1px solid rgba(255, 77, 106, 0.15);
  border-radius: var(--vulcx-radius-sm);
  color: var(--vulcx-error);
  font-size: 13px;
}

.success-msg {
  margin-top: 8px;
  padding: 10px 14px;
  background: rgba(0, 214, 143, 0.08);
  border: 1px solid rgba(0, 214, 143, 0.15);
  border-radius: var(--vulcx-radius-sm);
  color: var(--vulcx-success);
  font-size: 13px;
}

.loading-spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid var(--vulcx-text-secondary);
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  vertical-align: middle;
  margin-right: 6px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ── Token Selector Modal ── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.65);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
}

.modal-panel {
  background: var(--vulcx-surface);
  border: 1px solid var(--vulcx-border);
  border-radius: var(--vulcx-radius);
  width: 420px;
  max-width: 95vw;
  max-height: 520px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.modal-close {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--vulcx-text-secondary);
  cursor: pointer;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: background 0.15s;
}

.modal-close:hover {
  background: var(--vulcx-surface-hover);
  color: var(--vulcx-text);
}

.modal-search {
  margin: 16px 16px 0;
  padding: 14px 16px;
  background: var(--vulcx-bg);
  border: 1px solid var(--vulcx-border);
  border-radius: var(--vulcx-radius-sm);
  color: var(--vulcx-text);
  font-size: 15px;
  font-family: var(--vulcx-font);
  outline: none;
  transition: border-color 0.15s;
}

.modal-search::placeholder {
  color: var(--vulcx-text-dim);
}

.modal-search:focus {
  border-color: var(--vulcx-text-secondary);
}

.popular-chips {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  flex-wrap: wrap;
}

.popular-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px 6px 6px;
  border-radius: 20px;
  border: 1px solid var(--vulcx-border);
  background: var(--vulcx-bg);
  color: var(--vulcx-text);
  font-size: 14px;
  font-weight: 600;
  font-family: var(--vulcx-font);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  white-space: nowrap;
}

.popular-chip:hover {
  background: var(--vulcx-surface-hover);
  border-color: var(--vulcx-text-secondary);
}

.popular-chip img {
  width: 24px;
  height: 24px;
  border-radius: 50%;
}

.token-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px 8px;
}

.token-list::-webkit-scrollbar {
  width: 4px;
}

.token-list::-webkit-scrollbar-track {
  background: transparent;
}

.token-list::-webkit-scrollbar-thumb {
  background: var(--vulcx-border);
  border-radius: 2px;
}

.token-list-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 10px;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.12s;
}

.token-list-item:hover {
  background: var(--vulcx-surface-hover);
}

.tli-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.tli-icon-placeholder {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--vulcx-border);
  flex-shrink: 0;
}

.tli-info {
  flex: 1;
  min-width: 0;
}

.tli-symbol {
  font-size: 16px;
  font-weight: 700;
  color: var(--vulcx-text);
}

.tli-name {
  font-size: 12px;
  color: var(--vulcx-text-secondary);
  margin-top: 1px;
}

.tli-address {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--vulcx-text-dim);
  margin-top: 2px;
}

.tli-copy {
  width: 12px;
  height: 12px;
  opacity: 0.4;
  cursor: pointer;
}

.tli-balance {
  text-align: right;
  flex-shrink: 0;
}

.tli-balance-amount {
  font-size: 15px;
  font-weight: 600;
  color: var(--vulcx-text);
}

.tli-balance-usd {
  font-size: 12px;
  color: var(--vulcx-text-secondary);
  margin-top: 1px;
}

.token-list-empty {
  padding: 24px;
  text-align: center;
  color: var(--vulcx-text-dim);
  font-size: 14px;
}
`;

    function createInitialState(inputMint, outputMint) {
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
    class Store {
        constructor(initial) {
            this.listeners = new Set();
            this.state = { ...initial };
        }
        getState() {
            return this.state;
        }
        setState(partial) {
            this.state = { ...this.state, ...partial };
            this.listeners.forEach((fn) => fn(this.state));
        }
        subscribe(fn) {
            this.listeners.add(fn);
            return () => this.listeners.delete(fn);
        }
    }

    function formatAmount(raw, decimals) {
        if (!raw || raw === "0")
            return "0";
        const padded = raw.padStart(decimals + 1, "0");
        const intPart = padded.slice(0, padded.length - decimals) || "0";
        const fracPart = padded.slice(padded.length - decimals);
        const trimmed = fracPart.replace(/0+$/, "");
        return trimmed ? `${intPart}.${trimmed}` : intPart;
    }
    function shortenAddress(addr, chars = 4) {
        if (addr.length <= chars * 2 + 3)
            return addr;
        return `${addr.slice(0, chars)}...${addr.slice(-chars)}`;
    }

    const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
    async function rpcCall(url, method, params) {
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        });
        const json = (await res.json());
        if (json.error)
            throw new Error(json.error.message);
        return json.result;
    }
    async function getNativeBalance(rpcUrl, wallet) {
        const result = await rpcCall(rpcUrl, "getBalance", [wallet]);
        return String(result.value);
    }
    async function getTokenBalances(rpcUrl, wallet) {
        const result = await rpcCall(rpcUrl, "getTokenAccountsByOwner", [
            wallet,
            { programId: TOKEN_PROGRAM },
            { encoding: "jsonParsed" },
        ]);
        const balances = new Map();
        for (const acct of result.value) {
            const info = acct.account.data.parsed.info;
            balances.set(info.mint, {
                amount: info.tokenAmount.amount,
                decimals: info.tokenAmount.decimals,
            });
        }
        return balances;
    }
    const NATIVE_SOL_MINT = "So11111111111111111111111111111111111111112";

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
    class VulcxSwapElement extends HTMLElement {
        static get observedAttributes() {
            return [
                "api-key", "base-url",
                "default-input-mint", "default-output-mint",
                "theme", "rpc-url",
            ];
        }
        constructor() {
            super();
            this.debounceTimer = null;
            this.unsubscribe = null;
            this.mounted = false;
            this.rpcUrl = DEFAULT_RPC;
            this.quoteDetailOpen = false;
            this.shadow = this.attachShadow({ mode: "open" });
        }
        connectedCallback() {
            const apiKey = this.getAttribute("api-key") || "";
            const baseUrl = this.getAttribute("base-url") || undefined;
            const inputMint = this.getAttribute("default-input-mint") || "";
            const outputMint = this.getAttribute("default-output-mint") || "";
            this.rpcUrl = this.getAttribute("rpc-url") || DEFAULT_RPC;
            this.sdk = new VulcxSDK({ apiKey, baseUrl });
            this.store = new Store(createInitialState(inputMint, outputMint));
            this.unsubscribe = this.store.subscribe(() => this.update());
            this.mount();
            this.loadTokenList();
        }
        disconnectedCallback() {
            this.unsubscribe?.();
            if (this.debounceTimer)
                clearTimeout(this.debounceTimer);
            this.mounted = false;
        }
        attributeChangedCallback() {
            if (!this.store)
                return;
            const apiKey = this.getAttribute("api-key") || "";
            const baseUrl = this.getAttribute("base-url") || undefined;
            this.rpcUrl = this.getAttribute("rpc-url") || DEFAULT_RPC;
            this.sdk = new VulcxSDK({ apiKey, baseUrl });
        }
        emit(name, detail) {
            this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
        }
        async loadTokenList() {
            try {
                const baseUrl = this.getAttribute("base-url") || "https://api.vulcx.xyz";
                const res = await fetch(`${baseUrl}/api/v1/tokens`);
                if (!res.ok)
                    return;
                const data = await res.json();
                const map = new Map();
                for (const t of data.tokens || []) {
                    map.set(t.mint, t);
                }
                this.store.setState({ tokenMap: map });
            }
            catch { /* silent */ }
        }
        async loadBalances() {
            const { walletAddress, inputMint, outputMint } = this.store.getState();
            if (!walletAddress)
                return;
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
                }
                else if (tokenBals.has(inputMint)) {
                    const b = tokenBals.get(inputMint);
                    inputBal = b.amount;
                    inputDec = b.decimals;
                }
                if (tokenMap.has(inputMint))
                    inputDec = tokenMap.get(inputMint).decimals;
                if (outputMint === NATIVE_SOL_MINT) {
                    outputBal = nativeBal;
                    outputDec = 9;
                }
                else if (tokenBals.has(outputMint)) {
                    const b = tokenBals.get(outputMint);
                    outputBal = b.amount;
                    outputDec = b.decimals;
                }
                if (tokenMap.has(outputMint))
                    outputDec = tokenMap.get(outputMint).decimals;
                this.store.setState({
                    inputBalance: inputBal,
                    outputBalance: outputBal,
                    inputDecimals: inputDec,
                    outputDecimals: outputDec,
                    allBalances: tokenBals,
                    nativeBalance: nativeBal,
                });
            }
            catch { /* silent */ }
        }
        async fetchQuote() {
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
            }
            catch (err) {
                const msg = err instanceof Error ? err.message : "Quote failed";
                this.store.setState({ status: "error", error: msg, quote: null, outputAmount: "" });
            }
        }
        debouncedQuote() {
            if (this.debounceTimer)
                clearTimeout(this.debounceTimer);
            this.debounceTimer = setTimeout(() => this.fetchQuote(), DEBOUNCE_MS);
        }
        async executeSwap() {
            const { inputMint, outputMint, inputAmount, slippageBps, walletAddress } = this.store.getState();
            if (!walletAddress) {
                this.store.setState({ error: "Connect wallet first" });
                return;
            }
            this.store.setState({ status: "swapping", error: "" });
            this.emit("swap-initiated", { inputMint, outputMint, amount: inputAmount });
            try {
                const result = await this.sdk.swap({
                    userWallet: walletAddress, inputMint, outputMint,
                    amount: inputAmount, swapMode: "ExactIn", slippageBps,
                });
                this.store.setState({ status: "success" });
                this.emit("swap-complete", result);
            }
            catch (err) {
                const msg = err instanceof Error ? err.message : "Swap failed";
                this.store.setState({ status: "error", error: msg });
                this.emit("swap-error", { error: msg });
            }
        }
        handleSwapDirection() {
            const { inputMint, outputMint, inputBalance, outputBalance, inputDecimals, outputDecimals } = this.store.getState();
            this.store.setState({
                inputMint: outputMint, outputMint: inputMint,
                inputAmount: "", outputAmount: "", quote: null, status: "idle",
                inputBalance: outputBalance, outputBalance: inputBalance,
                inputDecimals: outputDecimals, outputDecimals: inputDecimals,
            });
        }
        setWallet(address) {
            this.store.setState({ walletAddress: address });
            if (address)
                this.loadBalances();
        }
        getTokenInfo(mint) {
            return this.store.getState().tokenMap.get(mint);
        }
        renderBadge(mint) {
            const info = this.getTokenInfo(mint);
            if (info) {
                return `<img class="token-icon" src="${info.logoURI}" alt="${info.symbol}" onerror="this.style.display='none'"/><span>${info.symbol}</span>${CHEVRON_SVG}`;
            }
            if (!mint)
                return `<span>Select</span>${CHEVRON_SVG}`;
            const short = mint.length > 8 ? mint.slice(0, 4) + "..." + mint.slice(-4) : mint;
            return `<div class="token-icon-placeholder"></div><span>${short}</span>${CHEVRON_SVG}`;
        }
        getButtonText(state) {
            if (!state.walletAddress)
                return "Connect";
            if (state.status === "quoting")
                return "Fetching Quote...";
            if (state.status === "swapping")
                return "Swapping...";
            if (!state.inputAmount)
                return "Enter Amount";
            if (!state.inputMint || !state.outputMint)
                return "Select Tokens";
            return "Swap";
        }
        isButtonDisabled(state) {
            if (!state.walletAddress)
                return false;
            return state.status === "quoting" || state.status === "swapping" || !state.inputAmount || !state.inputMint || !state.outputMint;
        }
        renderQuoteInfoHTML(quote) {
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
        formatBalance(raw, decimals, symbol) {
            const formatted = formatAmount(raw, decimals);
            return `${formatted} ${symbol}`;
        }
        getTokenBalance(mint) {
            const state = this.store.getState();
            if (mint === NATIVE_SOL_MINT)
                return { amount: state.nativeBalance, decimals: 9 };
            const bal = state.allBalances.get(mint);
            if (bal)
                return bal;
            const info = state.tokenMap.get(mint);
            return { amount: "0", decimals: info?.decimals ?? 9 };
        }
        getFilteredTokens() {
            const state = this.store.getState();
            const search = state.selectorSearch.toLowerCase().trim();
            const tokens = Array.from(state.tokenMap.values());
            if (!search)
                return tokens;
            return tokens.filter(t => t.symbol.toLowerCase().includes(search) ||
                t.name.toLowerCase().includes(search) ||
                t.mint.toLowerCase().includes(search));
        }
        openSelector(target) {
            this.store.setState({ selectorOpen: target, selectorSearch: "" });
            this.renderModal();
        }
        closeSelector() {
            this.store.setState({ selectorOpen: null, selectorSearch: "" });
            const overlay = this.shadow.querySelector("#token-modal");
            if (overlay)
                overlay.remove();
        }
        selectToken(mint) {
            const target = this.store.getState().selectorOpen;
            if (!target)
                return;
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
            }
            else {
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
        renderModal() {
            let overlay = this.shadow.querySelector("#token-modal");
            if (!overlay) {
                overlay = document.createElement("div");
                overlay.id = "token-modal";
                overlay.className = "modal-overlay";
                overlay.addEventListener("click", (e) => {
                    if (e.target === overlay)
                        this.closeSelector();
                });
                this.shadow.appendChild(overlay);
            }
            const state = this.store.getState();
            const filtered = this.getFilteredTokens();
            const popularChips = POPULAR_MINTS
                .map(m => state.tokenMap.get(m))
                .filter((t) => !!t);
            const allPopular = Array.from(state.tokenMap.values())
                .filter(t => !POPULAR_MINTS.includes(t.mint))
                .slice(0, 3);
            const chips = [...popularChips, ...allPopular];
            const chipsHTML = chips.map(t => `<button class="popular-chip" data-mint="${t.mint}"><img src="${t.logoURI}" alt="${t.symbol}" onerror="this.style.display='none'"/>${t.symbol}</button>`).join("");
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
            const searchInput = overlay.querySelector("#modal-search");
            if (searchInput)
                searchInput.focus();
        }
        bindModalEvents(overlay) {
            const closeBtn = overlay.querySelector("#modal-close");
            if (closeBtn)
                closeBtn.addEventListener("click", () => this.closeSelector());
            const searchInput = overlay.querySelector("#modal-search");
            if (searchInput) {
                searchInput.addEventListener("input", () => {
                    this.store.setState({ selectorSearch: searchInput.value });
                    this.renderModal();
                });
            }
            overlay.querySelectorAll(".popular-chip").forEach(chip => {
                chip.addEventListener("click", () => {
                    const mint = chip.dataset.mint;
                    if (mint)
                        this.selectToken(mint);
                });
            });
            overlay.querySelectorAll(".token-list-item").forEach(item => {
                item.addEventListener("click", (e) => {
                    if (e.target.closest(".tli-copy-btn"))
                        return;
                    const mint = item.dataset.mint;
                    if (mint)
                        this.selectToken(mint);
                });
            });
            overlay.querySelectorAll(".tli-copy-btn").forEach(btn => {
                btn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    const addr = btn.dataset.addr;
                    if (addr)
                        navigator.clipboard?.writeText(addr);
                });
            });
        }
        mount() {
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
        bindEvents() {
            this.$("#input-amount", (el) => {
                el.oninput = () => {
                    const val = el.value.replace(/[^0-9.]/g, "");
                    if (val !== el.value)
                        el.value = val;
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
                    if (!s.walletAddress)
                        this.emit("connect-wallet", {});
                    else
                        this.executeSwap();
                };
            });
            this.$("#btn-half", el => {
                el.onclick = () => {
                    const { inputBalance, inputDecimals } = this.store.getState();
                    const half = (BigInt(inputBalance || "0") / 2n).toString();
                    const display = formatAmount(half, inputDecimals);
                    this.store.setState({ inputAmount: half });
                    this.$("#input-amount", inp => { inp.value = display; });
                    this.debouncedQuote();
                };
            });
            this.$("#btn-max", el => {
                el.onclick = () => {
                    const { inputBalance, inputDecimals } = this.store.getState();
                    const display = formatAmount(inputBalance, inputDecimals);
                    this.store.setState({ inputAmount: inputBalance });
                    this.$("#input-amount", inp => { inp.value = display; });
                    this.debouncedQuote();
                };
            });
        }
        update() {
            if (!this.mounted)
                return;
            const state = this.store.getState();
            const inputInfo = this.getTokenInfo(state.inputMint);
            const outputInfo = this.getTokenInfo(state.outputMint);
            const inputSymbol = inputInfo?.symbol || "Token";
            const outputSymbol = outputInfo?.symbol || "Token";
            this.$("#input-amount", el => {
                if (this.shadow.activeElement !== el)
                    el.value = state.inputAmount;
            });
            this.$("#output-amount", el => { el.value = state.outputAmount; });
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
            this.$("#swap-btn", el => {
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
                if (state.status === "error")
                    el.innerHTML = `<div class="error-msg">${state.error}</div>`;
                else if (state.status === "success")
                    el.innerHTML = `<div class="success-msg">Swap successful!</div>`;
                else
                    el.innerHTML = "";
            });
        }
        $(sel, fn) {
            const el = this.shadow.querySelector(sel);
            if (el)
                fn(el);
        }
    }

    if (typeof customElements !== "undefined" && !customElements.get("vulcx-swap")) {
        customElements.define("vulcx-swap", VulcxSwapElement);
    }

    exports.VulcxSwapElement = VulcxSwapElement;

}));
//# sourceMappingURL=vulcx-widget.umd.js.map
