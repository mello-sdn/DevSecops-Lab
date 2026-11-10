FROM node:26-alpine@sha256:8996bb5821d62a8fd9bb27c1cb07462f3fdce6e47d640c6a881ead0b064ce216 AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev

#FROM node:26-alpine@sha256:143494b1da2945f061539253adc65e4f1569ddf07da2d384c022c791a9d90a4a

FROM node:26-alpine@sha256:8996bb5821d62a8fd9bb27c1cb07462f3fdce6e47d640c6a881ead0b064ce216

ENV NODE_ENV=production

# npm is only needed at build time: remove it entirely from the runtime image
# (partially deleting its modules makes the first "npm run" of a new container crash)
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules

COPY . .

USER node

EXPOSE 5000

CMD ["node", "server.js"]
