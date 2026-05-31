variable "vpc_id" {}
variable "private_subnets" {}
variable "alb_target_group_arn" {}
variable "alb_security_group_id" {}
variable "redis_url" {}
variable "environment" {}
variable "database_url" {}
variable "supabase_url" {}
variable "supabase_service_role_key" {}
variable "app_jwt_secret" {}

resource "aws_security_group" "ecs_sg" {
  name        = "louagi-ecs-sg"
  description = "Allow inbound traffic from ALB"
  vpc_id      = var.vpc_id

  ingress {
    description     = "HTTP from ALB"
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [var.alb_security_group_id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_ecs_cluster" "main" {
  name = "louagi-cluster"
}

# In a real setup, you would push the Docker image to ECR and reference it here.
# For demonstration, we assume an image URI is passed or defined.
resource "aws_ecs_task_definition" "api" {
  family                   = "louagi-api"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn

  container_definitions = jsonencode([
    {
      name      = "api"
      image     = "YOUR_ECR_IMAGE_URI:latest"
      essential = true
      portMappings = [
        {
          containerPort = 3000
          hostPort      = 3000
        }
      ]
      environment = [
        { name = "NODE_ENV", value = var.environment },
        { name = "PORT", value = "3000" },
        { name = "REDIS_URL", value = var.redis_url },
        { name = "DATABASE_URL", value = var.database_url },
        { name = "SUPABASE_URL", value = var.supabase_url },
        { name = "SUPABASE_SERVICE_ROLE_KEY", value = var.supabase_service_role_key },
        { name = "APP_JWT_SECRET", value = var.app_jwt_secret },
        { name = "CORS_ORIGINS", value = "*" }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/louagi-api"
          "awslogs-region"        = "eu-central-1"
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])
}

resource "aws_cloudwatch_log_group" "api_logs" {
  name              = "/ecs/louagi-api"
  retention_in_days = 7
}

resource "aws_ecs_service" "api" {
  name            = "louagi-api-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = var.environment == "production" ? 2 : 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnets
    security_groups  = [aws_security_group.ecs_sg.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.alb_target_group_arn
    container_name   = "api"
    container_port   = 3000
  }
}

# IAM Role for ECS Execution (simplified)
resource "aws_iam_role" "ecs_execution_role" {
  name = "louagi-ecs-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution_role_policy" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

output "security_group_id" {
  value = aws_security_group.ecs_sg.id
}
