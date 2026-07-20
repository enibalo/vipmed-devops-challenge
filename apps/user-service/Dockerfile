# prod-dependency caching stage
FROM node:22.16.0 AS prod-dependency-cache

# choose working directory within the docker container 
WORKDIR /app

# copy the package.json from the host machine 
COPY package*.json ./

# install all dependencies, omit dev dependencies from production 
RUN npm ci --omit=dev

# dev-dependency caching stage
FROM node:22.16.0 AS dev-dependency-cache

# choose the working directory within the docker container
WORKDIR /app

# copy the package.json from the host machine 
COPY package*.json ./

# install all dependencies 
RUN npm ci

# production runtime stage
FROM node:22-alpine AS production

# choose the working directory 
WORKDIR /app

# set the default environment variables 
ENV PORT=3001 \
    REDIS_HOST=redis \
    REDIS_PORT=6379 \
    LOG_LEVEL=info \
    NODE_ENV=production 

# copy dependencies from the dependency cache
COPY --from=prod-dependency-cache /app/node_modules  ./node_modules 

# add package files 
COPY --from=prod-dependency-cache /app/package.json  ./

# copy source code
COPY src ./src

# create a non-roout user and group 
RUN addgroup -S nodejs && adduser -S nodeuser -G nodejs \
    # change ownerships of all files to the non-root user
    chown -R nodeuser:nodejs /app

# change user of the docker container to the non-root user 
USER nodeuser

#  document port to be used by the user-service 
EXPOSE $PORT

#start the server 
CMD ["node", "src/server.js"]

# development stage
FROM node:22.16.0 AS development

# set the working directory in the docker container
WORKDIR /app

# set the default environment variables including secrets... DO NOT HARDCODE PERSONAL VALUES IN THIS FILE. Use docker-compose. Please also use proper secret management for the database password.
ENV PORT=3001 \
    REDIS_HOST=redis \
    REDIS_PORT=6379 \
    LOG_LEVEL=info \
    NODE_ENV=production \
    REDIS_PASSWORD=admin123 \
    REDIS_USERNAME=app

# document port that the user-service listens on
EXPOSE $PORT

# install git 
RUN apt-get update && apt-get install -y git 

# add dependencies 
COPY --from=dev-dependency-cache /app/node_modules ./node_modules

# add package files 
COPY --from=dev-dependency-cache /app/package*.json  ./

# copy config files from the host
COPY eslint.config.mjs ./

# copy source code
COPY src ./src

# start the server in dev mode
CMD ["node", "--watch", "src/index.js"]
