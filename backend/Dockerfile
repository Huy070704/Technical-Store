# ---------------------------------------------------
# 1. Base stage: Môi trường chung
# ---------------------------------------------------
FROM node:22-alpine AS base
WORKDIR /app

# libc6-compat: cần cho native binaries (bcrypt) trên Alpine Linux
RUN apk add --no-cache libc6-compat
RUN chown -R node:node /app

# ---------------------------------------------------
# 2. Deps stage: Cài đặt dependencies
# ---------------------------------------------------
FROM base AS deps
USER node
COPY --chown=node:node package*.json ./

# Cài đặt tất cả (bao gồm devDependencies để có ts-node và typescript)
RUN npm ci

# ---------------------------------------------------
# 3. Production stage
# ---------------------------------------------------
FROM base AS production
ENV NODE_ENV=production
USER node

# Copy node_modules từ deps stage
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
# Copy toàn bộ mã nguồn backend vào container
COPY --chown=node:node . .

# Expose port (Azure App Service mặc định route vào 8080 nếu không chỉ định)
EXPOSE 8080
ENV PORT=8080

# Chạy project TypeScript trực tiếp trong production
CMD ["npx", "ts-node", "-r", "tsconfig-paths/register", "src/server.ts"]
