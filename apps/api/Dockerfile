FROM node:20.17.0-slim as base

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

FROM node:20.17.0-slim as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src
RUN npx prisma generate && npm run build

FROM node:20.17.0-slim
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/generated ./generated
COPY --from=build /app/dist ./dist
COPY package*.json ./
EXPOSE 8080 8081
CMD ["node", "dist/index.js"]

