FROM oven/bun:slim AS builder

WORKDIR /app

COPY package.json bun.lockb* tsconfig.json ./

RUN bun install --frozen-lockfile

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN bun run build

FROM oven/bun:slim AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static

RUN bun install --production

EXPOSE 3000

CMD ["node", "server.js"]