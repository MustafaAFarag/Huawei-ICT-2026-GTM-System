mock_provider "azurerm" {}

override_data {
  target = data.azurerm_resource_group.project
  values = {
    id       = "/subscriptions/55336c1c-af74-4164-b687-a7b7c3ec740c/resourceGroups/rg-gtm-command-center-demo"
    name     = "rg-gtm-command-center-demo"
    location = "westeurope"
    tags     = { project = "gtm-command-center" }
  }
}

variables {
  admin_cidr     = "203.0.113.1/32"
  ssh_public_key = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIEJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJC"
}

run "project_boundary" {
  command = plan

  assert {
    condition = alltrue([
      azurerm_linux_virtual_machine.server.resource_group_name == "rg-gtm-command-center-demo",
      azurerm_managed_disk.data.resource_group_name == "rg-gtm-command-center-demo",
      azurerm_virtual_network.server.resource_group_name == "rg-gtm-command-center-demo",
      azurerm_network_interface.server.resource_group_name == "rg-gtm-command-center-demo",
      azurerm_network_security_group.server.resource_group_name == "rg-gtm-command-center-demo",
      azurerm_public_ip.server.resource_group_name == "rg-gtm-command-center-demo",
    ])
    error_message = "Every managed resource must stay inside the project group."
  }
  assert {
    condition = azurerm_dev_test_global_vm_shutdown_schedule.demo.enabled && azurerm_dev_test_global_vm_shutdown_schedule.demo.daily_recurrence_time == "2200" && azurerm_dev_test_global_vm_shutdown_schedule.demo.timezone == "UTC"
    error_message = "The unattended demo must shut down daily at 22:00 UTC."
  }
  assert {
    condition     = azurerm_linux_virtual_machine.server.disable_password_authentication
    error_message = "Password SSH must stay disabled."
  }
  assert {
    condition     = one([for r in azurerm_network_security_group.server.security_rule : r.source_address_prefix if r.name == "ssh-administrator"]) == "203.0.113.1/32"
    error_message = "SSH must be restricted to the administrator."
  }
  assert {
    condition     = one([for r in azurerm_network_security_group.server.security_rule : r.access if r.name == "deny-other-inbound"]) == "Deny"
    error_message = "Databases, native engines and API must not have public inbound access."
  }
}

run "reject_open_ssh" {
  command = plan
  variables {
    admin_cidr = "0.0.0.0/0"
  }
  expect_failures = [var.admin_cidr]
}
