FROM node:20-bookworm-slim AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-bookworm-slim

ENV NODE_ENV=production
ENV PORT=8080
ENV AEGIS_ROOT=/var/lib/aegisvault
WORKDIR /app
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
RUN mkdir -p /var/lib/aegisvault && chown -R node:node /var/lib/aegisvault /app
USER node
EXPOSE 8080
VOLUME ["/var/lib/aegisvault"]
CMD ["node", "dist/cli.js", "server"]
