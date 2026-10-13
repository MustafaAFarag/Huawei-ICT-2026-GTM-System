variable "location" {
  description = "Candidate compute region; subscription/SKU capacity must be checked before deployment."
  type        = string
  default     = "swedencentral"
}

variable "vm_size" {
  description = "Demo baseline: x86, 2 vCPU / 8 GiB. Verify quota, price and measured load before applying."
  type        = string
  default     = "Standard_D2as_v6"
}

variable "ssh_public_key" {
  description = "Public SSH key only; private keys and application secrets never belong in Terraform inputs."
  type        = string
  validation {
    condition     = can(regex("^ssh-(ed25519|rsa) [A-Za-z0-9+/=]+", var.ssh_public_key))
    error_message = "Supply a valid ed25519 or RSA public SSH key."
  }
}

variable "admin_cidr" {
  description = "The administrator's single public IPv4 address, expressed as a /32 CIDR."
  type        = string
  validation {
    condition     = can(cidrnetmask(var.admin_cidr)) && can(regex("/32$", var.admin_cidr)) && var.admin_cidr != "0.0.0.0/32"
    error_message = "Restrict SSH to your public IPv4 /32 address."
  }
}

variable "data_disk_size_gb" {
  type        = number
  default     = 64
  description = "Separate persistent disk for databases, native engines and product files."
  validation {
    condition     = var.data_disk_size_gb >= 64 && var.data_disk_size_gb <= 1024
    error_message = "Data disk size must be between 64 and 1024 GiB."
  }
}
