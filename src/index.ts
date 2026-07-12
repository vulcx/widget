import { VulcxSwapElement } from "./vulcx-swap";

if (typeof customElements !== "undefined" && !customElements.get("vulcx-swap")) {
  customElements.define("vulcx-swap", VulcxSwapElement);
}

export { VulcxSwapElement };
export type { WidgetState, WidgetStatus, TokenInfo } from "./state/store";
