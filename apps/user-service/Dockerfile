
# Install the project dependencies in a dedicated stage to prevent dependency installation layers from being rebuilt unnecessarily.
FROM node:22-alpine AS prod-dependency-cache

# set the working directory
WORKDIR /app

# Copy the package manifests to use into the container  
COPY package*.json ./

# Install only production dependencies for a smaller runtime image.
RUN npm ci --omit=dev

# Install  the project dependencies in a dedicated stage to prevent dependency installation layers from being rebuilt unnecessarily.
FROM node:22-alpine AS dev-dependency-cache

# set the working directory within the docker container
WORKDIR /app

# copy the package.json to use into the docker container 
COPY package*.json ./

# install all dependencies including dev-only dependencies 
RUN npm ci

# Final stage of the production image. It uses a minimal distroless runtime for production to reduce size and attack surface.
FROM gcr.io/distroless/nodejs22-debian12:nonroot AS production

# choose the working directory in the container
WORKDIR /app

# Create default environment variables for non-secret configurations to make the image ready-to-run out of the box.
ENV PORT=3001 \
    REDIS_HOST=redis \
    REDIS_PORT=6379 \
    LOG_LEVEL=info \
    NODE_ENV=production 

# copy cached dependencies and package manifest into the container 
COPY --from=prod-dependency-cache /app/node_modules  ./node_modules 
COPY --from=prod-dependency-cache /app/package.json  ./

# copy the source code into the container
COPY src ./src

# document the port that the service listens on
EXPOSE $PORT

# Start the application using exec notation to ensure that the Node.js server receives signals like SIGTERM 
CMD ["src/index.js"]

# Final stage of the dev image. It uses a full Node.js runtime to support dev tools. 
FROM node:22.16.0 AS development

# set the working directory in the docker container
WORKDIR /app

# Create the default environment variables for non-secret configurations to make the image ready-to-run out of the box.
ENV PORT=3001 \
    REDIS_HOST=redis \
    REDIS_PORT=6379 \
    LOG_LEVEL=info \
    NODE_ENV=production \
    REDIS_PASSWORD=admin123 \
    REDIS_USERNAME=app

# document the port that the service listens on
EXPOSE $PORT

# Install useful utilities for local development
RUN apt-get update \
    && apt-get install -y git \
    && apt-get install -y nano 

# copy dependencies, config and source files into the container 
COPY --from=dev-dependency-cache /app/node_modules ./node_modules
COPY --from=dev-dependency-cache /app/package*.json  ./
COPY eslint.config.mjs ./
COPY src ./src

# Start the application using exec notation to ensure that the Node.js server receives signals like SIGTERM 
CMD ["node", "--watch", "src/index.js"]
