output "api_url" {
  value = "https://${var.api_hostname}"
}

output "admin_api_url" {
  value = "https://${var.admin_api_hostname}"
}

# Feed to the origin stack: TUNNEL_TOKEN=$(terraform output -raw tunnel_token) docker compose up -d
output "tunnel_token" {
  value     = module.edge.tunnel_token
  sensitive = true
}
