# NetPlay - Netflix-like Streaming App

## Overview
NetPlay is a Netflix-style streaming platform (originally called "NetPremium") ported from Vercel to Replit. It provides a rich UI for browsing, searching, and watching movies and TV series, with features like user profiles, watch parties, admin dashboard, and payment integration.

## Architecture

### Frontend (`artifacts/netplay/`)
- **React 19 + Vite + TypeScript** with Tailwind CSS v4
- **React Router DOM** for client-side routing
- **Supabase** for auth, database, and real-time features
- **Firebase** for analytics/auth
- **Motion** for animations
- **HLS.js + ArtPlayer** for video streaming

### Backend (`artifacts/api-server/`)
- **Express 5** API server
- Routes in `src/routes/netplay.ts` covering:
  - `/api/hls-proxy` — HLS stream proxying (bypasses CORS)
  - `/api/stream/:fileId` — Google Drive video streaming
  - `/api/terabox-pro` — Terabox video extraction
  - `/api/terabox/convert` — Terabox URL conversion
  - `/api/payments/*` — Mercado Pago payment integration
  - `/api/admin/*` — Admin panel API (users, settings, referrals)
  - `/api/notifications/send` — OneSignal push notifications
  - `/api/webhooks/supabase/onesignal` — Supabase webhook for notifications
  - `/api/auth/google/url` — Google OAuth URL generation

### Shared Libraries
- `lib/api-spec/` — OpenAPI spec (basic health endpoint)
- `lib/api-client-react/` — Generated React Query hooks
- `lib/db/` — Drizzle ORM + PostgreSQL (empty schema — app uses Supabase)

## Environment Variables Required
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (backend only)
- `VITE_TMDB_API_KEY` — TMDB API key for movie data
- `GEMINI_API_KEY` — Google Gemini API key (for translation)
- `VITE_GOOGLE_DRIVE_API_KEY` — Google Drive API key
- `VITE_GOOGLE_CLIENT_ID` — Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` — Google OAuth client secret
- `MERCADO_PAGO_ACCESS_TOKEN` — Mercado Pago access token
- `VITE_MERCADO_PAGO_PUBLIC_KEY` — Mercado Pago public key
- `ONESIGNAL_REST_API_KEY` — OneSignal REST API key
- `VITE_ONESIGNAL_APP_ID` — OneSignal App ID
- `VITE_FIREBASE_*` — Firebase configuration variables
- `TERABOX_PRO_API_KEY` — Terabox Pro API key

## Key Features
- Netflix-style home with banner, rows, and categories
- Movie/series search with advanced search page
- Video player with HLS streaming support
- Watch Party with real-time sync (uses Supabase Realtime)
- User profiles with avatar selection
- Continue watching, My List, Favorites
- Admin dashboard (users, content scanner, payments)
- Mercado Pago subscription payments
- OneSignal push notifications
- Franchise/universe view (Marvel, DC, Star Wars, etc.)
- Google Drive streaming integration
- Terabox streaming integration

## Routing
- `/` → Home (requires login + profile selection)
- `/search` → Advanced search
- `/admin` → Admin panel
- `/universe` → Franchise universes view
- `/mylist` → My list
- `/trending` → Trending content
- `/provider/:id` → Streaming provider page
- `/profile-dashboard` → Profile settings

## Notes
- App uses Supabase as primary database (not Replit's built-in PostgreSQL)
- Socket.io removed from backend (Supabase Realtime used instead via frontend)
- Firebase has hardcoded fallback keys for easy setup
