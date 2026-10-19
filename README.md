# Zakaria Missou — portfolio

A responsive Next.js portfolio for Vercel. Public pages (`/`, `/about`, `/projects`, `/contact`, `/thanks`) are prerendered at build time and read `src/data/portfolio.json`. MongoDB is not needed to browse the portfolio or send a message. Old language/profile URLs redirect to the new pages. The public portfolio supports English, French, and German. The header switcher preserves the current page. English uses the root URLs; French and German use /fr and /de. Language pages are prerendered, and contact feedback stays in the selected language. Original database translations remain in the snapshot.

## Run

```sh
npm install
npm run dev
npm run build
npm run start
```

## Deploy to Vercel

Use the Next.js framework preset and `npm run build`. Commit package.json and package-lock.json together. Next.js is pinned to the patched 15.5.28 release. No database or email environment variables are required for the default setup.

## Last Exit — portfolio game

Open **`/games`**, **`/fr/games`**, or **`/de/games`** to choose a game. Each card opens its own play page: **`/games/last-exit`** for Last Exit and **`/games/backrooms`** for The Backrooms, with matching French and German routes. Both play pages have a **Back to games** link. The home page's game cards also link directly to the selected game. Last Exit is an original, single-player 3D arcade pursuit game with a generated coastal city, traffic, pursuing cars, drifting, nitro, fuel and repair pickups, timed checkpoints, and a city minimap.

The game engine and Three.js load only after **Start your engine**. Rendering, physics, synthesized audio, and game logic run in the visitor's browser. There is no game server, paid asset service, external game asset download, database, or new environment variable. It deploys as part of the existing Vercel Next.js build. Personal best scores are saved to browser-local storage when available; they are not an online leaderboard.

Controls: **WASD / arrow keys** drive, **Space** handbrake, **Shift** nitro, **Esc / P** pause, **R** restart, **M** mute. Touch controls appear on touch devices and can also be enabled in the toolbar. Fullscreen is offered when supported. Switching tabs pauses the run; resuming requires an explicit action. Auto quality limits rendering resolution and reduces shadows on slower devices; High and Low are available manually. A browser with WebGL and hardware acceleration is required.

Reach the gold checkpoint for bonus points and **15 additional seconds**. Drift and safely pass traffic to score and recharge nitro. Green cans restore fuel, coral crosses repair the car, and blue bolts refill nitro. The run ends when the timer, fuel, or car health reaches zero. Pursuit intensifies with time and completed checkpoints.

Run `npm run test:game` for physics and gameplay regression checks, and `npm run build` to verify the full production site. Source lives in `src/lib/game/` and `src/components/game/`; the city and car models are generated in `world.ts`. Game UI copy and portfolio links support English, French, and German; in-world arcade announcements are English.

## The Backrooms / The Hollow — horror game

The second game is at **`/games/backrooms`**, **`/fr/games/backrooms`**, and **`/de/games/backrooms`**. It appears beside Last Exit on the portfolio, with links between the two play pages. It is an original fictional horror experience: an adult investigator disappears in recovered footage, then the player explores a closed, deteriorating facility while a supernatural entity called The Hollow stalks anyone inside.

Restore three circuits with **E**, then use the red exit door. **WASD** moves, **mouse / drag** looks around, **arrow left/right** turns, **Shift** sprints, **F** toggles the flashlight, **Esc / P** pauses, and **M** mutes sound. Click the view for captured mouse controls where supported; drag and keyboard turning remain available. Touch movement and look controls are included. The opening can be skipped and a reduced-effects option limits flicker and camera movement. Switching away pauses playback. The Hollow hears movement, sees around unblocked sightlines, navigates walls, and searches the last known location before losing the trail.

The world, monster and surface textures are generated locally, and all audio is synthesized after a user gesture. Solo needs no additional service or account. The engine loads only after starting solo or connecting to a room and uses the normal Vercel Next.js build. The site shell and controls support English, French, and German; in-world captions are English.

Run `npm run test:backrooms` for the maze, movement, objective, pursuit, intro, pause and lifecycle regression checks. Source is in `src/lib/backrooms/` and `src/components/backrooms/`.

### Private co-op rooms

Choose **Play with friends → Create room**, copy the invite, and have friends open it and select **Join room**. The host selects **Enter together**. Up to four anonymous explorers see each other, share three circuits, and face the same creature. Reaching the powered exit ends the recording for the team. A captured explorer waits while surviving teammates continue; the host can restart for everyone.

The host simulates the creature and must keep the game tab open and active. Pausing the host freezes the team; a guest's pause only pauses their view, so they can still be caught. Leaving as host closes the room. Sessions are temporary: there is no reconnect, host migration, account, chat, saved room, or matchmaking. The invitation contains a random 96-bit room key: anyone holding it can join until the four slots are filled. Share it privately. Connections use a relay rather than exposing peer addresses through peer-to-peer networking. This application stores no player names or room history; hosting providers process normal network traffic.

For local play, run these in **two terminals**:

```sh
npm run dev
```

