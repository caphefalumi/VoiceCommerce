output "cloudflare_d1_database_id" {
  value = cloudflare_d1.tgdd_db.id
}

output "cloudflare_d1_database_name" {
  value = cloudflare_d1.tgdd_db.name
}

output "cloudflare_vectorize_products_index" {
  value = cloudflare_vectorize_index.voice_search_index.name
}

output "cloudflare_vectorize_faq_index" {
  value = cloudflare_vectorize_index.faq_index.name
}
