output "cloudfront_domain" {
  value = module.cdn.cloudfront_domain
}

output "alb_dns_name" {
  value = module.alb.alb_dns_name
}

output "redis_endpoint" {
  value = module.redis.redis_endpoint
}
