# Cockpit Identities
User and group management plugin for Houston UI (Cockpit)

![Usage example](docs/identities-example.gif)

## Features
### User Management
- Create delete user accounts
- Edit account details
	- Add and remove groups
	- Change home directory, login shell, account description
- Terminate session (sends SIGHUP to all of the user's processes)
- Manage credentials
	- Account login
		- Set/change password
		- Lock account
		- Manage password expiry
	- Samba
		- Set/change/remove Samba password (smbpasswd)
	- SSH
		- Generate passwordless public/private key pair
		- Copy public SSH key from UI to clipboard
		- Test passwordless SSH to a host
		- Manage authorized SSH access keys from other hosts
- View, filter, and export login history
### Group Management
- View groups and group members
- Create groups
- Delete groups (if it's a non-system, non-primary group)

## Installation
### From 45Drives Repo
#### Ubuntu 20.04
```bash
$ curl -sSL https://repo.45drives.com/setup | sudo bash
$ sudo apt install cockpit-identities
```
#### Rocky 8
```bash
$ curl -sSL https://repo.45drives.com/setup | sudo bash
$ sudo dnf install cockpit-identities
```

If you haven't already, consider getting [cockpit-file-sharing](https://github.com/45drives/cockpit-file-sharing) for managing Samba and NFS shares.
