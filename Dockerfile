# syntax=docker/dockerfile:1
#
# SignalScout: static SvelteKit build served by Caddy. Built on vps02 by
# `docker compose up --build`; see compose.yaml and .github/workflows/deploy.yml.

FROM oven/bun:1.3.14 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

FROM caddy:2.11.7-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/build /srv
