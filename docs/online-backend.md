# Multiplayer setup

The current online implementation is a turn-based REST API in NestJS. Clients poll every 1.5 seconds while visible; this version does not use WebSockets or Supabase Realtime. The server applies `@skyhoof/game-core` actions, chooses fresh random dice seeds, validates the seat and turn, and uses a revision to reject conflicting updates. A room expires 24 hours after creation.

## Local development

1. Run `npm install` and `npm run build -w @skyhoof/game-core && npm run build -w @skyhoof/catalog`.
2. Start the API with `npm run dev:api` and the Vite frontend with `npm run dev:web`. The default browser API URL is `http://127.0.0.1:3001` in development. Set `WEB_ORIGIN` on the API to the exact frontend origin if different from `http://127.0.0.1:5173` or `http://localhost:5173`; multiple explicit origins may be comma-separated.
3. With no Supabase settings, development uses an in-memory store. Rooms disappear when the API stops. Production startup requires both Supabase variables and does not silently fall back to memory.
4. `npm run check` runs formatting, typechecks, tests, and builds. With the API running locally, `API_URL=http://127.0.0.1:3001 node scripts/online-api-e2e.mjs` plays a full automated match through HTTP.

## Supabase and deployment

- Run `supabase/migrations/20261104000000_online_rooms.sql` in the Supabase project SQL editor. The table has RLS enabled, no anon/authenticated privileges or policies, and only `service_role` may access it. The migration was applied to the Skyhoof organization project on 2026-11-05; RLS and anon/authenticated SELECT denial and service-role SELECT/INSERT were verified there. Backend connectivity remains to be tested after configuring its secret.
- Configure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` only on the API. Never put the service role key in frontend variables, source control, URLs, screenshots, or chat. The API accesses Supabase PostgREST with the service role and uses compare-and-set updates on room versions.
- `render.yaml` defines an API web service in Singapore with `/health`, free plan, and required `WEB_ORIGIN`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` values. Review the blueprint before creating a service. Free Render instances sleep; resume may take time. Supabase free projects can pause after inactivity. Render has not been provisioned or tested.
- Import the repository into the personal Vercel project with repository root as the Vercel root directory; `vercel.json` builds the workspace packages and Vite frontend. Set `VITE_API_URL` to the deployed API origin. Vite embeds it at build time; changing it requires a new build. Configure the final Vercel URL as `WEB_ORIGIN` on Render. For preview deployments, explicitly include each desired origin rather than using an unrestricted wildcard.
- GitHub Actions `.github/workflows/ci.yml` checks every PR and push to `main`; Render and Vercel Git integrations can deploy after an approved push. No secrets are stored in the workflow.

## Session and current limitations

Joining requires a six-character code and a name. The invite QR contains the public frontend URL plus room code, never a player token. Each seat receives a random token, stored in `sessionStorage` in that tab. Reloading the tab recovers the seat; closing the tab, clearing session storage, or deliberately leaving removes the local token and currently cannot reclaim that seat. A full waiting room requires its host to start. A player who explicitly leaves the waiting room frees their seat; if the host leaves, the next player becomes host. A disconnected tab does not automatically free a seat. The prototype does not yet offer kick, ready, or replacement during an active match. A game cannot restart in the same room.

The API's in-process rate limit restricts room creation and join attempts per IP on one instance. It is not a distributed abuse-prevention system. Expired rows are not automatically deleted from Supabase yet. Room-level occupancy, credentials, rate limiting, data retention, reconnect handling, real phone behavior, and full match interaction must be evaluated before public release. The REST polling client can miss intermediate animations when several updates occur between polls; the current snapshot remains authoritative.
