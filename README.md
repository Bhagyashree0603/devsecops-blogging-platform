# DevSecOps Blogging Platform on AWS EKS

A learning/reference implementation of a full-stack blogging platform and DevSecOps delivery pipeline.

## Stack
- React + Vite frontend
- Node.js + Express REST API
- PostgreSQL database
- Docker Compose for local development
- Jenkins pipeline, SonarQube, Trivy
- AWS ECR, Terraform, EKS, Kubernetes, Helm
- Prometheus + Grafana via kube-prometheus-stack

> **Important:** This is a starter project, not a production-certified platform. Review IAM, networking, secrets, image policies, backups, TLS, database persistence and costs before exposing it publicly. The EKS Terraform creates billable AWS resources. Run `terraform destroy` when finished.

## Prerequisites (Windows 11 / PowerShell)
Install Docker Desktop, Git, Node.js 20+, AWS CLI v2, Terraform, kubectl, Helm and Java (for local SonarQube scanner if desired). Start Docker Desktop.

## 1. Run locally
```powershell
Copy-Item .env.example .env
# Edit .env and replace JWT_SECRET and POSTGRES_PASSWORD with strong local values.
docker compose up --build -d
 docker compose ps
```
Open http://localhost:5173. Local Compose builds the frontend with `VITE_API_URL=http://localhost:4000`; for AWS build the frontend with an empty `VITE_API_URL` so Nginx proxies `/api` internally. API health: http://localhost:4000/api/health. Stop: `docker compose down`. Remove local DB data too: `docker compose down -v` (destructive).

Demo accounts are not pre-created. Register a user in the UI, then create posts. API endpoints are listed below.

## 2. Run tests
```powershell
cd backend; npm install; npm test; cd ..
cd frontend; npm install; npm run build; cd ..
```

## 3. GitHub + Jenkins
1. Create an empty GitHub repository and push this folder.
2. In Jenkins install Pipeline, Git, NodeJS (optional), SonarQube Scanner and Credentials Binding plugins.
3. Configure credentials: `sonar-token` (Secret text), `aws-credentials` (AWS access key/secret pair), and `aws-account-id` (Secret text). Configure SonarQube server name `sonarqube` in Jenkins global configuration.
4. Set Jenkins job parameters `AWS_REGION` (default `ap-south-1`), `AWS_ACCOUNT_ID`, `EKS_CLUSTER_NAME` (`blogging-eks`), `ECR_REPOSITORY` (`blogging-api`) and `K8S_NAMESPACE` (`blogging`). Adjust the frontend repo similarly if publishing it separately.
5. The Jenkinsfile runs tests, SonarQube, Trivy, builds and pushes both API and frontend images, then deploys the Helm chart. The frontend Nginx container proxies `/api/` to the in-cluster API Service. Ensure Terraform has created both ECR repositories before running the pipeline. It assumes the Jenkins agent has Docker, AWS CLI, kubectl and Helm installed and is authorized to access the EKS cluster. Do not run untrusted pull-request code with privileged credentials.

## 4. AWS infrastructure
Configure AWS credentials locally:
```powershell
aws configure
aws sts get-caller-identity
```
Review `terraform/terraform.tfvars.example`, copy it to `terraform/terraform.tfvars`, set a unique S3 bucket only if you later configure remote state (the starter uses local state), and choose a region. Then:
```powershell
cd terraform
terraform init
terraform fmt -recursive
terraform validate
terraform plan -out tfplan
# Review tfplan and estimated AWS costs before applying.
terraform apply tfplan
```
Connect kubectl:
```powershell
aws eks update-kubeconfig --region ap-south-1 --name blogging-eks
kubectl get nodes
```
Terraform provisions VPC, ECR, EKS and managed node group. AWS EKS and related networking/compute are chargeable.

## 5. Deploy with Helm
Build and push the API image to the ECR URL output by Terraform. Build/push frontend separately if using a remote frontend deployment. Then:
```powershell
helm upgrade --install blogging-app .\helm\blogging-app --namespace blogging --create-namespace `
  --set image.repository=YOUR_ACCOUNT.dkr.ecr.ap-south-1.amazonaws.com/blogging-api `
  --set image.tag=latest `
  --set frontend.image.repository=YOUR_ACCOUNT.dkr.ecr.ap-south-1.amazonaws.com/blogging-frontend `
  --set frontend.image.tag=latest
kubectl get pods,svc -n blogging
```
For a production setup, use immutable image tags (commit SHA), external secrets, managed PostgreSQL (RDS), TLS ingress and a proper backup/restore plan. The in-cluster PostgreSQL chart in this starter is for demonstration only.

## 6. Monitoring
```powershell
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
helm upgrade --install monitoring prometheus-community/kube-prometheus-stack --namespace monitoring --create-namespace -f monitoring/values.yaml
kubectl get pods -n monitoring
kubectl port-forward svc/monitoring-grafana 3000:80 -n monitoring
```
Open http://localhost:3000. Default chart admin username is `admin`; obtain the generated password:
```powershell
$secret = kubectl get secret monitoring-grafana -n monitoring -o jsonpath="{.data.admin-password}"
[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($secret))
```
Do not expose Grafana publicly without authentication and TLS.

## API overview
- `GET /api/health`
- `POST /api/auth/register` `{ "name", "email", "password" }`
- `POST /api/auth/login` `{ "email", "password" }`
- `GET /api/posts` (public)
- `GET /api/posts/:id` (public)
- `POST /api/posts` (Bearer JWT)
- `PUT /api/posts/:id` (owner only)
- `DELETE /api/posts/:id` (owner only)

## Cleanup
```powershell
helm uninstall blogging-app -n blogging
helm uninstall monitoring -n monitoring
cd terraform
terraform destroy
```
Also delete any manually created ECR images/repositories, snapshots, load balancers or other resources not managed by Terraform. `terraform destroy` does not remove local Docker volumes. To remove local data: `docker compose down -v`.

## Viva talking points
- CI validates and tests every change; CD delivers an approved artifact to an environment.
- Docker packages application dependencies into repeatable images.
- ECR stores versioned container images; EKS runs Kubernetes workloads.
- Terraform makes infrastructure repeatable and reviewable through `plan`.
- SonarQube evaluates static code quality; Trivy scans images/filesystems for known vulnerabilities.
- Kubernetes Deployments maintain replicas; readiness/liveness probes protect traffic and restart unhealthy containers.
- Prometheus scrapes metrics; Grafana visualizes them and supports alerting.
- Blue-Green uses two parallel versions and changes traffic after validation; this starter includes a documented manual selector switch rather than claiming automatic rollback is already enabled.
