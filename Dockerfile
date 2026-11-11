# Production image for Railway (or any container host). Local development does not use Docker: see docs/SETUP.md.
# One container runs the NestJS API, serves the built web app, and supervises the bundled OPA binary.
FROM node:22-bookworm-slim

# openssl and certificates for Prisma's migration engine and HTTPS downloads.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
RUN corepack enable

# The whole repo is copied before installing: the root postinstall downloads OPA (scripts/fetch-opa.mjs)
# and the server's postinstall generates the Prisma client, and both need their source files.
COPY . .
RUN pnpm install --frozen-lockfile && pnpm build

ENV NODE_ENV=production
EXPOSE 3000

# Applies pending migrations, then starts the server on $PORT.
CMD ["pnpm", "start"]
