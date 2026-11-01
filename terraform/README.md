# Terraform AWS resources
This configuration uses Terraform AWS modules to create a VPC, EKS cluster, managed node group and immutable ECR repository. It uses local Terraform state by default. Store state remotely with locking before team/production use.

Before `apply`, restrict `cluster_endpoint_public_access_cidrs` in `main.tf` to your current public IP `/32`; `0.0.0.0/0` is intentionally called out as a lab default and is not recommended. Review cost and AWS service quotas.
