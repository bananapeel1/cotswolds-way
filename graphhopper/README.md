# GraphHopper routing engine

Powers `/api/routes/generate` and the `/walks/*` family. Runs as a sidecar JVM service — locally on `127.0.0.1:8989`, in prod on Cloud Run (`europe-west2`).

## Local setup

Binaries are not committed (see `.gitignore`). You need two files in this directory before the first run:

1. **`graphhopper-web.jar`** — download `graphhopper-web-10.x.jar` from [GraphHopper releases](https://github.com/graphhopper/graphhopper/releases) and rename to `graphhopper-web.jar`.
2. **`data/cotswolds-aonb.osm.pbf`** — the Cotswolds AONB OSM extract. Build it with `scripts/ingest-osm-aonb.sh` from the project root (clips `england-latest.osm.pbf` from Geofabrik to the AONB polygon).

Then start the server:

```sh
/opt/homebrew/opt/openjdk@21/bin/java -Xmx4g -jar graphhopper-web.jar server config.yml
```

First boot builds the routing graph into `graph-cache/` (~60s). Subsequent boots reuse the cache (~10s).

Set `GRAPHHOPPER_URL=http://127.0.0.1:8989` in your `.env.local` so the Next.js API route can find it.

## Files

| File | Purpose |
|---|---|
| `config.yml` | Local dev config — binds to `127.0.0.1`, debug admin connector on `:8990`. |
| `config.prod.yml` | Production config — binds to `0.0.0.0`, no admin connector. Used inside the Docker image. |
| `Dockerfile` | Two-stage build for Cloud Run. Builder pre-computes `graph-cache/` from the `.pbf`; runtime ships JRE + jar + cache only. |
| `.dockerignore` | Keeps the dev `config.yml` and stray `graph-cache/` out of the build context. |
| `cloudbuild.yaml` | Cloud Build → Artifact Registry → Cloud Run deploy pipeline. |

## Deploying to Cloud Run

From the project root:

```sh
gcloud builds submit graphhopper --config=graphhopper/cloudbuild.yaml
```

This builds the image (~10 min wall — the `import` step rebuilds the graph inside the builder stage), pushes to Artifact Registry, and deploys to the `cotswolds-graphhopper` Cloud Run service in `europe-west2`. The service is private (`--no-allow-unauthenticated`); the Next.js runtime SA needs `roles/run.invoker` to call it.

After deploy, set the prod env var `GRAPHHOPPER_URL` (in Firebase Secret Manager) to the Cloud Run service URL — no trailing slash.

## Rebuilding the graph

Triggered by either of:
- New AONB OSM extract (Geofabrik publishes weekly).
- Change to `graph.encoded_values` in either config (the cache is keyed on encoded values).

Local:
```sh
rm -rf graph-cache
/opt/homebrew/opt/openjdk@21/bin/java -Xmx4g -jar graphhopper-web.jar server config.yml
```

Production: just re-run `gcloud builds submit` — the Dockerfile builder rebuilds the graph from scratch in each image.
