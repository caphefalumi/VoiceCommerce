# Railway Project for Backend
resource "railway_project" "tgdd_backend" {
  name = "tgdd-voice-commerce"
}

# Staging Environment
resource "railway_environment" "staging" {
  name       = "staging"
  project_id = railway_project.tgdd_backend.id
}

# Spring Backend Service (minimal - mainly for any non-AI operations)
resource "railway_service" "spring_backend" {
  name       = "spring-backend"
  project_id = railway_project.tgdd_backend.id
}

resource "railway_service_domain" "spring_backend_domain" {
  environment_id = railway_environment.staging.id
  service_id     = railway_service.spring_backend.id
}

# Cloudflare D1 Database
resource "cloudflare_d1" "tgdd_db" {
  account_id = var.cloudflare_account_id
  name       = "tgdd-db"
}

# Cloudflare Vectorize Index for AI
resource "cloudflare_vectorize_index" "voice_search_index" {
  account_id  = var.cloudflare_account_id
  name        = "tgdd-products"
  dimensions  = 768
  metric      = "cosine"
  description = "Product Voice Search Embeddings"
}

resource "cloudflare_vectorize_index" "faq_index" {
  account_id  = var.cloudflare_account_id
  name        = "tgdd-faq"
  dimensions  = 768
  metric      = "cosine"
  description = "FAQ Voice Search Embeddings"
}
