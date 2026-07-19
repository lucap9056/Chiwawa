FROM oven/bun:1.3-slim AS build

WORKDIR /app

COPY . .

RUN cd dashboard && bun install --frozen-lockfile

COPY dashboard/docker/nitro-bun-uds-runtime.mjs dashboard/node_modules/nitro/dist/presets/bun/runtime/bun.mjs

ENV BASE_PATH=/chiwawa/

RUN sh scripts/sync-proto.sh

RUN cd dashboard && bun run build

FROM oven/bun:1.3-slim

ENV NODE_ENV=production

WORKDIR /app

COPY --from=build /app/dashboard/.output ./

USER bun

EXPOSE 3000

CMD ["bun", "run", "server/index.mjs"]
