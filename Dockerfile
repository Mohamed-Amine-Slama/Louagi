# syntax=docker/dockerfile:1

FROM node:26-slim

WORKDIR /app

ENV EXPO_NO_TELEMETRY=1

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 8081 19000 19001 19002 19006

CMD ["npx", "expo", "start"]
