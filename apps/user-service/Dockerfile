# prod-dependency caching stage
FROM node:22.16.0 AS prod-dependency-cache

// choose working directory within the docker container 
WORKDIR /app

// copy the package.json from the host machine 
COPY package*.json ./

// install all dependcies, omit dev dependencies from production 
RUN npm ci --omit=dev

# dev-dependency caching stage
FROM node:22.16.0 AS dev-dependency-cache

// choose the working directory within the docker container
WORKDIR /app

// copy the package.json from the host machine 
COPY package*.json ./

// install all dependencies 
RUN npm ci

# production runtime stage
FROM node:22-alpine AS production

// choose the working directory 
WORKDIR /app

// set the node environment to production 
ENV NODE_ENV=production

// create a non-roout user and group 
RUN addgroup -S nodejs && adduser -S nodeuser -G nodejs

// copy dependencies from the dependency
COPY --from=prod-dependency-cache /app/node_modules ./node_modules

// copy needed files from the host machine
COPY package.json ./
COPY src ./src

// change ownerships of all files to the non-root user
RUN chown -R nodeuser:nodejs /app

//change user of the docker container to the non-root user 
USER nodeuser

//  expose port 3001 from the container
EXPOSE 3001

//start the server 
CMD ["node", "src/server.js"]

# development stage
FROM node:22.16.0 AS development

// set the working directory in the docker container
WORKDIR /app

// set the node environment 
ENV NODE_ENV=development

// install git 
RUN apt-get update && apt-get install -y git 

// add dependencies 
COPY --from=dev-dependency-cache /app/node_modules ./node_modules

// copy needed files from the local host 
COPY package*.json ./
COPY src ./src

// expose port 3001 from the container
EXPOSE 3001

// start the server in dev mode
CMD ["node", "--watch", "src/index.js"]