```sh
npm run multiplayer:dev
```

Open `http://127.0.0.1:3000/games/backrooms`. Local invite links work in other tabs on that computer. They are not internet links. The relay binds to `127.0.0.1:1999` by default. `HOST`, `PORT`, and optional comma-separated `ALLOW_ORIGINS` can configure the local server.

### Publish co-op with the Vercel portfolio

Vercel hosts the game page; the included Cloudflare Worker and Durable Object host its persistent WebSocket rooms. No Cloudflare account has been created and no backend has been deployed by this implementation.

1. Create your own [Cloudflare account](https://dash.cloudflare.com/sign-up), verify your email, and enable Workers. Complete credentials and terms yourself.
2. Run `npm run multiplayer:login` and authorize Wrangler in your browser.
3. Optionally set `vars.ALLOW_ORIGINS` in `multiplayer/wrangler.jsonc` to your portfolio's exact HTTPS origin (comma-separated if multiple). Empty allows any origin; room access still requires the invite key.
4. Run `npm run multiplayer:check` to bundle without deploying, then `npm run multiplayer:deploy`. Copy the resulting `https://hollow-private-rooms.<subdomain>.workers.dev` origin. A custom domain is unnecessary.
5. Add `NEXT_PUBLIC_HOLLOW_ROOM_URL` to the Vercel project's environment variables with that origin. It is public configuration, not a secret. Rebuild/redeploy the portfolio because Next.js embeds public variables during the build.
6. Open the deployed game, create a room, and share the deployed invite. Check `/health` on the worker origin if a connection fails. Without the environment variable, deployed pages offer solo and explain that online rooms are not connected.

The worker config declares a SQLite-backed Durable Object but does not write game state to storage. `npm run multiplayer:check` needs no login. Deployment and runtime remain subject to Cloudflare account availability and usage limits. The wrapper keeps Wrangler build output and logs in ignored `work/multiplayer/`.

Run `npm run test:multiplayer` for room authority checks and real WebSocket tests using the actual browser connection client against an isolated local relay. Run `npm run build` to validate the portfolio production bundle. The shared room authority is `src/lib/backrooms/room.ts`; the worker is `multiplayer/worker.mjs`.

## Contact email — default setup

The form sends a background JSON request to the portfolio's `/api/contact` endpoint, which forwards it to FormSubmit's AJAX endpoint and delivers to **missouzakaria03@gmail.com**. Visitors stay on the portfolio and see translated sending, success, or error feedback inline. It uses browser validation, a honeypot, a 20-second timeout, and duplicate-submit protection. Visitor messages pass through FormSubmit. HTTP 200 alone is not treated as success: the provider must explicitly accept the submission. Activation-required responses show an error with a direct-email alternative and preserve the visitor's message. The `/thanks` page remains available but is no longer part of submission.

A setup submission was made and FormSubmit confirmed an activation email was sent. Open that email and click **Activate Form**. Check Spam if necessary. The service may require another verification on the deployed domain; if prompted, submit once there and confirm the email. Real inbox delivery cannot be verified without the recipient's confirmation. No API key, account registration, or sending domain is required for this default flow.

## Optional Resend mode

If both `RESEND_API_KEY` and `CONTACT_FROM_EMAIL` are set, `/api/contact` uses Resend instead of FormSubmit, still without leaving the website. Add them in Vercel environment settings or `.env.local`, then rebuild/redeploy. The sender must be on a Resend-verified domain. Copy variable names from `.env.example`; never commit keys.

The Resend endpoint awaits the provider response, validates input, limits payload size, and checks a honeypot. It returns success only after Resend accepts the message. Recipient is fixed to missouzakaria03@gmail.com, and Reply-To is the visitor's address. Do not use `output: 'export'`: both providers use the Vercel serverless contact endpoint. Public portfolio pages remain prerendered.

## Preserved MongoDB content

The public snapshot was read from local `portfolio_db` for profile token `missou`: 6 sections, 20 skills, 4 education entries, 1 experience entry, 4 features, and 3 social links. There were no project records. No private user fields or received contact messages were exported. The database was not changed.

Edit `src/data/portfolio.json` to update content, or manually refresh from local MongoDB:

```sh
node scripts/export-portfolio.cjs
```

The exporter defaults to `mongodb://127.0.0.1:27017/portfolio_db`, or uses `MONGODB_URI` from the process environment. It does not run during deployment. Review the snapshot before committing. Original database-backed admin/API code is retained for recovery, but is unused by the public site; admin edits do not change the snapshot. No MongoDB credentials are needed on Vercel.




## Design reference

`DESIGN.md` contains the StudioBlank reference. The public portfolio adapts it to a midnight navy and charcoal palette, with off-white text and a restrained cool-blue accent. Inter and IBM Plex Mono provide weight and metadata contrast. Surfaces are flat and square, with no shadows, gradients, decorative shapes, or text over the portrait. Generous spacing, thin dividers, simple project artwork, and rectangular buttons carry the design across English, French, and German pages.
