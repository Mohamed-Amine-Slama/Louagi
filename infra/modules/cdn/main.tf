variable "alb_domain_name" {}
variable "custom_domain" {}
variable "certificate_arn" {}
variable "environment" {}

resource "aws_cloudfront_distribution" "cdn" {
  origin {
    domain_name = var.alb_domain_name
    origin_id   = "ALBOrigin"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  price_class         = "PriceClass_100" # US/EU
  aliases             = var.custom_domain != "" ? [var.custom_domain] : []

  # Default cache behavior: Bypass cache for GraphQL POST requests
  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "ALBOrigin"

    forwarded_values {
      query_string = true
      headers      = ["Authorization", "Host"]

      cookies {
        forward = "all"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 0 # No cache by default
    max_ttl                = 0
  }

  # Cache behavior for GET requests (like /health or persisted queries)
  ordered_cache_behavior {
    path_pattern     = "/health"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD", "OPTIONS"]
    target_origin_id = "ALBOrigin"

    forwarded_values {
      query_string = false
      headers      = ["Host"]
      cookies {
        forward = "none"
      }
    }

    min_ttl                = 0
    default_ttl            = 60
    max_ttl                = 300
    viewer_protocol_policy = "redirect-to-https"
  }

  viewer_certificate {
    cloudfront_default_certificate = var.certificate_arn == "" ? true : false
    acm_certificate_arn            = var.certificate_arn
    ssl_support_method             = var.certificate_arn == "" ? "vip" : "sni-only"
    minimum_protocol_version       = "TLSv1.2_2021"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  tags = {
    Environment = var.environment
    Name        = "louagi-cdn"
  }
}

output "cloudfront_domain" {
  value = aws_cloudfront_distribution.cdn.domain_name
}
