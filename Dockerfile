# Stage 1: Build the CLI
FROM node:20 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci  # Install dependencies
COPY . .
RUN npm run build  # Compile TypeScript to /dist

# Stage 2: Runtime (slim image for smaller size)
FROM node:20-slim
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/bin ./bin  # Include the CLI binary

# Set environment
ENV NODE_ENV=production

# Entry point: Run the CLI with node
ENTRYPOINT ["node", "/app/bin/run.js"]