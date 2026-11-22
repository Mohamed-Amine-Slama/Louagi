# Request path (the CDN is gone; nothing is cached):
#   mobile app      -> NGFW (WAF + rate limits) -> Cloudflare edge -> Tunnel -> Express API
#   admin dashboard -> NGFW (WAF + rate limits) -> Cloudflare edge -> API gateway Worker -> Tunnel -> Express API
# Cloudflare runs WAF phases before Workers, so the NGFW really does sit in front of the gateway.
# The API + Redis + cloudflared run from docker-compose.yml on any host. No inbound ports are opened.

terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }
}

# Auth: export CLOUDFLARE_API_TOKEN (Zone: DNS/WAF/Cache Rules/Zone Settings/Workers Routes edit,
# Account: Cloudflare Tunnel/Workers Scripts edit).
provider "cloudflare" {}

module "edge" {
  source = "./modules/edge"

  account_id         = var.account_id
  zone_id            = var.zone_id
  api_hostname       = var.api_hostname
  admin_api_hostname = var.admin_api_hostname
}

module "ngfw" {
  source = "./modules/ngfw"

  zone_id            = var.zone_id
  api_hostname       = var.api_hostname
  admin_api_hostname = var.admin_api_hostname
  admin_allowed_ips  = var.admin_allowed_ips
  managed_waf        = var.managed_waf
}

module "api_gateway" {
  source = "./modules/api_gateway"

  account_id         = var.account_id
  zone_id            = var.zone_id
  admin_api_hostname = var.admin_api_hostname
  gateway_secret     = var.gateway_secret
}
