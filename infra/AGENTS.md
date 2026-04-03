# INFRA — Infrastructure as Code

## OVERVIEW

Terraform manages Cloudflare resources. Ansible handles Vectorize setup via wrangler CLI.

Terraform provider v5.x does NOT support Vectorize indexes or AI bindings — those use wrangler.json.

## STRUCTURE

```
infra/
├── terraform/
│   ├── provider.tf      # Cloudflare provider v5.0, TF >= 1.9
│   ├── main.tf          # D1, Pages, KV, WAF ruleset
│   ├── variables.tf     # cloudflare_api_token, account_id, environment
│   ├── outputs.tf      # D1 ID, KV ID, Pages subdomain
│   └── prod.tfvars     # Production variable values
└── ansible/
    ├── setup_vectorize.yml   # Wrangler CLI playbook
    └── inventory.ini        # Local execution
```

## WHERE TO LOOK

| Task | File |
|------|------|
| Add D1 tables | `main.tf` + `cloudflare_d1_database` |
| Pages config | `main.tf` → `cloudflare_pages_project` |
| WAF/rate-limit rules | `main.tf` → `cloudflare_ruleset` |
| KV namespace | `main.tf` → `cloudflare_workers_kv_namespace` |
| Vectorize indexes | `ansible/setup_vectorize.yml` (wrangler CLI) |
| Wrangler bindings | `apps/*/wrangler.jsonc` (AI, KV, D1) |

## CONVENTIONS

- Terraform >= 1.9, Cloudflare provider ~5.0
- Ansible runs locally with `ansible-playbook setup_vectorize.yml`
- Secrets: `cloudflare_api_token`, `cloudflare_account_id` via env or tfvars
- Vectorize: 768 dimensions, cosine metric (see outputs.tf comments)
- No remote backend configured — add Terraform Cloud or R2 backend in main.tf
- CI: `infra-terraform.yml` workflow runs `terraform fmt -check` and `validate` only
