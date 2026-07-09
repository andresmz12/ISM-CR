FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY prisma ./prisma
# prisma generate only validates the schema shape at build time, it does not
# connect to a database — Railway doesn't inject runtime env vars into the
# build step, so we provide a placeholder just to satisfy the env("DATABASE_URL") check.
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
RUN npx prisma generate

COPY src ./src

EXPOSE 4000

CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]
