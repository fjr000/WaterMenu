FROM node:24-alpine AS deps

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.17.1 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json backend/package.json

RUN pnpm install --frozen-lockfile

FROM deps AS build

COPY backend backend
RUN pnpm --filter @watermenu/backend prisma:generate
RUN pnpm --filter @watermenu/backend build

FROM node:24-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable && corepack prepare pnpm@10.17.1 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json backend/package.json

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built backend and generated Prisma Client
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/prisma ./backend/prisma
COPY --from=build /app/backend/prisma.config.ts ./backend/prisma.config.ts
COPY --from=build /app/backend/package.json ./backend/package.json
COPY --from=build /app/backend/node_modules/.prisma ./backend/node_modules/.prisma

WORKDIR /app/backend
EXPOSE 3000

CMD ["sh", "-c", "pnpm prisma:deploy && pnpm start"]
