## Cockpit Identities 0.1.2-1

* Fix race condition where notifications is undefined
* Handle case for password expiry = 99999 (default case)
* Properly determine user primary group from command, not just equal to user login name