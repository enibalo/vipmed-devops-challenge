#  Project overview 

Inspired by the **[vipmed-devops-challenge](https://github.com/vipmed-technology/devops-challenge)**, this project was designed to make life easier for developers working on a busineess-to-consumer web application by applying practical DevOps practices.

* **Automated project setup:** Uses **Docker Compose** to provide a consistent development environment with minimal configuration.

* **CI/CD & code integrity:** Uses **GitHub Actions** to automate linting, testing, and packaging on repository pushes, with Docker images published to **Docker Hub**.

* **Production Kubernetes deployment:** Provides automated container orchestration, scalability, and improved application resilience.

Key DevOps technologies: Docker, GitHub Actions, Kubernetes, Kustomize, Node.js, Infrastructure-as-Code


# Architecture Documentation

## Web App Architecture Diagram
Diagram of the business-to-consumer web application which displays the app's services and the flow of HTTP requests when a user interacts with the application at the current stage of development. Note that at this time the app only has an api gateway, a user microservice and a database. The DevOps initiatives focus on these 3 components. 

< INSERT DIAGRAM >

## Kubernetes Architecture Diagram 
Diagram of the Kubernetes infrastructure which displays the utilized resources and the relationships between them. 

< INSERT DIAGRAM >

## Your Decisions

### Docker Strategy 
### 1. Base Image Choice 

 Created 3 images, one for each of the 3 services: the api gateway service, the user microservice, and the database. Used official, version-pinned images to ensure that each had a consistent and secure run-time environment. The Google Node.js Distroless image was used for production for all Node.js-based services because it provided a minimal runtime and significantly reduced the image size down to around **~220 MB** in comarpison to the **~1.7GB** development images.  The Docker Node.js and Redis Docker were ideal for development because they provided extra-tooling which could be used in debugging. Finally, due to how rarely the database would need to be rebuilt, the Docker Redis image was used for the database's production image. 
 
 ### 2. Multi-Stage Build Strategy
 There are different stages to go through when building an image for production and for development to keep unnecessary dev-tooling outside of the production image. The build-strategy looks like so for production and development images: There are 2 stages.  A final stage where source code is copied over and the entrypoint command is issued. And a dependency stage organizing rarely changing pre-application routines into one section which came before the final stage. Organizing the file in this way prevents unnecesary rebuilds while organizing related commands. 

### 3. Security & Layer Optimization

Inspired by the least-privilege principle the production container are started by a **non-root user** that's also assigned appropriate file ownership. Layer optimizations is accomplished by placing infrequently changing dependencies before source-code changes and combining related commands like `RUN` and `ENV` to eliminate unnecessary layers.

### 4. Reliability & Maintainability

Graceful shutdown handling for `SIGTERM` and `SIGINT` in the API Gateway and User Service, was done using Docker's exec-form `CMD` and the `node` command which allows Node.js to run as PID 1 and receive signals directly. Dockerfile comments were added for maintainability and documented the reasoning behind key architectural decisions to make future modifications easier for the development team.


### Kubernetes Design

## 1. Environment Separation and Resource Allocation

Namespaces are used to logically partition development and production resources. Resource limits and requests were based on official Kubernetes examples, Redis documentation, and reliable technical articles. Production receives roughly twice the resources of development to account for the signifant difference in throughput the client-facing application would receive. 

## 2. Health Checks and Scaling

A liveness probe was used to detect applications that have become stuck or unresponsive, while the readiness probe was used to check whether the application and its dependencies are ready to handle requests. `initialDelaySeconds` gives the application enough time to start before health checks begin, helping prevent unnecessary restarts and pod flapping. Rolling updates were included to allow Kubernetes to create and verify a healthy replacement pod before terminating an existing pod.

## 3. Security 

Kubernetes Secret objects are used to keep sensitive configuration separate from the application manifests, but since secrets are only hashed they wouldn't be suitable for use in production. Once the development team has a more stable application this Kubenetes deployment would be deployed in a cloud platform and their well-established secret-management service could replace the Secret objects.

### CI/CD Pipeline
This outlines the high-level step in the Github Actions pipelien that is triggered when a developer pushes to any branch in the github repository.

<- INSERT DIAGRAM ->

## What I Would Improve With More Time
This project created a solid DevOps foundation for the web application. As the application became more complex and moved towards production these are the initiatives I would suggest investing in:  

1. I would use a Redis primary/replica configuration to improve availability rather than relying on a single database instance. Due to the technical complexity of setting this up a single database instance was used for now since it was an adequate solution for this stage of development.

2. I would spend mre time on security. For example, restricting access to the plaintext ACL file in the Kubenretes deployment using Linux security mechanisms to secure the database usernames and passwords. I would also use Kubernetes NetworkPolicies to limit traffic to only the ports required by the application. 

3. I would use Kubernetes Horizontal Pod Autoscaling (HPA), driven by resource utilization metrics such as CPU and memory, to automatically scale application pods based on demand so the applicaiton can successfully manage varying workloads. 

4. I would establish a naming convention document for the DevOps team before the configuration becomes more complex to ensure consistency, improve clarity, and make onboarding new team members easier.






