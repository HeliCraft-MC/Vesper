# Use the official Bun image
FROM oven/bun:1 AS build
WORKDIR /app

# Install dependencies
# Copy package.json and bun.lock to cache dependencies
COPY package.json bun.lock* ./

# use ignore-scripts to avoid building node modules like better-sqlite3
RUN bun install --frozen-lockfile --ignore-scripts

# Copy the rest of the application code
COPY . .

# Build the application
# We accept NODE_COMMIT as a build argument to pass the git hash
ARG NODE_COMMIT=unknown
ENV NODE_COMMIT=${NODE_COMMIT}
ENV NODE_ENV=production

# Run the build script
RUN bun --bun run build

FROM oven/bun:1-alpine AS production
WORKDIR /app

# Set environment variables
ENV NUXT_HOST=0.0.0.0
ENV NUXT_PORT=3000
ENV NODE_ENV=production

# Only `.output` folder is needed from the build stage
COPY --from=build /app/.output /app

# For bun
ENV NODE_PATH=/app/server/node_modules

# run the app
EXPOSE 3000
ENTRYPOINT [ "bun", "--bun", "run", "server/index.mjs" ]
