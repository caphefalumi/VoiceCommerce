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

variable "github_owner" {
  type        = string
  description = "GitHub organisation or username that owns the repo"
}

variable "github_repo" {
  type        = string
  description = "GitHub repository name (without the owner prefix)"
  default     = "tgdd"
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
