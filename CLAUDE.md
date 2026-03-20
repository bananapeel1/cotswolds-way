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
- `npm run dev` — Start dev server on port 3000
- `npm run build` — Production build
- `npm run lint` — ESLint

## Conventions
- Components in `src/components/`
- Route pages in `src/app/`
- Use the Tailwind v4 `@theme inline` system in `globals.css` for design tokens
- Prefer semantic color token names (e.g., `text-primary`, `bg-surface-container-low`)
