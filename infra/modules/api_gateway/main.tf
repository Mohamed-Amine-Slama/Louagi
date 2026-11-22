# API gateway for the admin dashboard: a Worker on the admin API hostname, between the
# Cloudflare edge and the Express API. See worker.mjs for what it enforces.

terraform {
  required_providers {
    cloudflare = { source = "cloudflare/cloudflare" }
  }
}

variable "account_id" {}
variable "zone_id" {}
variable "admin_api_hostname" {}
variable "gateway_secret" { sensitive = true }

resource "cloudflare_workers_script" "gateway" {
  account_id         = var.account_id
  script_name        = "louagi-admin-gateway"
  main_module        = "worker.mjs"
  content_file       = "${path.module}/worker.mjs"
  content_sha256     = filesha256("${path.module}/worker.mjs")
  compatibility_date = "2026-11-01"

  bindings = [{
    name = "GATEWAY_SECRET"
    type = "secret_text"
    text = var.gateway_secret
  }]
}

resource "cloudflare_workers_route" "gateway" {
  zone_id = var.zone_id
  pattern = "${var.admin_api_hostname}/*"
  script  = cloudflare_workers_script.gateway.script_name
}
