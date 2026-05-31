variable "aws_region" {
  type    = string
  default = "eu-central-1"
}

variable "vpc_id" {
  type        = string
  description = "Existing VPC ID to deploy resources into"
}

variable "environment" {
  type    = string
  default = "production"
}

variable "custom_domain" {
  type        = string
  description = "Custom domain for the CDN (e.g. api.louagi.com)"
  default     = ""
}

variable "certificate_arn" {
  type        = string
  description = "ACM Certificate ARN in the regional AWS region for ALB"
  default     = ""
}

variable "cdn_certificate_arn" {
  type        = string
  description = "ACM Certificate ARN in us-east-1 for CloudFront"
  default     = ""
}

variable "database_url" {
  type        = string
  sensitive   = true
}

variable "supabase_url" {
  type = string
}

variable "supabase_service_role_key" {
  type      = string
  sensitive = true
}

variable "app_jwt_secret" {
  type      = string
  sensitive = true
}
