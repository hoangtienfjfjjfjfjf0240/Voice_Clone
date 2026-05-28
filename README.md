# MiniMax Voice Clone

Local React/Vite tool for cloning a voice from short video/audio with MiniMax Speech API, then generating multilingual TTS with the cloned `voice_id`.

## Features

- Drop a video or audio file; the browser extracts/decodes audio, converts to mono WAV, and loops short clips to about 60 seconds.
- Uploads processed audio to MiniMax with `purpose=voice_clone`.
- Calls MiniMax `voice_clone` using a generated `AutoClone_<timestamp>` voice ID.
- Generates MP3 TTS from `/v1/t2a_v2` across multiple languages with language boost.
- Lists and deletes MiniMax cloned/generated voices through `get_voice` and `delete_voice`.

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create local env:

   ```bash
   copy .env.example .env.local
   ```

   Put your MiniMax key in `MINIMAX_API_KEY`.

3. Start Vite:

   ```bash
   npm run dev
   ```

4. Open the local URL. The API key stays server-side and is not shown in the UI.

The dev server proxies `/api/minimax/*` to `https://api.minimax.io/*` so browser CORS does not block uploads or TTS. On Vercel, the included serverless function handles the same `/api/minimax/*` path.

## Deploy on Vercel

Set this Environment Variable in Vercel Project Settings:

```bash
MINIMAX_API_KEY=your_minimax_api_key_here
```

The included `api/minimax.js` serverless function forwards `/api/minimax/*` requests to MiniMax and injects the key on the server. Do not add a `VITE_` prefix to this secret.
