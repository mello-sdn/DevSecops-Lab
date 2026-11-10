FROM node:26-alpine@sha256:143494b1da2945f061539253adc65e4f1569ddf07da2d384c022c791a9d90a4a AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

FROM nginxinc/nginx-unprivileged:1.30-alpine-slim@sha256:5d8bb9437d74a600ec5dbf90c035451c724dc33eac8d3a71078f6f8612c345f6

# Workaround temporaire pour : CVE-2026-107891 (musl) et CVE-2026-85091 (zlib) corrigées côté Alpine,
# à retirer quand le digest upstream les corrige
USER root
RUN apk upgrade --no-cache musl musl-utils zlib
USER 101

COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
