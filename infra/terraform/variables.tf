variable "cloudflare_api_token" {
  type        = string
  description = "Cloudflare API Token with permissions to manage Pages, Workers, DBs, Custom Domains"
  sensitive   = true
}

variable "cloudflare_account_id" {
  type        = string
  description = "Cloudflare Account ID"
  sensitive   = true
}

variable "railway_token" {
  type        = string
  description = "Railway API Token"
  sensitive   = true
}
