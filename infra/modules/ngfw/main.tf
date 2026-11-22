# NGFW in front of the Cloudflare edge. Cloudflare's network firewall (Magic Firewall) needs
# Magic Transit/WAN on Enterprise, so this layer is the WAF's three phases, which run in order
# (custom -> rate limit -> managed) before Workers and before anything reaches the origin.
# Each zone-level ruleset owns its whole phase for the zone: import any existing dashboard
# rules first (terraform import), or apply fails.

terraform {
  required_providers {
    cloudflare = { source = "cloudflare/cloudflare" }
  }
}

variable "zone_id" {}
variable "api_hostname" {}
variable "admin_api_hostname" {}
variable "admin_allowed_ips" { type = list(string) }
variable "managed_waf" { type = bool }

locals {
  hosts = "{\"${var.api_hostname}\" \"${var.admin_api_hostname}\"}"
}

resource "cloudflare_ruleset" "firewall" {
  zone_id = var.zone_id
  name    = "louagi-ngfw-custom"
  kind    = "zone"
  phase   = "http_request_firewall_custom"

  rules = concat(
    [{
      description = "Allow only the API surface: POST/OPTIONS /graphql, GET/HEAD /health"
      expression  = "http.host in ${local.hosts} and not ((http.request.uri.path eq \"/graphql\" and http.request.method in {\"POST\" \"OPTIONS\"}) or (http.request.uri.path eq \"/health\" and http.request.method in {\"GET\" \"HEAD\"}))"
      action      = "block"
    }],
    length(var.admin_allowed_ips) == 0 ? [] : [{
      description = "Admin API only from allowed IPs"
      expression  = "http.host eq \"${var.admin_api_hostname}\" and not ip.src in {${join(" ", var.admin_allowed_ips)}}"
      action      = "block"
    }],
  )
}

resource "cloudflare_ruleset" "rate_limit" {
  zone_id = var.zone_id
  name    = "louagi-ngfw-ratelimit"
  kind    = "zone"
  phase   = "http_ratelimit"

  rules = [{
    # Path only: the Free plan allows no other field here. Express keeps the finer per-user limits.
    description = "Per-IP burst limit on GraphQL"
    expression  = "http.request.uri.path eq \"/graphql\""
    action      = "block"
    ratelimit = {
      characteristics     = ["cf.colo.id", "ip.src"]
      period              = 10
      requests_per_period = 50
      mitigation_timeout  = 10
    }
  }]
}

resource "cloudflare_ruleset" "managed" {
  count = var.managed_waf ? 1 : 0

  zone_id = var.zone_id
  name    = "louagi-ngfw-managed"
  kind    = "zone"
  phase   = "http_request_firewall_managed"

  rules = [{
    description       = "Cloudflare Managed Ruleset (signature-based exploit blocking)"
    expression        = "http.host in ${local.hosts}"
    action            = "execute"
    action_parameters = { id = "efb7b8c949ac4650a09736fc376e9aee" }
  }]
}
