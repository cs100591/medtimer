# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY packages/shared-types/package*.json ./packages/shared-types/

# Install dependencies
RUN npm ci --workspace=@medication-reminder/shared-types
RUN npm ci --workspace=@medication-reminder/backend

# Copy source code
COPY packages/shared-types ./packages/shared-types
COPY apps/backend ./apps/backend

# Build shared types
RUN npm run build --workspace=@medication-reminder/shared-types

# Build backend
WORKDIR /app/apps/backend
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy built files
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/index.js"]
