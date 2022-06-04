FROM node:16-slim as builder

WORKDIR /app
COPY tsconfig.json ./
COPY package*.json ./
RUN npm install --include=dev
COPY src src
RUN npm run build

FROM node:16-slim as productionDependencies

WORKDIR /app
COPY package*.json ./
RUN npm install --production

FROM alpine as tini

ENV TINI_VERSION v0.19.0
ADD https://github.com/krallin/tini/releases/download/${TINI_VERSION}/tini /tini
RUN chmod +x /tini

FROM node:16-slim

WORKDIR /app
USER node
COPY --from=tini --chown=node:node /tini /app/tini
COPY --from=builder --chown=node:node /app/dist /app/dist
COPY --from=productionDependencies --chown=node:node /app/node_modules /app/node_modules

# Specified as entrypoint as you want the commands from waitehr to be added to the end of the script
ENTRYPOINT ["/app/tini", "--", "node", "/app/dist/main.js"]
