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

COPY --from=deps /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/backend/node_modules ./backend/node_modules
COPY --from=build /app/backend ./backend

WORKDIR /app/backend
EXPOSE 3000

CMD ["sh", "-c", "pnpm prisma:deploy && pnpm start"]
