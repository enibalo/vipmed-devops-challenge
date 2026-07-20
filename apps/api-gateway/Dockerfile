# prod-dependency caching stage
FROM node:22.16.0 AS prod-dependency-cache

# choose working directory within the docker container 
WORKDIR /app

# copy the package.json from the host machine 
COPY package*.json ./

# install all dependcies, omit dev dependencies from production 
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

# set default environment variables in case a .env file is not provided 
ENV PORT=3000 \
    USER_SERVICE_URL=http://localhost:3001 \
    LOG_LEVEL=info \
    NODE_ENV=production

# copy dependencies from the production cache - package.json copied to document the installed dependencies 
COPY --from=prod-dependency-cache /app/node_modules ./

# add package files 
COPY --from=prod-dependency-cache /app/package*.json  ./

# copy source code
COPY src ./src

# create a non-root user and group 
RUN addgroup -S nodejs && adduser -S nodeuser -G nodejs \ 
# change ownerships of all files to the non-root user
    chown -R nodeuser:nodejs /app

# change user of the docker container to the non-root user 
USER nodeuser

#  document port that the api-gateway listens on
EXPOSE $PORT

#start the server 
CMD ["node", "src/server.js"]


# development stage
FROM node:22.16.0 AS development

# set the working directory in the docker container
WORKDIR /app

# set default environment variables in case a .env file is not provided 
ENV PORT=3000 \
    USER_SERVICE_URL=http://localhost:3001 \
    LOG_LEVEL=info \
    NODE_ENV=production


# install git 
RUN apt-get update && apt-get install -y git 

# document port that the api-gateway listens on
EXPOSE $PORT

# add dependencies 
COPY --from=dev-dependency-cache /app/node_modules ./node_modules 

# add package files 
COPY --from=dev-dependency-cache /app/package*.json  ./

# copy linter config files from host
COPY eslint.config.mjs ./

# copy source code 
COPY src ./src

# start the server in dev mode
CMD ["node", "--watch" ,"src/index.js"]
