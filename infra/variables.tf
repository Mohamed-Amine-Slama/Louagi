variable "account_id" {
  type        = string
  description = "Cloudflare account ID"
}

variable "zone_id" {
  type        = string
  description = "Cloudflare zone ID of the domain (e.g. louagi.com)"
}

variable "api_hostname" {
  type        = string
  description = "Public API hostname used by the mobile app (e.g. api.louagi.com)"
}

variable "admin_api_hostname" {
  type        = string
  description = "API hostname used only by the admin dashboard; routed through the API gateway Worker (e.g. admin-api.louagi.com)"
}

variable "gateway_secret" {
  type        = string
  sensitive   = true
  description = "Shared secret the gateway stamps on admin traffic. Set the same value as GATEWAY_SECRET in server/.env (openssl rand -hex 32)"
}

variable "admin_allowed_ips" {
  type        = list(string)
  default     = []
  description = "IPs/CIDRs (admin office/VPN) allowed to reach the admin API hostname. Empty = no IP restriction, so the admin host is as open as the mobile one. Point the dashboard's server-side API_URL at api_hostname so its BFF calls don't need allowlisting"
}

variable "managed_waf" {
  type        = bool
  default     = false
  description = "Deploy the Cloudflare Managed + OWASP Core rulesets. Needs a Pro plan or higher, so off by default for the Free plan (which already gets the Free Managed Ruleset)"
}
