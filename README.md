# New Voices Dialer

A browser-based Twilio dialer — make and receive phone calls straight from a
web page, no desk phone or cell phone needed. Built with Next.js and the
[Twilio Voice JS SDK](https://www.twilio.com/docs/voice/sdks/javascript), and
deployable to **Vercel** in a few minutes.

This is the always-on, hosted alternative to Twilio's local-only *Dev Phone*
CLI plugin. Instead of running on `localhost` from your own PC, it lives on a
public URL you can open from any browser.

## Features

- 📞 Outbound calls from a dropdown of saved numbers (uses your Twilio number as caller ID)
- 📲 Inbound calls ring in the browser
- 🔢 On-screen keypad with DTMF tones during a call
- 🔑 **Bring-your-own-credentials**: users paste their Twilio keys into the
  app; they're stored **only in the browser** (localStorage) and the access
  token is signed **client-side** — nothing Twilio-related is ever stored on
  the server
- ▲ One-click deploy to Vercel

## Credential model

The server never sees your Twilio API Key Secret. On first visit the app shows
a short form; you paste:

- Account SID (`AC…`)
- API Key SID (`SK…`) + Secret
- TwiML App SID (`AP…`), whose Voice URL points at this site's `/api/voice`
- Caller ID (your Twilio number, E.164)

These are saved in `localStorage` and used to mint a Twilio access token
locally via the Web Crypto API. Use the ⚙ button to change them or **Forget
credentials** to wipe them from the browser.

---

## How it works

| Piece | Role |
|-------|------|
| `app/page.tsx` + `components/Dialer.tsx` | The dialer UI (WebRTC via the Voice SDK) |
| `components/Settings.tsx` | Form to paste Twilio credentials (browser-only) |
| `lib/twilioToken.ts` | Signs the Twilio access token **client-side** (Web Crypto) |
| `lib/credentials.ts` | Loads/saves credentials in `localStorage` |
| `app/api/voice/route.ts` | TwiML webhook Twilio hits for **both** outbound and inbound calls |
| `scripts/setup-twilio.mjs` | Optional one-time provisioning of the API Key + TwiML App |

> **Note:** `/api/voice` is intentionally **public** — Twilio's servers call it
> and can't send your login cookie. It's protected instead by optional Twilio
> request-signature validation (see `TWILIO_VALIDATE_SIGNATURE` below).

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Deploy to Vercel

Push this repo to GitHub and import it at <https://vercel.com/new>, **or** use the
CLI:

```bash
npm i -g vercel
vercel --prod   # note the URL it prints, e.g. https://your-app.vercel.app
```

No Twilio secrets are configured on the server — the app needs no environment
variables to run.

### 3. Create the Twilio resources (once, in the Console)

In the [Twilio Console](https://console.twilio.com):

1. **API Key** — Account → *API keys & tokens* → Create API key (Standard).
   Copy the **SID (`SK…`)** and **Secret** (shown once).
2. **TwiML App** — Voice → Manage → *TwiML Apps* → Create. Set its
   **Voice Request URL** to `https://your-app.vercel.app/api/voice` (HTTP POST).
   Copy the **App SID (`AP…`)**.
3. *(inbound only)* On your phone number, set the "A call comes in" webhook to
   the same `/api/voice` URL (HTTP POST).

> Prefer automation? On a machine that can reach `api.twilio.com`, run
> `npm run setup:twilio -- https://your-app.vercel.app` to create these for you.

### 4. Open the dialer and paste your credentials

Visit your Vercel URL, then paste the Account SID, API Key SID + Secret, TwiML
App SID, and your caller ID into the form. They're saved in your browser only.
Allow microphone access and dial.

---

## Local development

```bash
npm run dev   # http://localhost:3000
```

Paste your Twilio credentials into the app as usual. For inbound calls to reach
a local server, expose it with a tunnel (e.g. `ngrok http 3000`) and point your
TwiML App / number Voice URL at `https://<tunnel-url>/api/voice`.

---

## Security notes

- **The API Key Secret never touches the server.** Credentials are pasted in
  the browser, kept in `localStorage`, and used to sign the access token
  locally. Use **Forget credentials** to wipe them; anyone on a shared device
  should do so.
- The site itself is public (no login). This is safe because it stores no
  secrets — a visitor only ever sees an empty credential form until they paste
  their own keys, which stay on their device.
- A Twilio **Auth Token** grants full account access. If one has been shared in
  plaintext, rotate it in **Twilio Console → Account → API keys & tokens**.
  (This app uses an API Key, not the Auth Token.)
- Optionally enable `TWILIO_VALIDATE_SIGNATURE=true` (with `TWILIO_AUTH_TOKEN`
  set) so only genuine Twilio requests can drive `/api/voice`.

---

## Costs

Standard Twilio per-minute voice rates apply, plus ~$1/month for the phone
number. Trial accounts can only call **verified** numbers and play a trial
message — upgrade under Console → Billing for unrestricted calling.
