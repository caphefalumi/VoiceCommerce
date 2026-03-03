output "cloudflare_d1_database_id" {
  value = cloudflare_d1_database.tgdd_db.id
}

output "cloudflare_d1_database_name" {
  value = cloudflare_d1_database.tgdd_db.name
}

# Vectorize indexes are managed via Wrangler CLI, not Terraform
# output "cloudflare_vectorize_products_index" { value = "tgdd-products" }
# output "cloudflare_vectorize_faq_index"      { value = "tgdd-faq" }
