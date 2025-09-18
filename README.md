# gfarm-http-gateway

HTTP gateway and CLI client for the [Gfarm distributed filesystem](https://github.com/oss-tsukuba/gfarm).

This repository provides two components:
- **Server**: `server/` — FastAPI application exposing an HTTP API for Gfarm  
- **Client**: `client/` — Command-line interface (CLI) for interacting with the gateway API  


## Features

- Web API for Gfarm
  - Gfarm: <https://github.com/oss-tsukuba/gfarm>
- Web UI
  - File manager: browse, create directories, rename, move, delete, view details
  - Upload / Download files & folders
  - Archive / Extract gfarm files with gfptar
  - Permissions & ACL editor
- Login with OpenID Connect (OIDC)
  - OpenID provider: Keycloak, etc.
- Get an Access Token from the OpenID provider
- Use the Access Token to access Gfarm filesystem
- Refresh tokens automatically


## Quick Links

- **Server setup (Docker or manual):**  
  [server/README.md](./server/README.md)

- **Client usage (CLI):**  
  [client/README.md](./client/README.md)
