# Cloudflare D1 Database for Products, Users, Cart
resource "cloudflare_d1" "tgdd_db" {
  account_id = var.cloudflare_account_id
  name       = "tgdd-db"
}

# Cloudflare Vectorize Index for Product Voice Search
resource "cloudflare_vectorize_index" "voice_search_index" {
  account_id  = var.cloudflare_account_id
  name        = "tgdd-products"
  dimensions  = 768
  metric      = "cosine"
  description = "Product Voice Search Embeddings"
}

# Cloudflare Vectorize Index for FAQ Search
resource "cloudflare_vectorize_index" "faq_index" {
  account_id  = var.cloudflare_account_id
  name        = "tgdd-faq"
  dimensions  = 768
  metric      = "cosine"
  description = "FAQ Voice Search Embeddings"
}
