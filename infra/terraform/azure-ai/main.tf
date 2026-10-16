data "azurerm_resource_group" "project" {
  name = var.resource_group_name
}

resource "azurerm_cognitive_account" "openai" {
  name                  = var.account_name
  resource_group_name   = data.azurerm_resource_group.project.name
  location              = var.location
  kind                  = "OpenAI"
  sku_name              = "S0"
  custom_subdomain_name = var.account_name
  tags = {
    project = "gtm-command-center"
    purpose = "demo-ai"
  }
}

# Chat and tool calling for the assistant harness (D19).
resource "azurerm_cognitive_deployment" "chat" {
  name                 = "gpt-5-4-mini"
  cognitive_account_id = azurerm_cognitive_account.openai.id
  model {
    format  = "OpenAI"
    name    = "gpt-5.4-mini"
    version = "2026-03-17"
  }
  sku {
    name     = "GlobalStandard"
    capacity = var.chat_capacity
  }
}

# Voice dictation (D20): Whisper as requested, GPT-4o transcribe as the Arabic-quality comparison.
resource "azurerm_cognitive_deployment" "whisper" {
  name                 = "whisper"
  cognitive_account_id = azurerm_cognitive_account.openai.id
  model {
    format  = "OpenAI"
    name    = "whisper"
    version = "001"
  }
  sku {
    name     = "Standard"
    capacity = 1
  }
  depends_on = [azurerm_cognitive_deployment.chat]
}

resource "azurerm_cognitive_deployment" "transcribe" {
  name                 = "gpt-4o-transcribe"
  cognitive_account_id = azurerm_cognitive_account.openai.id
  model {
    format  = "OpenAI"
    name    = "gpt-4o-transcribe"
    version = "2025-03-20"
  }
  sku {
    name     = "GlobalStandard"
    capacity = 20
  }
  depends_on = [azurerm_cognitive_deployment.whisper]
}

resource "azurerm_consumption_budget_resource_group" "project" {
  name              = "budget-gtm-command-center-demo"
  resource_group_id = data.azurerm_resource_group.project.id
  amount            = var.budget_amount
  time_grain        = "Monthly"
  time_period {
    start_date = "2026-10-01T00:00:00Z"
  }
  dynamic "notification" {
    for_each = [50, 80, 100]
    content {
      enabled        = true
      threshold      = notification.value
      operator       = "GreaterThanOrEqualTo"
      threshold_type = "Actual"
      contact_emails = [var.budget_contact]
    }
  }
}

# Test-only: generates synthetic English/Arabic clips for the transcription evaluation.
resource "azurerm_cognitive_deployment" "tts" {
  name                 = "tts"
  cognitive_account_id = azurerm_cognitive_account.openai.id
  model {
    format  = "OpenAI"
    name    = "tts"
    version = "001"
  }
  sku {
    name     = "Standard"
    capacity = 1
  }
  depends_on = [azurerm_cognitive_deployment.transcribe]
}

# Stronger model for deliverable generation and evaluation (17 Oct 2026). Small capacity:
# it is called only for emails, carousels, flipbooks and judged evaluation runs.
resource "azurerm_cognitive_deployment" "sol" {
  name                 = "gpt-6-1-sol"
  cognitive_account_id = azurerm_cognitive_account.openai.id
  model {
    format  = "OpenAI"
    name    = "gpt-6.1-sol"
    version = "2026-09-29"
  }
  sku {
    name     = "GlobalStandard"
    capacity = var.sol_capacity
  }
  depends_on = [azurerm_cognitive_deployment.tts]
}
