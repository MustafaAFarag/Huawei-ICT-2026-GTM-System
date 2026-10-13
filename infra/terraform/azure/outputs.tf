output "server_ip" {
  value = azurerm_public_ip.server.ip_address
}

output "ssh_command" {
  value = "ssh revenue@${azurerm_public_ip.server.ip_address}"
}

output "resource_group" {
  value = data.azurerm_resource_group.project.name
}
