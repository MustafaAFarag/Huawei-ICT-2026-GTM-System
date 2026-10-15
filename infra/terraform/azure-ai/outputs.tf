output "endpoint" {
  value = azurerm_cognitive_account.openai.endpoint
}

output "deployments" {
  value = {
    chat       = azurerm_cognitive_deployment.chat.name
    whisper    = azurerm_cognitive_deployment.whisper.name
    transcribe = azurerm_cognitive_deployment.transcribe.name
    tts        = azurerm_cognitive_deployment.tts.name
  }
}
