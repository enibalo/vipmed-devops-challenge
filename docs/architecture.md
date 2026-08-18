# Architecture Documentation

## System Architecture

Draw or describe the architecture of your deployment.

## Your Decisions

### Docker Strategy 
### 1. Base Image Choice & Multi-Stage Build Strategy

Implemented a multi-stage build with separate dependency, development, and production stages. This kept the final production image at **220 MB** by avoiding unnecessary development tooling while allowing developers access to dev tools in the devlopment image. Used official, version-pinned Docker Node.js and Google Distroless images to ensure a consistent and secure run-time environment. A separate dependency stage contains all pre-application start up routines to architecturally enforce layer optimization. The Distroless image was used for the production image and provided a minimal runtime that reduces image size, deployment time, and attack surface while the Node.js images were used for all the other stages and came packed with extra-tooling which could be used in debugging.

### 2. Security & Layer Optimization

Applied least-privilege principles by running the production container as a **non-root user** and assigning appropriate file ownership. Optimized Docker layers by placing infrequently changing dependencies before source-code changes and combining related `RUN` commands to minimize unnecessary layers and rebuilds.

### 3. Reliability & Maintainability

Implemented graceful shutdown handling for `SIGTERM` and `SIGINT` in the API Gateway and User Service, using Docker's exec-form `CMD` and the `node` command so Node.js runs as PID 1 and receives signals directly. Added Dockerfile comments for maintainability and documented the reasoning behind key architectural decisions to make future modifications easier for the development team.


### Kubernetes Design

- Namespace strategy:
- Resource allocation rationale:
- Health check configuration:
- Scaling strategy:

### CI/CD Pipeline

- Pipeline stages:
- Deployment strategy:
- Rollback approach:
- Secret management:

### Environment & Secrets Management

- How do you separate config from code?
- How do you handle sensitive vs non-sensitive config?
- How would you manage secrets in production? (e.g., Vault, Sealed Secrets, external-secrets, SOPS)
- How do you handle different environments (dev/staging/prod)?

## Trade-offs & Assumptions

1. **Trade-off 1:**
   - Decision:
   - Rationale:
   - Alternative considered:

## Security Considerations

Document security measures you implemented.

## What I Would Improve With More Time

1.
2.
3.

