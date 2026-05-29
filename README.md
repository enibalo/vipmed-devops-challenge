# DevOps Engineer Challenge

## Overview

This challenge evaluates your skills in containerization, Kubernetes orchestration, CI/CD pipelines, monitoring, and production troubleshooting. You will deploy a microservices application to a Kubernetes cluster with proper observability and automation.

**Estimated time:** 8-12 hours

**Difficulty:** Intermediate to Advanced

## What We're Looking For

- Clean, well-documented code and configurations
- Security best practices
- Production-ready mindset
- Problem-solving and debugging skills
- Understanding of cloud-native patterns

## The Application

A simple microservices application consisting of:

1. **API Gateway** - Node.js/Express service that routes requests (port 3000)
2. **User Service** - Node.js service that manages user CRUD operations (port 3001)
3. **Redis** - Data store for user data (port 6379)

---

## Part 1: Containerization

Create production-ready Docker images for each service.

- [ ] Write optimized Dockerfiles with multi-stage builds
- [ ] Use minimal, secure base images (non-root user)
- [ ] Create `.dockerignore` files to exclude unnecessary files
- [ ] Keep final images under 200MB
- [ ] Implement graceful shutdown handling (SIGTERM)

**Deliverables:**
- `apps/api-gateway/Dockerfile`
- `apps/api-gateway/.dockerignore`
- `apps/user-service/Dockerfile`
- `apps/user-service/.dockerignore`

---

## Part 2: Kubernetes Deployment

Deploy the application to Kubernetes using Kustomize.

- [ ] Create manifests: Deployments, Services, ConfigMaps, Secrets
- [ ] Manage environment configuration properly:
  - Use ConfigMaps for non-sensitive config (ports, URLs, log levels)
  - Use Secrets for sensitive data (passwords, API keys)
  - **Never hardcode secrets in manifests or code**
  - Explain how you would manage secrets in a real production environment
- [ ] Implement health checks:
  - Liveness probes (`/health/live`) - when to restart a container
  - Readiness probes (`/health/ready`) - when to send traffic
  - Configure appropriate thresholds and timeouts
- [ ] Configure resource requests and limits
- [ ] Set up Horizontal Pod Autoscaler (HPA)
- [ ] Implement Network Policies to restrict pod-to-pod traffic
- [ ] Create Kustomize overlays for `dev` and `prod` environments

**Deliverables:**
- `k8s/base/` - Base manifests with `kustomization.yaml`
- `k8s/overlays/dev/` - Development overrides
- `k8s/overlays/prod/` - Production overrides

---

## Part 3: CI/CD Pipeline

Automate building, testing, and deploying the application.

- [ ] Create a GitHub Actions workflow that:
  - Builds and pushes Docker images on push
  - Runs linting and tests (`npm test`)
  - Deploys to Kubernetes based on branch:
    - `develop` -> dev environment
    - `main` -> prod environment
  - Sends a notification on deploy success/failure
- [ ] Use proper secrets management (no hardcoded credentials)
- [ ] Handle environment-specific variables (dev vs prod)
- [ ] Implement image tagging strategy (not just `latest`)

**Registry Options (choose one):**
- GitHub Container Registry (ghcr.io) - **Recommended, free**
- Docker Hub
- AWS ECR (if you have an account)

**Deliverables:**
- `.github/workflows/ci-cd.yml`

---

## Part 4: Monitoring & Observability

Add observability to the application.

- [ ] Add Prometheus metrics endpoint (`/metrics`) to both services
- [ ] Implement structured JSON logging (replace `console.log`)
- [ ] Create a monitoring setup:
  - **Option A:** Deploy Prometheus + Grafana to the cluster
  - **Option B:** Document a monitoring strategy with tool choices
- [ ] Define at least 3 alerting rules (documentation only is fine)

**Deliverables:**
- Updated application code with `/metrics` and structured logging
- `docs/monitoring-strategy.md`

---

## Part 5: Troubleshooting

A broken deployment exists in `k8s/broken/`. These manifests were deployed to production and the application is not working.

- [ ] Review the manifests in `k8s/broken/`
- [ ] Identify **all issues** (there are at least 8)
- [ ] Document each issue with:
  - What is wrong
  - Why it causes a problem
  - How to fix it

**Deliverables:**
- `docs/troubleshooting.md`

---

## Local Development

### Prerequisites

