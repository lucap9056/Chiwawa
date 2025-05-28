FROM oven/bun:slim AS builder

WORKDIR /app

COPY package.json bun.lockb tsconfig.json ./
COPY src ./src

RUN bun install --frozen-lockfile

RUN bun build src/index.ts --compile --outfile main

FROM ubuntu:22.04 AS runner

WORKDIR /app

RUN apt update -qq && apt install -y ffmpeg && apt clean && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/main ./main

CMD ["./main"]
