# DevOps Engineer Challenge

- fix the header formatting ## vs ### ( the sizing is inconcsistent )
- add architecture stuff 
- add table of contents 


## Debugging Walkthrough
A walkthrough of my debugging process using a Kubernetes connectivity issue I encountered during the project.

**Symptom:** API requests to the gateway failed with “failed to fetch users”, and initial logs gave no useful detail.

**Reproduced and isolated the failure:**  Traced the error to a failed HTTP request between the API gateway and user-service using kubectl describe pod and container logs. Discovered that the user-service was encountering some sort of Redis error using the logs.

**Improved observability before debugging further:** Found that error objects were being passed incorrectly to the Winston logger, stripping out the actual error details. Fixed the logging pattern project-wide, which gave more details on the Redis error: authentication failure.

**Ruled out the obvious cause:** Compared the Redis credentials used by the user-service to the access control file in my project directory. They were valid, so the issue wasn’t the credential values themselves.

**Compared configurations for drift:** Compared the working docker-compose.yml against redis.yaml; found no meaningful differences, ruling out a config mismatch.

**Inspected the runtime environment directly:** Instead of continuing to guess from config files, exec’d into the container to check whether the expected credentials file actually existed at runtime.

**Identified the root cause:** Discovered the credentials “file” was actually being mounted as a directory because the file name was included in the `mountPath` in the redis.yaml manifest. 

**Fix:** Corrected the volume mount configuration so the ConfigMap key was mounted as a file at the expected path rather than as a directory.

## Project Set Up

### Prerequisites

- Docker & Docker Compose
- kubectl
- [kind](https://kind.sigs.k8s.io/) (Kubernetes in Docker) - **Recommended**
- Node.js 20+ (for local development only)

### Quick Start

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

### Using Docker Compose

```bash
docker-compose up -d
curl http://localhost:3002/health
curl http://localhost:3002/api/users
```

