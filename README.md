# New Voices Dialer

A browser-based Twilio dialer — make and receive phone calls straight from a
web page, no desk phone or cell phone needed. Built with Next.js and the
[Twilio Voice JS SDK](https://www.twilio.com/docs/voice/sdks/javascript), and
deployable to **Vercel** in a few minutes.

This is the always-on, hosted alternative to Twilio's local-only *Dev Phone*
CLI plugin. Instead of running on `localhost` from your own PC, it lives on a
public URL you can open from any browser — and it's protected by a password.

## Features

- 📞 Outbound calls to any phone number (uses your Twilio number as caller ID)
- 📲 Inbound calls ring in the browser
- 🔢 On-screen keypad with DTMF tones during a call
- 🔒 Password gate on the whole site (default password: `caras`)
- ▲ One-click deploy to Vercel

---

## How it works

| Piece | Role |
|-------|------|
| `app/page.tsx` + `components/Dialer.tsx` | The dialer UI (WebRTC via the Voice SDK) |
| `app/api/token/route.ts` | Mints short-lived Twilio access tokens for the browser |
| `app/api/voice/route.ts` | TwiML webhook Twilio hits for **both** outbound and inbound calls |
| `app/login` + `app/api/login` + `middleware.ts` | Password gate |
| `scripts/setup-twilio.mjs` | One-time provisioning of the Twilio API Key + TwiML App |

> **Note:** `/api/voice` is intentionally **public** — Twilio's servers call it
> and can't send your login cookie. It's protected instead by optional Twilio
> request-signature validation (see `TWILIO_VALIDATE_SIGNATURE` below).

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Deploy to Vercel (get your URL first)

Push this repo to GitHub and import it at <https://vercel.com/new>, **or** use the
CLI:

```bash
npm i -g vercel
vercel        # first deploy — note the URL it prints, e.g. https://your-app.vercel.app
```

You need the deployed URL before the next step, because Twilio's webhooks must
point at it. (A first deploy will boot without Twilio env vars — that's fine,
you'll add them in step 4.)

### 3. Provision the Twilio resources

This creates the API Key + TwiML App the dialer needs and points your phone
number's Voice webhook at your deployment. Put your Account SID and Auth Token
in `.env.local` (copy from `.env.example`) or pass them inline:

```bash
TWILIO_ACCOUNT_SID=AC... TWILIO_AUTH_TOKEN=... \
  npm run setup:twilio -- https://your-app.vercel.app
```

It prints a block of environment variables — **copy them now** (the API Key
secret is shown only once).

### 4. Add environment variables to Vercel

In **Vercel → Project → Settings → Environment Variables**, add everything the
script printed:

| Variable | Description |
|----------|-------------|
| `TWILIO_ACCOUNT_SID` | Your account SID (`AC…`) |
| `TWILIO_API_KEY_SID` | API Key SID from the setup script |
| `TWILIO_API_KEY_SECRET` | API Key secret from the setup script |
| `TWILIO_TWIML_APP_SID` | TwiML App SID from the setup script |
| `TWILIO_CALLER_ID` | Outbound caller ID, E.164 (this project: `+19729475590`) |
| `TWILIO_CLIENT_IDENTITY` | Any string, e.g. `new_voices_dialer` |
| `SITE_PASSWORD` | Site password (optional; defaults to `caras`) |
| `TWILIO_AUTH_TOKEN` | Only needed if you enable signature validation |
| `TWILIO_VALIDATE_SIGNATURE` | Set to `true` to verify inbound Twilio requests |

Then **redeploy** so the new env vars take effect (`vercel --prod`).

### 5. Open the dialer

Visit your Vercel URL, enter the password (`caras`), allow microphone access,
and dial. Enter destinations in E.164 (e.g. `+14155551234`); bare US 10-digit
numbers are auto-prefixed with `+1`.

---

## Local development

```bash
cp .env.example .env.local   # fill in the values from the setup script
npm run dev                  # http://localhost:3000
```

For inbound calls to reach a local server, expose it with a tunnel (e.g.
`ngrok http 3000`) and re-run `npm run setup:twilio -- https://<tunnel-url>`.

---

## Security notes

- Secrets live only in environment variables — **never** commit `.env.local`
  (it's git-ignored).
- The whole site is behind a password (`SITE_PASSWORD`, default `caras`).
- `TWILIO_AUTH_TOKEN` grants full account access. If it has ever been shared in
  plaintext, rotate it in **Twilio Console → Account → API keys & tokens**.
- Enable `TWILIO_VALIDATE_SIGNATURE=true` (with `TWILIO_AUTH_TOKEN` set) in
  production so only genuine Twilio requests can drive `/api/voice`.

---

## Costs

Standard Twilio per-minute voice rates apply, plus ~$1/month for the phone
number. Trial accounts can only call **verified** numbers and play a trial
message — upgrade under Console → Billing for unrestricted calling.
