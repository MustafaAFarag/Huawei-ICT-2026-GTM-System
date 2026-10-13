# The setup-owned resource group and OIDC identity are deliberately outside this
# state. No existing resources belonging to Amr are imported or managed here.
data "azurerm_resource_group" "project" {
  name = "rg-gtm-command-center-demo"
  lifecycle {
    postcondition {
      condition     = self.tags["project"] == "gtm-command-center"
      error_message = "The resource group must carry this project's ownership tag."
    }
  }
}

locals {
  prefix = "gtm-demo"
  tags = {
    project     = "gtm-command-center"
    environment = "demo"
    managed_by  = "terraform"
  }
}

resource "azurerm_virtual_network" "server" {
  name                = "${local.prefix}-network"
  resource_group_name = data.azurerm_resource_group.project.name
  location            = var.location
  address_space       = ["10.81.0.0/16"]
  tags                = local.tags
}

resource "azurerm_subnet" "server" {
  name                 = "server"
  resource_group_name  = data.azurerm_resource_group.project.name
  virtual_network_name = azurerm_virtual_network.server.name
  address_prefixes     = ["10.81.0.0/24"]
}

resource "azurerm_network_security_group" "server" {
  name                = "${local.prefix}-firewall"
  resource_group_name = data.azurerm_resource_group.project.name
  location            = var.location
  tags                = local.tags

  security_rule {
    name                       = "ssh-administrator"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "22"
    source_address_prefix      = var.admin_cidr
    destination_address_prefix = "*"
  }
  security_rule {
    name                       = "web"
    priority                   = 110
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_ranges    = ["80", "443"]
    source_address_prefix      = "Internet"
    destination_address_prefix = "*"
  }
  security_rule {
    name                       = "deny-other-inbound"
    priority                   = 120
    direction                  = "Inbound"
    access                     = "Deny"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }
}

resource "azurerm_public_ip" "server" {
  name                = "${local.prefix}-ip"
  resource_group_name = data.azurerm_resource_group.project.name
  location            = var.location
  allocation_method   = "Static"
  sku                 = "Standard"
  tags                = local.tags
}

resource "azurerm_network_interface" "server" {
  name                = "${local.prefix}-nic"
  resource_group_name = data.azurerm_resource_group.project.name
  location            = var.location
  tags                = local.tags
  ip_configuration {
    name                          = "server"
    subnet_id                     = azurerm_subnet.server.id
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurerm_public_ip.server.id
  }
}

resource "azurerm_network_interface_security_group_association" "server" {
  network_interface_id      = azurerm_network_interface.server.id
  network_security_group_id = azurerm_network_security_group.server.id
}

resource "azurerm_linux_virtual_machine" "server" {
  name                            = "${local.prefix}-server"
  resource_group_name             = data.azurerm_resource_group.project.name
  location                        = var.location
  size                            = var.vm_size
  admin_username                  = "revenue"
  disable_password_authentication = true
  network_interface_ids           = [azurerm_network_interface.server.id]
  custom_data                     = base64encode(file("${path.module}/cloud-init.yaml"))
  tags                            = local.tags
  admin_ssh_key {
    username   = "revenue"
    public_key = var.ssh_public_key
  }
  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "StandardSSD_LRS"
    disk_size_gb         = 32
  }
  source_image_reference {
    publisher = "Canonical"
    offer     = "ubuntu-24_04-lts"
    sku       = "server"
    version   = "24.04.202609040"
  }
  # No availability zone/set, autoscaling, managed DB/cache, registry or CDN.
  depends_on = [azurerm_network_interface_security_group_association.server]
}

resource "azurerm_managed_disk" "data" {
  name                 = "${local.prefix}-data"
  resource_group_name  = data.azurerm_resource_group.project.name
  location             = var.location
  storage_account_type = "StandardSSD_LRS"
  create_option        = "Empty"
  disk_size_gb         = var.data_disk_size_gb
  tags                 = local.tags
  lifecycle {
    prevent_destroy = true
  }
}

resource "azurerm_virtual_machine_data_disk_attachment" "data" {
  managed_disk_id    = azurerm_managed_disk.data.id
  virtual_machine_id = azurerm_linux_virtual_machine.server.id
  lun                = 0
  caching            = "None"
}
