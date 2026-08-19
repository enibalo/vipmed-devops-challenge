#  Project overview 

A pipeline and ....

# Architecture Documentation

## System Architecture

Draw or describe the architecture of your deployment
- diagram of an API request of a user 
- ci/cd pipeline 
- ask chatpgt check video for one more

## Your Decisions

### Docker Strategy 
### 1. Base Image Choice 

 Used official, version-pinned Docker Node.js for development and Google Distroless images for production to ensure a consistent and secure run-time environment. The Distroless image provided a minimal runtime that reduced image size, and attack surface and resulted in final image size of **~220 MB**.  The Node.js images provided extra-tooling which could be used in debugging. 
 
 ### 2. Multi-Stage Build Strategy
 A separate dependency stage comes before the final stage for production and development. This stage organized rarely changing pre-application routines into one section before copying the source code. This would prevent unnecessary layer re-builds making builds faster. Finally, there was a separate final stage for production and another for development to keep unnecessary dev-tooling outside of the production image. 

### 3. Security & Layer Optimization

Applied least-privilege principles by running the production container as a **non-root user** and assigning appropriate file ownership. Optimized Docker layers by placing infrequently changing dependencies before source-code changes and combining related `RUN` commands to minimize unnecessary layers and rebuilds.

### 4. Reliability & Maintainability

Implemented graceful shutdown handling for `SIGTERM` and `SIGINT` in the API Gateway and User Service, using Docker's exec-form `CMD` and the `node` command so Node.js runs as PID 1 and receives signals directly. Added Dockerfile comments for maintainability and documented the reasoning behind key architectural decisions to make future modifications easier for the development team.


### Kubernetes Design

## 1. Environment Separation and Resource Allocation

Namespaces are used to logically partition development and production resources. Resource limits and requests were based on official Kubernetes examples, Redis documentation, and reliable technical articles for the Node.js services. Production receives roughly twice the resources of development to account for the signifant difference in throughput the client-facing application would receive. 

## 2. Health Checks and Scaling

A liveness prove was used to detect applications that have become stuck or unresponsive, while the readiness probe was used to check whether the application and its dependencies are ready to handle requests. `initialDelaySeconds` gives the application enough time to start before health checks begin, helping prevent unnecessary restarts and pod flapping. Rolling updates were included to allow Kubernetes to create and verify a healthy replacement pod before terminating an existing pod.

## 3. Security 

Kubernetes Secret objects are used to keep sensitive configuration separate from the application manifests, but since secrets are only hashed they wouldn't be suitable for real-life production. In a managed Kubernetes environment such as AWS, the platform's well-established secret-management service could be integrated with Kubernetes instead. 

### CI/CD Pipeline

- Pipeline stages:
- Secret management:

## What I Would Improve With More Time
1. I would plan out my naming strategy in advance. An inconsistent switch between prod and production could become an issue in a bigger project. 
2. use redis primary/replica configuration instead of having only 1 database... in the future 
3. Least acess security rules for the aclfile have a network policy object to restrict traffic to the ports we need to run our applicaiton 
4. in the future I would use Horizontal Pod Scaler along with grafana or prometheus metrics to scale up or down container based on metrics that reflect overuse of a container...*please change to k8s native way of doing this if it isn;t a thing.*
5. I would use measured metrics instead of guessed metrics for readiness and liveliness probe... 


