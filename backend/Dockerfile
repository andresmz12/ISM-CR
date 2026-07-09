FROM node:20-slim

WORKDIR /app

# Prisma's schema/query engines need OpenSSL; the -slim (Debian) base has apt
# available for this. Alpine's musl libc caused "Could not parse schema
# engine response" failures at runtime, so we avoid it here.
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

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

# seed.js uses upsert, so it's safe to run on every startup: it creates the
# default statuses + admin user once and is a no-op afterward.
CMD ["sh", "-c", "npx prisma migrate deploy && node prisma/seed.js && node src/server.js"]
