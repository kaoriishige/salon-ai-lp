<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Salon de Beauty AI Concierge Development Rules

## 1. Netlify Build & Deployment Config
* **Base Directory**: Must be configured as `salon-ai` in Netlify dashboard because the Git repository name is salon-ai.
* **netlify.toml Settings**:
  - `command = "npm run build"`
  - `publish = ".next"`
  - Plugin `@netlify/plugin-nextjs` must be enabled.

## 2. Google Cloud TTS & Text Normalization
* Always clean up text inside `/app/api/concierge/route.js` -> `optimizeTextForSpeech` before sending to TTS:
  - Convert `AI` to `エーアイ`.
  - Convert `Salon de Beauty` to `サロンドビューティー`.
  - Convert `Hot Pepper Beauty` to `ホットペッパービューティー`.
  - Convert `WEB予約` to `ウェブよやく`.
  - Clean up `¥` and `,` (Commas) for prices.
  - Convert `・` (Middle dots) to `、` (Reading pause).

## 3. Mobile Responsive Layout for Avatar
* Mobile viewport styling (`@media (max-width: 768px)`) for `.ai-live-avatar` must explicitly declare `flex-shrink: 0 !important` and `min-width: 50px !important` to prevent the flexbox from squishing and disappearing the avatar.
