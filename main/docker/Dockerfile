FROM oven/bun:slim

WORKDIR /app

COPY package.json bun.lockb tsconfig.json ./
COPY src ./src

RUN bun install --frozen-lockfile

RUN apt update -qq && apt install -y ffmpeg && apt clean && rm -rf /var/lib/apt/lists/*

CMD ["bun","run","start"]
