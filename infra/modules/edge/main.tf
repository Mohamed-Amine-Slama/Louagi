terraform {
  required_providers {
    cloudflare = { source = "cloudflare/cloudflare" }
  }
}

variable "account_id" {}
variable "zone_id" {}
variable "api_hostname" {}
variable "admin_api_hostname" {}

# Outbound-only link from the origin to Cloudflare: the origin needs no public IP or open port.
resource "cloudflare_zero_trust_tunnel_cloudflared" "api" {
  account_id = var.account_id
  name       = "louagi-api"
  config_src = "cloudflare"
}

resource "cloudflare_zero_trust_tunnel_cloudflared_config" "api" {
  account_id = var.account_id
  tunnel_id  = cloudflare_zero_trust_tunnel_cloudflared.api.id

  config = {
    ingress = [
      # "api" is the Express service in infra/docker-compose.yml
      { hostname = var.api_hostname, service = "http://api:3000" },
      { hostname = var.admin_api_hostname, service = "http://api:3000" },
      { service = "http_status:404" },
    ]
  }
}

data "cloudflare_zero_trust_tunnel_cloudflared_token" "api" {
  account_id = var.account_id
  tunnel_id  = cloudflare_zero_trust_tunnel_cloudflared.api.id
}

resource "cloudflare_dns_record" "api" {
  for_each = toset([var.api_hostname, var.admin_api_hostname])

  zone_id = var.zone_id
  name    = each.value
  type    = "CNAME"
  content = "${cloudflare_zero_trust_tunnel_cloudflared.api.id}.cfargotunnel.com"
  proxied = true
  ttl     = 1
}

# No CDN: API responses are never cached at the edge.
resource "cloudflare_ruleset" "no_cache" {
  zone_id = var.zone_id
  name    = "louagi-api-no-cache"
  kind    = "zone"
  phase   = "http_request_cache_settings"

  rules = [{
    description       = "Bypass cache for the API hostnames"
    expression        = "http.host in {\"${var.api_hostname}\" \"${var.admin_api_hostname}\"}"
    action            = "set_cache_settings"
    action_parameters = { cache = false }
  }]
}

resource "cloudflare_zone_setting" "always_use_https" {
  zone_id    = var.zone_id
  setting_id = "always_use_https"
  value      = "on"
}

resource "cloudflare_zone_setting" "min_tls_version" {
  zone_id    = var.zone_id
  setting_id = "min_tls_version"
  value      = "1.2"
}

output "tunnel_token" {
  value     = data.cloudflare_zero_trust_tunnel_cloudflared_token.api.token
  sensitive = true
}
