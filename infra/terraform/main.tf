# ─────────────────────────────────────────────────────────────────────────────
# Terraform configuration for TGDD — Cloudflare infrastructure
#
# Resources managed here:
#   • Cloudflare D1 database        (products / users / cart)
#   • Cloudflare Pages project      (frontend)
#   • Cloudflare Workers routes     (ai-worker, api-worker)
#   • Cloudflare Account Ruleset    (WAF / rate-limit)
#   • Terraform Cloud remote state  (replace with S3 if preferred)
#
# Resources NOT managed (Cloudflare Terraform provider limitation):
#   • Vectorize indexes  → created via wrangler CLI (see infra/README.md)
#   • AI bindings        → declared in wrangler.json
# ─────────────────────────────────────────────────────────────────────────────

# ── Remote state backend ──────────────────────────────────────────────────────
# Uncomment one of:
#   a) Terraform Cloud   (free, recommended for teams)
#   b) Cloudflare R2     (S3-compatible, stays inside CF ecosystem)
#
# terraform {
#   cloud {
#     organization = "your-org"
#     workspaces { name = "tgdd" }
#   }
# }
#
# terraform {
#   backend "s3" {
#     bucket                      = "tgdd-tfstate"
#     key                         = "tgdd/terraform.tfstate"
#     region                      = "auto"
#     endpoint                    = "https://<ACCOUNT_ID>.r2.cloudflarestorage.com"
#     skip_credentials_validation = true
#     skip_metadata_api_check     = true
#     skip_region_validation      = true
#     force_path_style            = true
#   }
# }

# ── D1 Database ───────────────────────────────────────────────────────────────
resource "cloudflare_d1_database" "tgdd_db" {
  account_id = var.cloudflare_account_id
  name       = "tgdd-db"
}

# ── Cloudflare Pages project ──────────────────────────────────────────────────
resource "cloudflare_pages_project" "tgdd_frontend" {
  account_id        = var.cloudflare_account_id
  name              = "tgdd-frontend"
  production_branch = "main"

  build_config {
    build_command   = "npm run build"
    destination_dir = "dist"
    root_dir        = "/"
  }

  deployment_configs {
    production {
      environment_variables = {
        NODE_VERSION = "20"
      }
      # No secrets in env vars — voice audio passed as transient base64,
      # never stored. See security baseline docs.
    }
    preview {
      environment_variables = {
        NODE_VERSION = "20"
      }
    }
  }

  source {
    type = "github"
    config {
      owner                         = var.github_owner
      repo_name                     = var.github_repo
      production_branch             = "main"
      pr_comments_enabled           = true
      deployments_enabled           = true
      production_deployment_enabled = true
    }
  }
}

# ── WAF / Rate-limiting ruleset ───────────────────────────────────────────────
# Protects the AI Worker voice endpoint from abuse (expensive AI inference).
# Limit: 30 requests per minute per IP to /voice-process.
resource "cloudflare_ruleset" "ai_worker_rate_limit" {
  account_id  = var.cloudflare_account_id
  name        = "tgdd-ai-worker-rate-limit"
  description = "Rate-limit voice-process endpoint to prevent AI inference abuse"
  kind        = "root"
  phase       = "http_ratelimit"

  rules {
    action = "block"
    ratelimit {
      characteristics    = ["cf.colo.id", "ip.src"]
      period             = 60
      requests_per_period = 30
      mitigation_timeout = 60
    }
    expression  = "(http.request.uri.path contains \"/voice-process\")"
    description = "Block IPs exceeding 30 voice req/min"
    enabled     = true
  }
}

# ── Workers KV namespace (session context storage) ────────────────────────────
# Stores short-lived voice session context (TTL managed in worker code).
resource "cloudflare_workers_kv_namespace" "session_store" {
  account_id = var.cloudflare_account_id
  title      = "tgdd-session-store"
}

# ── Outputs ───────────────────────────────────────────────────────────────────
output "d1_database_id" {
  description = "D1 database ID — paste into wrangler.json database_id field"
  value       = cloudflare_d1_database.tgdd_db.id
}

output "d1_database_name" {
  value = cloudflare_d1_database.tgdd_db.name
}

output "pages_project_name" {
  value = cloudflare_pages_project.tgdd_frontend.name
}

output "session_kv_namespace_id" {
  description = "KV namespace ID for session context — add to wrangler.json kv_namespaces"
  value       = cloudflare_workers_kv_namespace.session_store.id
}
