# Multi-stage build for production
FROM node:22-alpine AS builder

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies (including dev for build)
RUN npm ci

# Copy tsconfig and source code
COPY tsconfig.json ./
COPY . .


# -------------------
# Production stage
# -------------------
FROM node:22-alpine AS production

# Create app user
RUN addgroup -g 1001 -S nodejs \
  && adduser -S nodejs -u 1001

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /usr/src/app/dist ./dist

RUN mkdir -p logs && chown -R nodejs:nodejs logs

# ✅ Run prisma generate here as root, before switching user
RUN ln -s /usr/lib/libssl.so.3 /lib/libssl.so.3

# Build the app
RUN npm run build

# Switch to non-root AFTER prisma has written engines
USER nodejs

EXPOSE 3000
#  npm run start
CMD ["npm", "run", "start"]