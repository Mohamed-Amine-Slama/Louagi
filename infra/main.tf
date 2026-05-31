terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Assume an existing VPC for simplicity
data "aws_vpc" "main" {
  id = var.vpc_id
}

data "aws_subnets" "public" {
  filter {
    name   = "vpc-id"
    values = [var.vpc_id]
  }
  filter {
    name   = "tag:Tier"
    values = ["Public"]
  }
}

data "aws_subnets" "private" {
  filter {
    name   = "vpc-id"
    values = [var.vpc_id]
  }
  filter {
    name   = "tag:Tier"
    values = ["Private"]
  }
}

module "alb" {
  source = "./modules/alb"

  vpc_id         = var.vpc_id
  public_subnets = data.aws_subnets.public.ids
  certificate_arn = var.certificate_arn
  environment    = var.environment
}

module "cdn" {
  source = "./modules/cdn"

  alb_domain_name = module.alb.alb_dns_name
  custom_domain   = var.custom_domain
  certificate_arn = var.cdn_certificate_arn
  environment     = var.environment
}

module "redis" {
  source = "./modules/redis"

  vpc_id          = var.vpc_id
  private_subnets = data.aws_subnets.private.ids
  environment     = var.environment
  ecs_sg_id       = module.ecs.security_group_id
}

module "ecs" {
  source = "./modules/ecs"

  vpc_id          = var.vpc_id
  private_subnets = data.aws_subnets.private.ids
  alb_target_group_arn = module.alb.target_group_arn
  alb_security_group_id = module.alb.security_group_id
  redis_url       = module.redis.redis_endpoint
  environment     = var.environment
  database_url    = var.database_url
  supabase_url    = var.supabase_url
  supabase_service_role_key = var.supabase_service_role_key
  app_jwt_secret  = var.app_jwt_secret
}
