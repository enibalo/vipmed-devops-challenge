# DevOps Engineer Challenge

# Table of Contents 
- [Project Overview](#project-overview)
- [Technical Documentation](#technical-documentation)
  - [Web App Architecture Diagram](#web-app-architecture-diagram)
  - [Docker Strategy](#docker-strategy)
    - [Base Image Choice](#base-image-choice)
    - [Multi-Stage Build Strategy](#multi-stage-build-strategy)
    - [Security & Layer Optimization](#security--layer-optimization)
    - [Reliability & Maintainability](#reliability--maintainability)
  - [Kubernetes Strategy](#kubernetes-strategy)
    - [Architecture Diagram](#architecture-diagram)
    - [Environment Separation and Resource Allocation](#environment-separation-and-resource-allocation)
    - [Health Checks and Scaling](#health-checks-and-scaling)
    - [Security](#security)
  - [CI/CD Strategy](#cicd-strategy)
    - [Pipeline diagram](#pipeline-diagram)
- [Future Initiatives](#future-initiatives)
- [Problem-Solving in Practice: Debugging a Connectivity Issue](#problem-solving-in-practice-debugging-a-connectivity-issue)
- [Project Setup](#project-setup)
  - [Prerequisites](#prerequisites)
  - [Quick Start](#quick-start)
  - [Using Docker Compose](#using-docker-compose)

# Project Overview 

Inspired by the **[vipmed-devops-challenge](https://github.com/vipmed-technology/devops-challenge)**, this project was designed to make life easier for developers working on a business-to-consumer web application by applying practical DevOps practices.

* **Automated project setup:** Uses **Docker Compose** to provide a consistent development environment with minimal configuration.

* **CI/CD & code integrity:** Uses **GitHub Actions** to automate linting, testing, and packaging on repository pushes, with Docker images published to **Docker Hub**.

* **Production Kubernetes deployment:** Provides automated container orchestration, scalability, and improved application resilience.

Key technologies: Docker, GitHub Actions, Kubernetes, Kustomize, Node.js


# Technical Documentation

## Web App Architecture Diagram
This diagram shows the flow of HTTP requests when a user interacts with the application. At this stage of development, the app only has an API gateway, a user microservice and a database. The DevOps initiatives focus on these 3 services. 

![Diagram that displays the microservice architecture of the web application. In the diagram, a user sends a request to the API gateway. The API gateway sends it to the user microservice. The user microservice sends a request to the database.](/images/web-app-diagram.svg)

## Docker Strategy 
### Base Image Choice 

 Created 3 images, one for each of the 3 services: the API gateway service, the user microservice, and the database. Used official, version-pinned images to ensure that each had a consistent and secure runtime environment. The Google Node.js Distroless image was used for production for all Node.js based services because it provided a minimal runtime and significantly reduced the image size down to around **~220 MB** in comparison to the **~1.7 GB** development images, making production builds faster.  The Docker Node.js and Redis Docker images were ideal for development because they provided extra tooling which could be used in debugging. Finally, due to how rarely the database would need to be rebuilt, the Docker Redis image was used for the database's production image. 
 
### Multi-Stage Build Strategy
 There are different stages to go through when building an image for production and for development to keep unnecessary dev-tooling outside of the production image. The build strategy looks like this for both production and development images.  Both use a two-stage build strategy. The first stage is a dependency stage, where rarely changing, pre-application tasks, such as installing dependencies, are grouped together. The second is the final stage, where the source code is copied into the image and the entry point command is defined. Organizing the file in this way prevents unnecessary rebuilds while organizing related commands. 

### Security & Layer Optimization

Inspired by the least-privilege principle, the production containers are started by a **non-root user** that's also assigned appropriate file ownership. Layer optimizations are accomplished by placing infrequently changing dependencies before source-code changes and combining related commands like `RUN` and `ENV` to eliminate unnecessary layers.

### Reliability & Maintainability

Graceful shutdown handling for the API Gateway and User Service containers was done using the exec form of `CMD` and by using the `node` command, which allows the Node.js process to receive signals directly. As for the database, the Redis container stores the database in a volume to ensure no data is lost when the database shuts down, and the `redis` CLI is used so termination signals are passed on correctly. Dockerfile comments were added for maintainability and documented the reasoning behind key architectural decisions to make future modifications easier for the development team.

## Kubernetes Strategy 

### Architecture Diagram 
This diagram shows the utilized Kubernetes resources and the relationships between them. The only difference between the production and the development environment is the name of the namespace. 

![ A box called API Gateway Deployment contains the Node JS logo and points to: ConfigMap (./api-gateway.env) and LoadBalancer (Port 3002).  A box called User Service Deployment contains the Node JS logo and points to: ConfigMap (./user-service.env), Secret (./secrets.env) and LoadBalancer (Port 3001). A box called Database Stateful Set contains the Redis logo and points to: Secret (./users.acl) and LoadBalancer (Port 6379)   ](/images/kubernetes-diagram.svg)

### Environment Separation and Resource Allocation

Namespaces are used to logically partition development and production resources. Resource limits and requests were based on official Kubernetes examples, Redis documentation, and reliable technical articles. Production receives roughly twice the resources of development to account for the significant difference in throughput the client-facing application would receive. 

### Health Checks and Scaling

A liveness probe was used to detect applications that have become stuck or unresponsive, while the readiness probe was used to check whether the application and its dependencies are ready to handle requests. `initialDelaySeconds` gives the application enough time to start before health checks begin, helping prevent unnecessary restarts and pod flapping. Rolling updates were included to allow Kubernetes to create and verify a healthy replacement pod before terminating an existing pod.

### Security 

Kubernetes Secret objects are used to keep sensitive configuration separate from the application manifests, but since secrets are only hashed, they wouldn't be suitable for use in production. Once the development team has a more stable application, this Kubernetes deployment would be deployed in a cloud platform, and their well-established secret-management service could replace the Secret objects.

## CI/CD Strategy 

### Pipeline Diagram
This diagram outlines the high-level steps in the GitHub Actions pipeline that is triggered when a developer pushes to any branch in the GitHub repository. The "images" referenced in the diagram are the API gateway and user service. These two services are currently under active development and are being tracked in Docker Hub.

![ A developer pushes to GitHub. This triggers a Git Actions Pipeline. The pipeline executes this sequence of steps: Build images, lint and test images, build production or development images based on the pushed branch and tag, tag the images, and push the images to the Docker Hub registry. This same description is shown using boxes and arrows in the diagram. ](/images/git-actions-pipeline.svg)

# Future Initiatives
This project created a solid DevOps foundation for the web application. As the application became more complex and moved towards production, these are the initiatives I would suggest investing in:  

1. I would use a Redis primary/replica configuration to improve availability rather than relying on a single database instance. Due to the technical complexity of setting this up, a single database instance was used for now since it was an adequate solution for this stage of development.

2. I would spend more time on security. For example, restricting access to the plaintext ACL file in the Kubernetes deployment using Linux security mechanisms to secure the database usernames and passwords. I would also use Kubernetes NetworkPolicies to limit traffic to only the ports required by the application. 

3. I would use Kubernetes Horizontal Pod Autoscaling (HPA), driven by resource utilization metrics such as CPU and memory, to automatically scale application pods based on demand so the application can scale up to manage heavier workloads. 

4. I would establish a naming convention document for the DevOps team before the configuration becomes more complex to ensure consistency, improve clarity, and make onboarding new team members easier.


# Problem-Solving in Practice: Debugging a Connectivity Issue
A walkthrough of my debugging process using a Kubernetes connectivity issue I encountered during the project.

**Symptom:** API requests to the gateway failed with “failed to fetch users”, and initial logs gave no useful detail.

**Reproduced and isolated the failure:**  Traced the error to a failed HTTP request between the API gateway and user-service using kubectl describe pod and container logs. Discovered that the user-service was encountering some sort of Redis error using the logs.

**Improved observability before debugging further:** Found that error objects were being passed incorrectly to the Winston logger, stripping out the actual error details. Fixed the logging pattern project-wide, which gave more details on the Redis error: authentication failure.

**Ruled out the obvious cause:** Compared the Redis credentials used by the user-service to the access control file in my project directory. They were valid, so the issue wasn’t the credential values themselves.

**Compared configurations for drift:** Compared the working docker-compose.yml against redis.yaml; found no meaningful differences, ruling out a config mismatch.

**Inspected the runtime environment directly:** Instead of continuing to guess from config files, exec’d into the container to check whether the expected credentials file actually existed at runtime.

**Identified the root cause:** Discovered the credentials “file” was actually being mounted as a directory because the file name was included in the `mountPath` in the redis.yaml manifest. 

**Fix:** Corrected the volume mount configuration so the ConfigMap key was mounted as a file at the expected path rather than as a directory.

# Project Setup

## Prerequisites

- Docker & Docker Compose
- kubectl
- [kind](https://kind.sigs.k8s.io/) (Kubernetes in Docker) - **Recommended**
- Node.js 20+ (for local development only)

## Quick Start

```bash
# 1. Create local cluster
kind create cluster --name devops-challenge

# 2. Deploy
kubectl apply -k k8s/overlays/dev

# 3. Test
kubectl port-forward svc/api-gateway 3002:3002
curl http://localhost:3002/health
curl http://localhost:3002/api/users
```

## Using Docker Compose

```bash
docker-compose up -d
curl http://localhost:3002/health
curl http://localhost:3002/api/users
```

