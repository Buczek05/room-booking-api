FROM node:22-alpine

WORKDIR /app

# najpierw tylko pliki zależności – warstwa z npm ci jest cache'owana, dopóki nie zmieni się lock
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# potem kod aplikacji
COPY . .

ENV NODE_ENV=production
EXPOSE 3000

# migracje przy starcie; exec – node dostaje PID 1 i sam odbiera SIGTERM (graceful shutdown)
CMD ["sh", "-c", "npx knex migrate:latest && exec node src/server.js"]
