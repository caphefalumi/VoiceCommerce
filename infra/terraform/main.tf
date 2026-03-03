# Cloudflare D1 Database for Products, Users, Cart
resource "cloudflare_d1_database" "tgdd_db" {
  account_id = var.cloudflare_account_id
  name       = "tgdd-db"
}

# Note: cloudflare_vectorize_index is NOT supported by the Cloudflare Terraform provider.
# Vectorize indexes must be created via Wrangler CLI:
#   wrangler vectorize create tgdd-products --dimensions=768 --metric=cosine
#   wrangler vectorize create tgdd-faq --dimensions=768 --metric=cosine
