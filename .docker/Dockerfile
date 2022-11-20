FROM node:18-alpine

WORKDIR /usr/src/app

COPY package.json .
COPY yarn.lock .
COPY tsconfig.json .
COPY src ./src
COPY .yarn ./.yarn
COPY .yarnrc.yml .
COPY .npmrc .
COPY config.*.json .

RUN yarn install --immutable
RUN yarn run build