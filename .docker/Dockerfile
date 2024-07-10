FROM node:20-alpine

WORKDIR /app

COPY package.json .
COPY package-lock.json .
COPY tsconfig.json .
COPY src ./src
COPY .npmrc .
COPY .nvmrc .
COPY config.json .

RUN npm ci
RUN npm run build