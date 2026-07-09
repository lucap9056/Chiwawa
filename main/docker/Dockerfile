FROM oven/bun:1.3-slim

ENV NODE_ENV=production

WORKDIR /app

COPY package.json bun.lockb ./

RUN bun install --frozen-lockfile --production

COPY tsconfig.json ./
COPY src ./src

USER bun

CMD ["bun", "run", "start"]