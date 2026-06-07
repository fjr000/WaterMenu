FROM node:24-alpine AS build

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.17.1 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY frontend/package.json frontend/package.json

RUN pnpm install --frozen-lockfile

COPY frontend frontend
RUN pnpm --filter @watermenu/frontend build

FROM nginx:1.27-alpine

COPY --from=build /app/frontend/dist /usr/share/nginx/html
EXPOSE 80 443
