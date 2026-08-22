# Craig Hempcrete Demo Site

Vercel-ready Next.js demo site for a B2C hempcrete building-materials launch.

## Local Setup

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and set `GEMINI_API_KEY` to enable live Gemini responses. Without a local key, the chat widget uses deterministic fallback answers for the five required consultative workflows.

The voice button uses Gemini Live API with `gemini-3.1-flash-live-preview`. The server creates a one-use ephemeral Live token, then the browser streams microphone PCM audio directly to Gemini and plays the returned audio stream.

## Deployment

Deploy this repository to Vercel and add these environment variables:

- `GEMINI_API_KEY`
- `GEMINI_MODEL` (optional, defaults to `gemini-3.5-flash`)
- `GEMINI_LIVE_VOICE` (optional, defaults to `Kore`)
- `NEXT_PUBLIC_SITE_URL` (optional, set to the final Vercel URL or custom domain for social previews)

The site intentionally has no real checkout, inventory, CRM, payment, or workshop backend.

Gemini Live API is preview access. If voice mode cannot start after deployment, confirm the API key's project has access to `gemini-3.1-flash-live-preview`.
