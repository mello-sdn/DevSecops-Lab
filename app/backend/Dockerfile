FROM node:26-alpine@sha256:143494b1da2945f061539253adc65e4f1569ddf07da2d384c022c791a9d90a4a AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev

FROM node:26-alpine@sha256:143494b1da2945f061539253adc65e4f1569ddf07da2d384c022c791a9d90a4a

ENV NODE_ENV=production

# Remove vulnerable global npm modules
RUN rm -rf /usr/local/lib/node_modules/npm/node_modules/brace-expansion \
           /usr/local/lib/node_modules/npm/node_modules/undici \
           /usr/local/lib/node_modules/npm/node_modules/http-cache-semantics

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules

COPY . .

USER node

EXPOSE 5000

CMD ["node", "server.js"]
