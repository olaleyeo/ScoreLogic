# ==========================================
# Stage 1: Build Frontend Assets
# ==========================================
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ==========================================
# Stage 2: Production Server
# ==========================================
FROM node:18-alpine
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install backend dependencies
COPY backend/package*.json ./backend/
RUN npm ci --prefix backend --omit=dev

# Copy backend source code
COPY backend/ ./backend/

# Copy built frontend assets from builder stage
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

EXPOSE 3000

CMD ["npm", "start", "--prefix", "backend"]
