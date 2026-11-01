module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  version = "5.21.0"
  name = var.project_name
  cidr = "10.0.0.0/16"
  azs = slice(data.aws_availability_zones.available.names, 0, 2)
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets = ["10.0.101.0/24", "10.0.102.0/24"]
  enable_nat_gateway = true
  single_nat_gateway = true
  enable_dns_hostnames = true
  public_subnet_tags = { "kubernetes.io/role/elb" = "1" }
  private_subnet_tags = { "kubernetes.io/role/internal-elb" = "1" }
}
module "eks" {
  source = "terraform-aws-modules/eks/aws"
  version = "20.33.1"
  cluster_name = var.cluster_name
  cluster_version = var.kubernetes_version
  cluster_endpoint_public_access = true
  cluster_endpoint_public_access_cidrs = ["0.0.0.0/0"] # Restrict to your public IP before real use.
  cluster_addons = { coredns = {}, kube-proxy = {}, vpc-cni = {}, eks-pod-identity-agent = {} }
  vpc_id = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets
  eks_managed_node_groups = {
    default = {
      instance_types = var.instance_types
      min_size = var.min_size
      max_size = var.max_size
      desired_size = var.desired_size
    }
  }
  tags = { Project = var.project_name }
}
resource "aws_ecr_repository" "api" {
  name = "blogging-api"
  image_tag_mutability = "IMMUTABLE"
  image_scanning_configuration { scan_on_push = true }
  force_delete = true
}

resource "aws_ecr_repository" "frontend" {
  name = "blogging-frontend"
  image_tag_mutability = "IMMUTABLE"
  image_scanning_configuration { scan_on_push = true }
  force_delete = true
}