- Docker & Docker Compose
- kubectl
- [kind](https://kind.sigs.k8s.io/) (Kubernetes in Docker) - **Recommended**
- Node.js 20+ (for local development only)

### Quick Start

```bash
# 1. Create local cluster
kind create cluster --name devops-challenge

# 2. Build and load images
docker build -t devops-challenge/api-gateway:local ./apps/api-gateway
docker build -t devops-challenge/user-service:local ./apps/user-service
kind load docker-image devops-challenge/api-gateway:local --name devops-challenge
kind load docker-image devops-challenge/user-service:local --name devops-challenge

# 3. Deploy
kubectl apply -k k8s/overlays/dev

# 4. Test
kubectl port-forward svc/api-gateway 3000:3000
curl http://localhost:3000/health
curl http://localhost:3000/api/users
```

### Using Docker Compose

```bash
docker-compose up -d
curl http://localhost:3000/health
curl http://localhost:3000/api/users
```

---

## Project Structure

```
.
├── README.md
├── docker-compose.yml
├── apps/
│   ├── api-gateway/
│   │   ├── src/
│   │   │   ├── index.js
│   │   │   └── index.test.js
│   │   ├── package.json
│   │   ├── package-lock.json
│   │   ├── .dockerignore        # CREATE THIS
│   │   └── Dockerfile           # CREATE THIS
│   └── user-service/
│       ├── src/
│       │   ├── index.js
│       │   └── index.test.js
│       ├── package.json
│       ├── package-lock.json
│       ├── .dockerignore        # CREATE THIS
│       └── Dockerfile           # CREATE THIS
├── k8s/
│   ├── base/                    # CREATE THIS
│   ├── overlays/
│   │   ├── dev/                 # CREATE THIS
│   │   └── prod/                # CREATE THIS
│   └── broken/                  # TROUBLESHOOT THIS (Part 5)
├── .github/
│   └── workflows/
│       └── ci-cd.yml            # CREATE THIS
└── docs/
    ├── architecture.md          # UPDATE with your decisions
    ├── monitoring-strategy.md   # UPDATE with your strategy
    └── troubleshooting.md       # UPDATE with issues found
```

---

## Evaluation Criteria

| Category | Weight | What We Look For |
|----------|--------|------------------|
| **Docker** | 15% | Multi-stage builds, security, .dockerignore, graceful shutdown |
| **Kubernetes** | 25% | Health checks, resource management, HPA, Network Policies, Kustomize |
| **CI/CD** | 20% | Pipeline design, image tagging, secrets, branching strategy |
| **Monitoring** | 15% | Prometheus metrics, structured logging, alerting strategy |
| **Troubleshooting** | 15% | Ability to identify and explain issues in broken manifests |
| **Documentation** | 10% | Clarity, completeness, trade-offs explained |

---

## Bonus Points

- [ ] Implement GitOps with ArgoCD or Flux
- [ ] Implement canary or blue-green deployments
- [ ] Add integration tests in the pipeline
- [ ] Set up distributed tracing (OpenTelemetry)
- [ ] Implement Pod Disruption Budgets
- [ ] Add security scanning (Trivy, Snyk) in the pipeline

---

## Submission

1. **Fork this repository**
2. **Create a branch** with your name: `solution/your-name`
3. **Implement the challenge**
4. **Create a Pull Request** to this repository
5. **Include in your PR description:**
   - Time spent on each part
   - Any assumptions made
   - What you would improve with more time

---

## Tips

- Start with Docker, then Kubernetes, then CI/CD
- Test locally before adding CI/CD
- Document as you go, not at the end
- Quality over quantity - it's better to do 4 parts well than 5 parts poorly
- Read the broken manifests carefully - some issues are subtle

---

## What Really Matters

This challenge is not about perfection or completing every single item. What we truly care about is understanding **how you think and solve problems**.

- **Your reasoning matters more than the result.** We want to see why you made each decision, not just what you built.
- **There is no single correct answer.** Different approaches can be equally valid. What matters is that you can explain and defend yours.
- **Show your debugging process.** When something doesn't work, how do you investigate? What tools do you use? How do you narrow down the cause?
- **Be honest about trade-offs.** Every technical decision has pros and cons. Acknowledging them shows maturity.
- **Document what you don't know.** If you're unsure about something, say so and explain what you would research or ask about.

We're looking for someone who can operate production infrastructure with confidence, make sound decisions under uncertainty, and communicate clearly about technical problems.

---

**Good luck!**
