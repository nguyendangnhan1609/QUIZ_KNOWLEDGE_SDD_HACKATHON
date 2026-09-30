# Stage 1: Builder
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@latest

# Copy package manager files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma client explicitly for clean container builds
RUN pnpm exec prisma generate

# Build application
RUN SKIP_ENV_VALIDATION=true pnpm run build

# Stage 2: Runtime
FROM node:22-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@latest

# Install dumb-init to handle signals properly
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Copy package manager files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy built application from builder
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --chown=nextjs:nodejs prisma ./prisma
COPY --chown=nextjs:nodejs prisma.config.ts ./prisma.config.ts

# Create writable directories before switching to non-root user
RUN mkdir -p /app/.uploads /app/.logs && chown -R nextjs:nodejs /app/.uploads /app/.logs

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Set NODE_ENV
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Use dumb-init to run the process
ENTRYPOINT ["dumb-init", "--"]

# Sync database schema (via direct URL, bypassing pgbouncer) then start application
CMD ["sh", "-c", "DATABASE_URL=${DIRECT_URL} pnpm exec prisma db push && pnpm start"]
