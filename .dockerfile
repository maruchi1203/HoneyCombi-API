FROM node:24-slim AS base
WORKDIR /app
ENV NODE_ENV=development

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS dev

ENV CHOKIDAR_USEPOLLING=1
ENV CHOKIDAR_FORCE_POLLING=1
ENV CHOKIDAR_INTERVAL=1000
ENV TSC_WATCHFILE=fixedpollinginterval
ENV TSC_WATCHDIRECTORY=fixedpollinginterval
ENV WATCHPACK_POLLING=true
CMD ["npm", "run", "start:dev:docker"]

FROM deps AS build
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npx tsc -p tsconfig.build.json
RUN test -f dist/app.module.js

FROM node:24-slim AS prod
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
CMD ["node", "dist/main"]
