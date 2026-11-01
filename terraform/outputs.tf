output "cluster_name" { value = module.eks.cluster_name }
output "region" { value = var.aws_region }
output "api_ecr_repository_url" { value = aws_ecr_repository.api.repository_url }
output "vpc_id" { value = module.vpc.vpc_id }
output "frontend_ecr_repository_url" { value = aws_ecr_repository.frontend.repository_url }
