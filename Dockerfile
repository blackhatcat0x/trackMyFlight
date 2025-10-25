FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
RUN apk add --no-cache chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV NODE_ENV=production

# Copy standalone build
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy custom server and Socket.IO files
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/src/lib/socket.ts ./src/lib/socket.ts

# Install TypeScript runtime dependencies
RUN npm install tsx

EXPOSE $PORT
CMD ["npx", "tsx", "server.ts"]