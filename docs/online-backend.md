# Multiplayer setup

The online implementation uses a turn-based REST API. The production adapter targets Supabase Edge Functions; NestJS remains available for local development. Clients poll every 1.5 seconds while visible; this version does not use WebSockets or Supabase Realtime. The server applies `@skyhoof/game-core` actions, chooses fresh random dice seeds, validates the seat and turn, and uses a revision to reject conflicting updates. A room expires 24 hours after creation.

## Local development

1. Run `npm install` and `npm run build -w @skyhoof/game-core && npm run build -w @skyhoof/catalog`.
2. Start the API with `npm run dev:api` and the Vite frontend with `npm run dev:web`. The default browser API URL is `http://127.0.0.1:3001` in development. Set `WEB_ORIGIN` on the API to the exact frontend origin if different from `http://127.0.0.1:5173` or `http://localhost:5173`; multiple explicit origins may be comma-separated.
3. With no Supabase settings, development uses an in-memory store. Rooms disappear when the API stops. Production startup requires both Supabase variables and does not silently fall back to memory.
4. `npm run check` runs formatting, typechecks, tests, and builds. With the API running locally, `API_URL=http://127.0.0.1:3001 node scripts/online-api-e2e.mjs` plays a full automated match through HTTP.

## Supabase and deployment

- The Skyhoof Supabase project has the rooms migration applied. RLS is enabled, anon/authenticated cannot read the table, and the service role can access it. Never expose the service role key to the frontend.
- `npm run build:edge` bundles the shared room service and game rules into `supabase/functions/rooms/index.ts`. `npm run test:edge` exercises a complete match through the Edge HTTP handler locally. Deploy the generated function as `rooms` with JWT verification disabled: seat tokens are checked by the function itself and no Supabase user login is required. Supabase provides the service-role secret to the function runtime. Confirm the function configuration and test the deployed function before connecting the frontend.
- Set Vercel `VITE_API_URL` to the Supabase project URL followed by `/functions/v1`, then redeploy. No Supabase service key belongs in Vercel or the browser. The function's URL is public; tokens authorize each room seat.
- GitHub Actions checks the generated bundle and tests the handler. Supabase's GitHub integration can deploy declared functions and migrations from `main` when the project is linked and Deploy to production is enabled. Vercel independently deploys the frontend from the same branch. Verify both deployment results after a push; GitHub checks do not gate either provider's production deployment by themselves.

## Session and current limitations

Joining requires a six-character code and a name. The invite QR contains the public frontend URL plus room code, never a player token. Each seat receives a random token, stored in `sessionStorage` in that tab. Reloading the tab recovers the seat; closing the tab, clearing session storage, or deliberately leaving removes the local token and currently cannot reclaim that seat. A full waiting room requires its host to start. A player who explicitly leaves the waiting room frees their seat; if the host leaves, the next player becomes host. A disconnected tab does not automatically free a seat. The prototype does not yet offer kick, ready, or replacement during an active match. A game cannot restart in the same room.

The host may reserve one or more seats for bots and select their shared difficulty. A room starts when all remaining human seats are filled. Authenticated room polling advances one server-side bot action at a time; compare-and-set prevents concurrent polls from applying the same revision twice. Bots pause when nobody is polling, and polling can skip intermediate visual animations. Offline play remains available separately.

The Edge handler's best-effort rate limit is per isolate and depends on a forwarded IP header. It is not distributed abuse prevention; verify trusted header behavior and add shared rate limiting before broad public use. Expired rows are not automatically deleted from Supabase yet. Room-level occupancy, credentials, rate limiting, data retention, reconnect handling, real phone behavior, and full match interaction must be evaluated before public release. The REST polling client can miss intermediate animations when several updates occur between polls; the current snapshot remains authoritative.
