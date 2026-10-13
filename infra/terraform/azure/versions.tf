terraform {
  required_version = "= 1.15.8"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "= 5.9.0"
    }
  }
}

provider "azurerm" {
  features {}
  tenant_id                       = "3f5648ce-ad7c-46b5-8dfb-ddcbf48520af"
  subscription_id                 = "55336c1c-af74-4164-b687-a7b7c3ec740c"
  resource_provider_registrations = "none"
}
