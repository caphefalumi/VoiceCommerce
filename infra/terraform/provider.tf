terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
    railway = {
      source  = "registry.railway.app/railway"
      version = "~> 1.0"
    }
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

provider "railway" {
  token = var.railway_token
}
