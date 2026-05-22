@AGENTS.md

# The Cotswold Way - Accommodation Booking Platform

## Project Overview
A trail-native accommodation booking platform for the Cotswold Way (102-mile National Trail). Solves the discovery and coordination problem for independent walkers by showing verified near-trail stays on an interactive map with real-time availability.

## Tech Stack
- **Frontend**: Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- **Database**: Supabase (PostgreSQL + PostGIS)
- **Payments**: Stripe
- **Maps**: Mapbox GL JS (planned)
- **Deployment**: Vercel
- **Source**: GitHub

## Design System: "The Curated Rambler"
- **Fonts**: Newsreader (serif, headlines) + Manrope (sans, body/labels)
- **Icons**: Material Symbols Outlined (Google Fonts CDN)
- **Colors**: Primary `#173124` (Deep Forest), Secondary `#665d4e` (Cotswold Stone), Tertiary `#541600` (Trail Marker orange)
- **Key rules**: No standard 1px borders — use tonal layering. Ambient shadows (5% opacity, 24-40px blur). Use `surface-container-*` tokens for depth hierarchy.

## Pages
- `/` — Landing page (hero, search widget, features, itinerary cards, map preview, testimonial)
- `/search` — Split-screen: accommodation list + interactive trail map
- `/property/[slug]` — Accommodation detail (gallery, amenities, booking widget, reviews)
- `/itinerary` — Template selection + timeline builder with stops

## Commands
- `npm run dev` — Start dev server on port 3000 (**requires Node.js 20** — use `PATH="/opt/homebrew/opt/node@20/bin:$PATH" npm run dev`)
- `npm run build` — Production build
- `npm run lint` — ESLint

## Local services
- **GraphHopper** (walking routes, `/walks/*`): `cd graphhopper && /opt/homebrew/opt/openjdk@21/bin/java -Xmx4g -jar graphhopper-web.jar server config.yml`
  - First run builds graph cache (~60s). Subsequent starts reuse cache (~10s).
  - Binds to `http://127.0.0.1:8989`. Set `GRAPHHOPPER_URL=http://127.0.0.1:8989` in `.env.local`.
  - Data file: `graphhopper/data/cotswolds-aonb.osm.pbf` (64MB Cotswolds clip, not committed).
  - The walks feature (`/api/routes/generate`, `/walks/preview`) pre-flight-pings GH; when it's not running the API returns a structured 503 `service_degraded` (was 500 pre-Milestone A).

## Production services
- **GraphHopper on Cloud Run** (region `europe-west2` / London).
  - Deploy from project root: `gcloud builds submit graphhopper --config=graphhopper/cloudbuild.yaml`
  - Image is built in two stages (`graphhopper/Dockerfile`): builder runs `java -jar graphhopper-web.jar import config.yml` against `data/cotswolds-aonb.osm.pbf` to produce `graph-cache/`; runtime ships JRE + jar + pre-built cache only. Cold-start is ~5s (JVM warmup) instead of ~60s (graph build).
  - Runs at `min-instances=1, max=3, 2 vCPU, 4 GiB, port 8989, concurrency=20, --no-allow-unauthenticated`.
  - Service-to-service auth: the Next.js runtime SA needs `roles/run.invoker` on the `cotswolds-graphhopper` Cloud Run service. The fetch call sends an identity token automatically when running on Firebase App Hosting / GCP.
  - Prod env var: `GRAPHHOPPER_URL` set to the Cloud Run service URL (no trailing slash). Stored in Firebase Secret Manager.
- **Rebuilding the graph after an OSM update**:
  1. Replace `graphhopper/data/cotswolds-aonb.osm.pbf` with the new clip (see `scripts/ingest-osm-aonb.sh`).
  2. Verify locally: `rm -rf graphhopper/graph-cache && cd graphhopper && /opt/homebrew/opt/openjdk@21/bin/java -Xmx4g -jar graphhopper-web.jar server config.yml`
  3. Re-deploy: `gcloud builds submit graphhopper --config=graphhopper/cloudbuild.yaml`. Cloud Build rebuilds the graph inside the image so the runtime container starts with a fresh cache.

## Conventions
- Components in `src/components/`
- Route pages in `src/app/`
- Use the Tailwind v4 `@theme inline` system in `globals.css` for design tokens
- Prefer semantic color token names (e.g., `text-primary`, `bg-surface-container-low`)
