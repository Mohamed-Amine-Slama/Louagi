variable "vpc_id" {}
variable "private_subnets" {}
variable "environment" {}
variable "ecs_sg_id" {}

resource "aws_security_group" "redis_sg" {
  name        = "louagi-redis-sg"
  description = "Allow inbound traffic from ECS"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Redis from ECS"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [var.ecs_sg_id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_elasticache_subnet_group" "redis_subnet" {
  name       = "louagi-redis-subnet"
  subnet_ids = var.private_subnets
}

resource "aws_elasticache_replication_group" "redis" {
  replication_group_id          = "louagi-redis"
  description                   = "Redis cluster for Louagi session cache"
  node_type                     = var.environment == "production" ? "cache.t4g.micro" : "cache.t4g.micro"
  port                          = 6379
  parameter_group_name          = "default.redis7"
  subnet_group_name             = aws_elasticache_subnet_group.redis_subnet.name
  security_group_ids            = [aws_security_group.redis_sg.id]
  automatic_failover_enabled    = var.environment == "production" ? true : false
  num_cache_clusters            = var.environment == "production" ? 2 : 1
  at_rest_encryption_enabled    = true
  transit_encryption_enabled    = true
}

output "redis_endpoint" {
  value = "rediss://${aws_elasticache_replication_group.redis.primary_endpoint_address}:6379"
}
