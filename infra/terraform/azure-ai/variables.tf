variable "resource_group_name" {
  description = "Existing project-only resource group."
  type        = string
  default     = "rg-gtm-command-center-demo"
}

variable "location" {
  description = "Region with GPT-5.4 mini, Whisper and GPT-4o transcribe quota (checked 15 Oct 2026)."
  type        = string
  default     = "swedencentral"
}

variable "account_name" {
  description = "Azure OpenAI account and custom subdomain name."
  type        = string
  default     = "aoai-gtm-command-center-demo"
}

variable "chat_capacity" {
  description = "GPT-5.4 mini Global Standard capacity in thousands of tokens per minute."
  type        = number
  default     = 200
}

variable "budget_amount" {
  description = "Monthly USD budget for the project resource group (alerts only, not a hard stop)."
  type        = number
  default     = 50
}

variable "budget_contact" {
  description = "Email that receives budget alerts."
  type        = string
}
