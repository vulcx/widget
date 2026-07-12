# @vulcx/widget

Embeddable swap widget for the Vulcx DEX aggregator. Framework-agnostic Web Component that works in React, Vue, Svelte, Angular, or plain HTML.

## Install

```bash
npm install @vulcx/widget
```

Or via CDN (no build step needed):

```html
<script src="https://cdn.vulcx.xyz/vulcx-widget.umd.js"></script>
```

## Usage

### HTML / CDN

```html
<script src="https://cdn.vulcx.xyz/vulcx-widget.umd.js"></script>

<vulcx-swap
  api-key="vulcx_your_api_key"
  chain="solana"
  default-input-mint="So11111111111111111111111111111111111111112"
  default-output-mint="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
  theme="dark"
></vulcx-swap>
```

### React

```tsx
import "@vulcx/widget";

function App() {
  return (
    <vulcx-swap
      api-key="vulcx_your_api_key"
      chain="solana"
      default-input-mint="So11111111111111111111111111111111111111112"
      default-output-mint="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
      theme="dark"
    />
  );
}
```

For TypeScript, add to your `global.d.ts`:

```typescript
declare namespace JSX {
  interface IntrinsicElements {
    "vulcx-swap": React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & {
        "api-key"?: string;
        chain?: string;
        "default-input-mint"?: string;
        "default-output-mint"?: string;
        theme?: "dark" | "light";
      },
      HTMLElement
    >;
  }
}
```

### Vue

```vue
<template>
  <vulcx-swap
    api-key="vulcx_your_api_key"
    chain="solana"
    default-input-mint="So11111111111111111111111111111111111111112"
    default-output-mint="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
    theme="dark"
    @quote-update="onQuote"
    @swap-complete="onSwap"
  />
</template>

<script setup>
import "@vulcx/widget";

function onQuote(e) {
  console.log("Quote:", e.detail);
}
function onSwap(e) {
  console.log("Swap:", e.detail);
}
</script>
```

### Next.js

```tsx
"use client";
import { useEffect, useRef } from "react";

export default function SwapWidget() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    import("@vulcx/widget");
  }, []);

  return (
    <vulcx-swap
      ref={ref}
      api-key="vulcx_your_api_key"
      chain="solana"
      theme="dark"
    />
  );
}
```

## Attributes

| Attribute             | Type               | Default    | Description                    |
| --------------------- | ------------------ | ---------- | ------------------------------ |
| `api-key`             | `string`           | —          | **Required.** Your API key     |
| `chain`               | `"solana"\|"fogo"` | `"solana"` | Target chain                   |
| `base-url`            | `string`           | Production | API base URL override          |
| `default-input-mint`  | `string`           | —          | Pre-selected input token mint  |
| `default-output-mint` | `string`           | —          | Pre-selected output token mint |
| `theme`               | `"dark"\|"light"`  | `"dark"`   | Color theme                    |

## Events

| Event             | Detail                                    | Description                   |
| ----------------- | ----------------------------------------- | ----------------------------- |
| `quote-update`    | `QuoteResponse`                           | Fired when a new quote loads  |
| `swap-initiated`  | `{ inputMint, outputMint, amount }`       | Fired when swap starts        |
| `swap-complete`   | `SwapResponse`                            | Fired on successful swap      |
| `swap-error`      | `{ error: string }`                       | Fired on swap failure         |
| `connect-wallet`  | `{}`                                      | Fired when user clicks swap without wallet |

## Wallet Integration

Set the wallet address programmatically:

```javascript
const widget = document.querySelector("vulcx-swap");
widget.setWallet("9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM");
```

Listen for the `connect-wallet` event to trigger your wallet adapter:

```javascript
widget.addEventListener("connect-wallet", async () => {
  const wallet = await connectWallet(); // your wallet adapter
  widget.setWallet(wallet.publicKey.toString());
});
```

## Customization

Override CSS custom properties on the host element:

```css
vulcx-swap {
  --vulcx-bg: #0d0d12;
  --vulcx-accent: #00ff88;
  --vulcx-radius: 20px;
}
```

Available CSS variables:

| Variable                    | Default (dark) | Description        |
| --------------------------- | -------------- | ------------------ |
| `--vulcx-bg`              | `#0a0a0f`      | Background         |
| `--vulcx-surface`         | `#141419`      | Card/panel bg      |
| `--vulcx-surface-hover`   | `#1c1c24`      | Hover state        |
| `--vulcx-border`          | `#2a2a35`      | Borders            |
| `--vulcx-text`            | `#e8e8ed`      | Primary text       |
| `--vulcx-text-secondary`  | `#8b8b9a`      | Secondary text     |
| `--vulcx-accent`          | `#c8ff00`      | Accent / CTA       |
| `--vulcx-error`           | `#ff4d6a`      | Error color        |
| `--vulcx-radius`          | `16px`         | Border radius      |
