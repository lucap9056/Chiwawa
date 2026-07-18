FROM oven/bun:1.3-slim AS build

WORKDIR /app

COPY . .

RUN cd main && bun install --frozen-lockfile

RUN sh scripts/sync-proto.sh

RUN cd main && bun run build

FROM oven/bun:1.3-slim

ENV NODE_ENV=production

WORKDIR /app

COPY main/package.json main/bun.lock ./
RUN bun install --frozen-lockfile --production

COPY --from=build /app/main/dist ./

USER bun

CMD ["bun", "run", "index.js"]
