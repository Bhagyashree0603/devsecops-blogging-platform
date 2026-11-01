variable "aws_region" {
  type = string
  default = "ap-south-1"
}
variable "project_name" {
  type = string
  default = "blogging-devsecops"
}
variable "cluster_name" {
  type = string
  default = "blogging-eks"
}
variable "kubernetes_version" {
  type = string
  default = "1.33"
}
variable "instance_types" {
  type = list(string)
  default = ["t3.medium"]
}
variable "desired_size" {
  type = number
  default = 2
}
variable "min_size" {
  type = number
  default = 1
}
variable "max_size" {
  type = number
  default = 3
}
