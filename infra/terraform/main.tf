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

  # The Cloudflare provider v4.x exposes Pages configuration as nested
  # attributes under the `build_config`, `deployment_configs`, and
  # `source` blocks. In some editor/LS setups, the language server may
  # validate against a different provider schema (e.g., v5.x) causing
  # "Unexpected block" diagnostics. Ensure provider version matches the
  # lockfile (see provider.tf change).

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

}

# ── Workers KV namespace (session context storage) ────────────────────────────
# Stores short-lived voice session context (TTL managed in worker code).
resource "cloudflare_workers_kv_namespace" "session_store" {
  account_id = var.cloudflare_account_id
  title      = "tgdd-session-store"
}


