FROM alpine:latest AS ffmpeg-downloader
RUN apk add --no-cache curl tar xz

RUN mkdir -p /tmp/ffmpeg && \
    curl -L https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz | \
    tar xJ -C /tmp/ffmpeg --strip-components 1

FROM oven/bun:1.3-slim

ENV NODE_ENV=production

WORKDIR /app

COPY package.json bun.lockb ./

RUN bun install --frozen-lockfile --production

COPY --from=ffmpeg-downloader /tmp/ffmpeg/ffmpeg /usr/local/bin/
COPY --from=ffmpeg-downloader /tmp/ffmpeg/ffprobe /usr/local/bin/

RUN chmod +x /usr/local/bin/ffmpeg /usr/local/bin/ffprobe

COPY tsconfig.json ./
COPY src ./src

USER bun

CMD ["bun", "run", "start"]