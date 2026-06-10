# Architecture Documentation

> **Note to Candidate:** Replace this template with your actual architecture decisions.

## System Architecture

Draw or describe the architecture of your deployment.

## Your Decisions

### Docker Strategy 

- Multi-stage build approach:
- I decided to split up the image building process into two stages: dependency stage and build stage. Dependency installation stage would install all npm dependencies. The building stage would take care of anything else needed to build the image. It's a popular design pattern that ensures that Docker reuses cached dependency when only source code changes, making build times faster. 

- I decided to have a dependency and build stage for production and a different dependency and build stage development. Developers need extra toolding and development dependencies that are unnecessary in production and that would increase the attack surface of the production container. 

- If I had more complex build process I would have created a shared stage called "prep" for shared steps that need to happen for both production and development images. 

- Base image choice:
- I chose to use the official Node image for the dependency and development stages as it would contain everything I needed to complete to create a Nodejs image. Size was not a concern so the default image base was fine. Its also well-tested and developed by trusted contributors. 

- I chose to use version 22.16.0 of the official Node docker image for the development and docker stage to avoid unexpected changes caused by the future releases of the image. 

- I chose to use the alpine base image for the production build stage because it's minimal Docker image which takes up only 5MB space on its own. A small base image will lead to smaller final image, making pushing builds to production faster.    

- Security considerations:
- Applied the principle of least privilege: I made a non-root user in the production stage. I assigned all files to them, and then I made the Docker container switch from running as a root user to the non-root user. 
- Time-tested tools: Used official Docker images.  

- Layer optimization:
- Frequently changing layers ( copying the source code ) is defined after infrequent layers. This prevents cascading effects of unecessary re-builds. 
- Conjoined RUN commmands using the "&&" operator, this condenses multiple RUN layers into one. 

- Implement graceful shutdown: 
-  I added cleanup code within the api-gateway and user-service index.js files to handle SIGTERM and SIGINT signals
- I used the exec form of the CMD to ensure that the node process runs directly as the process's PID 1 and gets passed any SIGTERM and SIGINT signals 
- I did not use npm to start the server's as npm would not forward signals to the node process, and would prevent us from runnning the graceful shutdown code. 

- Documentation: 
- I left comments in the Docker file to ensure that future team mates can modify it smoothly. 

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

### Monitoring Strategy

- Metrics collected:
- Logging format:
- Alerting rules (proposed):

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

## Time Spent

| Task | Time |
|------|------|
| Part 1: Docker | |
| Part 2: Kubernetes | |
| Part 3: CI/CD | |
| Part 4: Monitoring | |
| Part 5: Troubleshooting | |
| Documentation | |
| **Total** | |
