# Two-stage build:
#   1. builder — runs GraphHopper in import mode against the OSM extract,
#      producing the routing graph cache.
#   2. runtime — JRE + jar + pre-built graph cache. No .pbf shipped.
#
# Net result: container cold-start is ~5s (JVM warmup) instead of ~60s
# (graph build), which matters with Cloud Run min-instances=1 and any
# autoscaling event.
#
# Build context is the graphhopper/ directory.

# ─── Stage 1: builder ───────────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-jammy AS builder
WORKDIR /gh

# Order layers by change frequency (rare → frequent) for cache reuse.
COPY graphhopper-web.jar ./graphhopper-web.jar
COPY config.prod.yml ./config.yml
COPY data/cotswolds-aonb.osm.pbf ./data/cotswolds-aonb.osm.pbf

# Build the graph cache. `import` is GH's mode for graph construction;
# it exits cleanly once graph-cache/ is written.
RUN java -Xmx2g -jar graphhopper-web.jar import config.yml

# ─── Stage 2: runtime ───────────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-jammy AS runtime
WORKDIR /gh

# Non-root user for defence in depth. Cloud Run also runs containers
# unprivileged, but this makes the image safe to run anywhere.
RUN useradd --system --uid 1000 --home-dir /gh gh \
    && chown gh:gh /gh

USER gh

COPY --from=builder --chown=gh:gh /gh/graphhopper-web.jar ./graphhopper-web.jar
COPY --from=builder --chown=gh:gh /gh/config.yml ./config.yml
COPY --from=builder --chown=gh:gh /gh/graph-cache ./graph-cache

# Cloud Run sets PORT but we keep the GH config on its native 8989 and
# tell Cloud Run to forward to that port via --port=8989 at deploy time.
EXPOSE 8989

# Headroom: Cloud Run instance is 4GB; leave ~500MB for OS + heap overhead.
ENTRYPOINT ["java", "-Xmx3500m", "-jar", "graphhopper-web.jar", "server", "config.yml"]
