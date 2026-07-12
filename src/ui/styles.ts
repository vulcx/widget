import { CSS_VARS } from "./theme";

const defaultVars = Object.entries(CSS_VARS)
  .map(([k, v]) => `${k}: ${v};`)
  .join("\n  ");

export const WIDGET_CSS = `
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
