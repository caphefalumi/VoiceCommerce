output "cloudflare_d1_database_id" {
  description = "D1 database ID — copy into wrangler.json → d1_databases[].database_id"
  value       = cloudflare_d1_database.tgdd_db.id
}

output "cloudflare_d1_database_name" {
  value = cloudflare_d1_database.tgdd_db.name
}

output "pages_project_subdomain" {
  description = "Cloudflare Pages auto-assigned subdomain"
  value       = cloudflare_pages_project.tgdd_frontend.subdomain
}

output "session_kv_namespace_id" {
  description = "Session KV namespace ID — copy into wrangler.json → kv_namespaces[].id"
  value       = cloudflare_workers_kv_namespace.session_store.id
}

# Vectorize indexes are managed via Wrangler CLI (not supported in TF provider v5)
# wrangler vectorize create tgdd-products --dimensions=768 --metric=cosine
# wrangler vectorize create tgdd-faq      --dimensions=768 --metric=cosine
