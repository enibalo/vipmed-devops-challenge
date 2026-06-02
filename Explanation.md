Part 1: Containerization

Create production-ready Docker images for each service.



1\. \*\*API Gateway\*\* - Node.js/Express service that routes requests (port 3000)

2\. \*\*User Service\*\* - Node.js service that manages user CRUD operations (port 3001)

3\. \*\*Redis\*\* - Data store for user data (port 6379)





###### **Research**

* an image is an immutable package that contains everything... filesystem, files e.t.c that a container ( process ) needs to run. it also optionally contains the command that starts your container ( CMD "node start")
* an image is composed of layers, each layer is a filesystem midificaiton
* each layer is a directory that gets added to the current stage's file system  ( each stage begins with a FROM)
* we use base images to avoid re-creating layers... ( takes up a lot of space on your computer)
* COPY command allows you to copy artificats created in the previous stage into the current stage's file system
* multi-stage builds makes sure that image only contains runtime executable and artificats ( no build tools or testing tools )
* Most common multi-stage pattern. Build stage → Runtime stage ( using executable)
* you can start from scratch using a base image (FROM node:alpine) or you can start from a prev stage artifacts included (FROM build-stage )
* every layer is auto-cached and not re-built unless the cmmd associated with that layer changes or a checksum for a referenced file in cmmd fails in this case all down-stream layers have their caches invalidated as well and are all re-built
* this means that frequently changing layers ( like source code copying ) should be done after static ones ( like dependencies ) 
* best practice to use ONE Docker file and use docker build --target so dev and prod dockerfile env is the same 



###### **My Plan**

* **dependency caching (start with installing dependencies, Docker will auto-cache this stage)**

  * FROM node:20 AS deps
  * create a volume for package.json and package-lock.json so you can develop from within the container... and a volume for the code as well...
  * RUN npm install \&\& instead of multiple RUN 
* **build stage (should create the executable, needs a robust base image)**

  * node:20 for build
  * RUN npm run build
* **dev stage ( from build as dev)** 

  * you need git within the container,
  * you need to enable npm test ports and npm development mode
  * use docker build --target
* \*\***production runtime ( from build as production )**  (\*\*image only contains runtime executable and artificats, needs skinny as possible base image, drop to non-root user and chown all assets to non-root user COPY -chown **)**
* FROM gcr.io/distroless/nodejs18-debian11 ( distroless, skinny image)
* COPY –from=builder /usr/src/app/build /usr/share/nginx/html
* Always use exec form for CMD and ENTRYPOINT -> CMD \["node", "server.js", "--port", "3000"]
* https://github.com/GoogleContainerTools/distroless/blob/main/nodejs/README.md



* **document my Dockerfile**
* **named volume ( use named volume for node\_modules, and code and package\*.json)**
* **create docker-ignore based on chatgpt**



###### **Sources**

* https://oneuptime.com/blog/post/2026-01-06-nodejs-multi-stage-dockerfile/view
* https://medium.com/@udarasenarath/multi-stage-docker-builds-explained-building-smaller-safer-production-images-8b7901e36d06



###### **Instructions**

* Write optimized Dockerfiles with multi-stage builds ( DONE )
* Use minimal, secure base images (non-root user) ( DONE)
* Create .dockerignore files to exclude unnecessary files ( done)
* Keep final images under 200MB
* Implement graceful shutdown handling (SIGTERM) ( DONE, use exec form of CMD and entrypoint https://oneuptime.com/blog/post/2026-01-25-docker-container-signal-handling/view )
* Security best practices (only expose testing ports and env varialble in dev build - DONE)
* Production-ready mindset in images ( DONE )
* Understanding of cloud-native pattern (DONE)
* Clean, well-documented code and configurations  ( DONE)

