FROM node:22-alpine AS builder
WORKDIR /app

COPY suzume-client/package.json suzume-client/pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

COPY suzume-client/ ./
RUN pnpm build

FROM nginx:1.29-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY suzume-client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 4173
