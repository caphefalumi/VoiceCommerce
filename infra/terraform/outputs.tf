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

output "railway_project_id" {
  value = railway_project.tgdd_backend.id
}

output "railway_environment_id" {
  value = railway_environment.staging.id
}

output "railway_service_id" {
  value = railway_service.spring_backend.id
}

output "railway_backend_domain" {
  value = railway_service_domain.spring_backend_domain.domain
}
