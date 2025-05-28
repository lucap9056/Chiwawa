FROM oven/bun:slim AS builder

WORKDIR /app

COPY package.json bun.lockb tsconfig.json ./
COPY src ./src

RUN bun install --frozen-lockfile

RUN bun build src/index.ts --compile --outfile commands

FROM ubuntu:22.04 AS runner

WORKDIR /app

COPY --from=builder /app/commands ./commands

CMD ["./commands"]
