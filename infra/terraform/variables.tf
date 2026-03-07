variable "cloudflare_api_token" {
  type        = string
  description = "Cloudflare API Token — least-privilege scopes: D1:Edit, Pages:Edit, Workers:Edit, Account Rulesets:Edit, KV:Edit"
  sensitive   = true
}

variable "cloudflare_account_id" {
  type        = string
  description = "Cloudflare Account ID"
  sensitive   = true
}


variable "environment" {
  type        = string
  description = "Deployment target: staging | production"
  default     = "staging"
  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "environment must be 'staging' or 'production'."
  }
}
