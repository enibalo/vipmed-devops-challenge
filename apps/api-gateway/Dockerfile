# prod-dependency caching stage
FROM node:22-alpine AS prod-dependency-cache

# choose working directory within the docker container 
WORKDIR /app

# copy the package.json from the host machine 
COPY package*.json ./

# install all dependcies, omit dev dependencies from production 
RUN npm ci --omit=dev

# dev-dependency caching stage
FROM node:22-alpine AS dev-dependency-cache

# choose the working directory within the docker container
WORKDIR /app

# copy the package.json from the host machine 
COPY package*.json ./

# install all dependencies 
RUN npm ci

# production runtime stage
FROM gcr.io/distroless/nodejs22-debian12:nonroot AS production

# choose the working directory 
WORKDIR /app

# set default environment variables in case a .env file is not provided 
ENV PORT=3000 \
    USER_SERVICE_URL=http://localhost:3001 \
    LOG_LEVEL=info \
    NODE_ENV=production

# copy cached and context files into file system
COPY --from=prod-dependency-cache /app/node_modules ./node_modules
COPY --from=prod-dependency-cache /app/package.json  ./
COPY src ./src

# document port that the api-gateway listens on
EXPOSE $PORT

#start the server 
CMD [ "src/index.js"]


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

# copy dependencies, config and source files into the file system 
COPY --from=dev-dependency-cache /app/node_modules ./node_modules 
COPY --from=dev-dependency-cache /app/package*.json  ./
COPY eslint.config.mjs ./
COPY src ./src

# start the server in dev mode
CMD ["node", "--watch" ,"src/index.js"]
