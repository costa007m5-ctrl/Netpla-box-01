# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Artifacts

### NetPlay (`artifacts/netplay`)
- **Type**: React + Vite web app
- **Preview path**: `/`
- **Description**: A Netflix-style streaming app with movie/series browsing, video playback (HLS, Google Drive, TeraBox), MercadoPago payment integration, Supabase authentication, admin panel, watch party feature, and push notifications via OneSignal.
- **Key dependencies**: React Router DOM, Supabase, Firebase, MercadoPago SDK, HLS.js, Artplayer, Video.js, Framer Motion, Socket.io client, Google Generative AI

### API Server (`artifacts/api-server`)
- **Type**: Express API server
- **Preview path**: `/api`
- **Port**: 8080
- **Routes**: `/api/healthz`, `/api/netplay/*` (TeraBox, streaming, payments, admin, referrals, Google Drive OAuth)
- **Key dependencies**: Supabase (admin + public client), MercadoPago, Axios

## Environment Variables Required

- `VITE_SUPABASE_URL` / `SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` / `SUPABASE_ANON_KEY` — Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (server-side only)
- `VITE_TMDB_API_KEY` — TMDB API key for movie data
- `VITE_GOOGLE_DRIVE_API_KEY` / `GOOGLE_DRIVE_API_KEY` — Google Drive API key
- `VITE_GOOGLE_CLIENT_ID` — Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` — Google OAuth client secret
- `MERCADO_PAGO_ACCESS_TOKEN` — MercadoPago access token
- `TERABOX_PRO_API_KEY` — TeraBox Pro API key
- `VITE_ONESIGNAL_APP_ID` — OneSignal app ID
- `VITE_FIREBASE_*` — Firebase config variables
