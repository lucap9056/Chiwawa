FROM oven/bun:1.3-slim AS build

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY tsconfig.json tsr.config.json vite.config.ts ./
COPY public ./public
COPY server ./server
COPY src ./src

ENV BASE_PATH=/chiwawa/

RUN bun run build

FROM oven/bun:1.3-slim

ENV NODE_ENV=production

WORKDIR /app

COPY --from=build /app/.output ./

USER bun

EXPOSE 3000

CMD ["bun", "run", "server/index.mjs"]
