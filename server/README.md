# Set up gfarm-http-gateway

## Prerequisites

To run gfarm-http-gateway, you need:
- **Gfarm server** with SASL XOAUTH2 enabled  
  - See: <http://oss-tsukuba.org/gfarm/share/doc/gfarm/html/en/user/auth-sasl.html>  
- **OpenID Connect provider** (e.g., Keycloak) with client ID, secret, and valid redirect URIs  

## Configuration variables

`gfarm-http-gateway.conf` is required to run the gateway.
Default values are defined in [`gfarm-http-gateway.conf.default`](./gfarm-http-gateway.conf.default). 

The configuration file is organized into the following sections:

- **Basic** - Basic settings (Gfarm config, CORS, temp directory)
- **Sessions** - Session management and security
- **Authentication** - TLS and SASL authentication
- **OpenID Connect** - OIDC and Keycloak settings  
- **Tokens** - Token verification and validation
- **Performance** - Performance-related settings
- **Development & Debug** - Debug settings (keep defaults for production)

### How to configure

1. Copy the template file

```bash
cp gfarm-http-gateway.conf.default gfarm-http-gateway.conf
```

2. Edit gfarm-http-gateway.conf and update variables for your environment


## Quick Start (example using Docker)

Choose one of the following options depending on your environment.

### Requirements

- Docker
- Docker Compose (for Option 2, Option 3, Option 4)

### Option 1: Run with Docker

> Note: This example uses HTTP and is not recommended for production use.  
> For secure deployments, place the gateway behind a reverse proxy with HTTPS enabled.

#### 1. Build the Docker Image

Clone the repository and build the image:  
```bash
git clone https://github.com/oss-tsukuba/gfarm-http-gateway.git
cd gfarm-http-gateway/server

docker build -t gfarm-http-gateway .
```

#### 2. Prepare Configuration

Create a `config/` directory in your current working directory with the following files:  
```
config/
├── gfarm2.conf              # Gfarm client configuration (required)
├── gfarm-http-gateway.conf  # Gateway configuration (required)
├── certs/                   # Gfarm CA certificates (required)
└── dev_ca.crt               # (Optional) Custom CA certificate (for development)
```

In `gfarm2.conf`, you need to set `auth enable sasl` (or `sasl_auth`)

#### 3. Run the container

```bash
docker run --rm \
  -v $(pwd)/config:/config \
  -p 127.0.0.1:8000:8000 \
  gfarm-http-gateway --host 0.0.0.0
```

By default, **gfarm-http-gateway** listens on port 8000 inside the container.  
To use a different port, pass `--port` to the container command and adjust the `-p` mapping:  
```bash
docker run --rm \
  -v $(pwd)/config:/config \
  -p 127.0.0.1:8080:8080 \
  gfarm-http-gateway --host 0.0.0.0 --port 8080
```

> Note:  
> Port binding:  
> - `-p 127.0.0.1:8000:8000` → binds the container port to **localhost only**.
>   - This means the gateway is accessible at `http://127.0.0.1:8000` or `http://localhost:8000` **from the host machine only**.
> - `-p 192.168.1.100:8000:8000` → accessible only from the specified host IP
> - `-p 8000:8000` → accessible from **all interfaces** (`0.0.0.0:8000`)
>   - Not recommended for production use (exposes unencrypted HTTP to all network clients).
>
> `--host 0.0.0.0`:  
> This makes the gateway listen on all interfaces inside the container. Which interfaces are exposed externally is then controlled by the -p option above.

#### 4. Stop the container

To stop the gateway, press `Ctrl + C` if it's running in the foreground.  
If you ran it in the background (with `-d`), stop it with:  

```bash
docker ps            # find the container ID or name
docker stop <id-or-name>
```


### Option 2: Run Behind NGINX (HTTPS)

Use NGINX as a reverse proxy in front of **gfarm-http-gateway**.  
This example uses Docker Compose.  

#### 1. Fetch gfarm-http-gateway

Clone the repository:  
```bash
git clone https://github.com/oss-tsukuba/gfarm-http-gateway.git
cd gfarm-http-gateway/server
```

#### 2. Prepare the Configuration

Follow the steps in **Option 1 → 2. Prepare Configuration** for the required `config/` files.  

Place the TLS certificate and key files for NGINX (used for HTTPS termination), e.g.:
```bash
nginx/certs/
├── cert.pem   # your server certificate
└── key.pem    # your private key
```
> Note: These are different from the **Gfarm CA certificates** in `config/certs/`.
>
> - `config/certs/` → for the gateway to trust Gfarm
> - `nginx/certs/` → for NGINX to serve HTTPS to clients

Copy the provided sample files:  
```bash
cp docker-compose.yaml.sample docker-compose.yaml
mkdir nginx
cp nginx.conf.sample ./nginx/gfarm.conf
```

Edit them to match your environment:  
- In **`docker-compose.yaml`**:
  - Adjust `--forwarded-allow-ips` to match the subnet of your Docker network
  - Mount the NGINX config and TLS certificates, e.g.:
    - `./nginx/gfarm.conf:/etc/nginx/conf.d/gfarm.conf:ro`
    - `./nginx/certs:/etc/nginx/certs:ro`
- In **`nginx/gfarm.conf`**:
  - Point TLS to your NGINX certificates, e.g.:
    - `ssl_certificate     /etc/nginx/certs/cert.pem;`
    - `ssl_certificate_key /etc/nginx/certs/key.pem;`

#### 3. Launch with Docker Compose

```bash
docker compose up -d
```

#### 4. Stop the Container

To stop all services defined in your Compose file:

```bash
docker compose down
```

### Option 3: Run Under a Subpath

Serve the gateway under a URL prefix (e.g., `/gfarm/`).  
This is useful when you share a domain with other apps behind the same reverse proxy.

#### 1. Set up the gateway

Follow the steps in **Option 1 → 1. Build the Docker Image and 2. Prepare Configuration**.

(If you're using Docker Compose, instead follow **Option 2 → 1. Fetch gfarm-http-gateway and 2. Prepare the Configuration**.)

#### 2. Start the gateway with a root path

- **Docker:**

```bash
  docker run --rm \
    -v $(pwd)/config:/config \
    -p 127.0.0.1:8000:8000 \
    gfarm-http-gateway --host 0.0.0.0 --port 8000 --root-path /gfarm
```

- **Docker Compose:** update the command for the gateway service:

  ```yaml
  services:
    gfarm-http-gateway:
      command: --host 0.0.0.0 --port 8000 --root-path /gfarm
  ```

> Note: `--root-path /gfarm` tells Uvicorn/FastAPI that the app lives under `/gfarm`.

If you use NGINX as a reverse proxy, add a `location /gfarm/` block that preserves `/gfarm` when forwarding:  
```
...
  location /gfarm/ {
    ...
}
```

#### 3. Stop the container

Follow the steps in **Option 1 or Option 2 → 4. Stop the container**

### Option 4: Run in HPCI Shared Storage environment

This option is a preset for HPCI Shared Storage. It expects Docker + Docker Compose.  

> Note: This example uses HTTP and is not recommended for production use.  
> For secure deployments, place the gateway behind a reverse proxy with HTTPS enabled.

#### 1. Fetch gfarm-http-gateway

Follow the steps in **Option 2 → 1. Fetch gfarm-http-gateway**.  

#### 2. Fetch HPCI Shared Storage config and certificate

Run the following script to download HPCI-specific `gfarm2.conf` and CA certificate:
```bash
./download-HPCI-config.sh
```

#### 3. Launch with Docker Compose

For running `gfarm-http-gateway` in the HPCI environment, an example Compose file is provided:  
[`docker-compose-for-HPCI.yaml`](./docker-compose-for-HPCI.yaml)

Build and Run:
```bash
docker compose -f docker-compose-for-HPCI.yaml up -d --build
```

This setup:
- Mounts `gfarm-http-gateway-for-HPCI.conf` as the gateway configuration
- Runs on port 8080 (accessible at `http://localhost:8080`)

#### 4. Stop the container

```bash
docker compose -f docker-compose-for-HPCI.yaml down
```


## Update gfarm-http-gateway and Gfarm client with Docker

### Update gfarm-http-gateway

#### Git pull then Docker build

```bash
# Update gfarm-http-gateway repository
git pull

# Rebuild (Docker)
docker build -t gfarm-http-gateway:latest .
```

#### Using Docker Compose

```bash
git pull
docker compose build
```

> Note: If you need a clean rebuild ignoring cache, add `--no-cache`:  
> `docker build --no-cache -t gfarm-http-gateway:latest .` or `docker compose build --no-cache`.

### Update Gfarm client

You can either pin a released version via `GFARM_VER`, or build from source via `GFARM_SRC_*` args.

#### Build with a released version

```bash
# Build image in the current directory (tag as you like)
docker build \
  --build-arg GFARM_VER=2.8.7 \
  -t gfarm-http-gateway:gfarm-2.8.7 \
  .
```

#### Build from Git repository

> Note: When using the Git source build, **set `GFARM_SRC_URL` to an empty string** and pass branch/tag via `GFARM_SRC_GIT_BRANCH`.  
> `GFARM_SRC_GIT_URL` defaults to `https://github.com/oss-tsukuba/gfarm.git`.  

```bash
docker build \
  --build-arg GFARM_SRC_URL='' \
  --build-arg GFARM_SRC_GIT_URL='https://github.com/oss-tsukuba/gfarm.git' \
  --build-arg GFARM_SRC_GIT_BRANCH='2.8' \
  -t gfarm-http-gateway:gfarm-2.8-src \
  .
```

#### Using Docker Compose

1. Set build args in `docker-compose.yaml`:

```yaml
services:
  gfarm-http-gateway:
    build:
      context: .
      args:
        # Option A: use a released version
        GFARM_VER: "2.8.7"

        # Option B: build from source (leave GFARM_SRC_URL empty)
        # GFARM_SRC_URL: ""
        # GFARM_SRC_GIT_URL: "https://github.com/oss-tsukuba/gfarm.git"
        # GFARM_SRC_GIT_BRANCH: "2.8"
```

2. Build:

```bash
docker compose build
```

### Restart the container

After rebuilding, restart the running container to apply the update:

- **Docker:**

```bash
docker stop <container_id_or_name>
docker run --rm ...   # same command as before
```

- **Docker Compose:**

```bash
docker compose down
docker compose up -d
```

## Manual Installation (example without Docker)

### Requirements

- Gfarm (clients) 2.8.7 or later
- Python 3.12 or later
- venv (python3-venv)
- Python packages (refer to `requirements.txt`)
- GNU Make
- Node.js v22 or later

#### Setup environment

- **Gfarm server environment**
  - in `$(pkg-config --variable=libdir libsasl2)/sasl2/gfarm.conf` of servers
    - `mech_list: XOAUTH2`
  - SEE ALSO: <http://oss-tsukuba.org/gfarm/share/doc/gfarm/html/en/user/auth-sasl.html>
- **Gfarm client environment**
  - gf* commands and gfarm2.conf is required
  - in `~/.gfarm2rc` (or `<prefix>/etc/gfarm2.conf`) of clients
    - `auth enable sasl` (or `sasl_auth`)
    - `auth disable <all other methods>`
    - DO NOT set `sasl_mechanisms <...>`
    - DO NOT set `sasl_user <...>`
- **gfarm-http-gateway requirements**
  - (For Ubuntu 24.04 or RHEL(8,9) family)
    - Run `make setup`
    - To install Python and Node.js via system packages (requires curl): run `make setup-with-sys-packages`
  - (For other environments)
    - Refer to `setup.sh` and install the listed packages manually.
  - (When using Pyenv python3 instead of system python3)
    - install and setup Pyenv: <https://github.com/pyenv/pyenv>
    - (ex.) `pyenv install -v 3.12`
    - `cd gfarm-http-gateway`
    - `make clear-venv`
    - (ex.) `pyenv local 3.12`
    - `make setup` or `make setup-latest`
- **OpenID Connect provider**
  - client ID and client secret
  - valid redirect URI
  - logout redirect URI (optional)

#### Prepare Configuration

See **Configuration variables**

### Start server

#### Start for clients on localhost (127.0.0.1)

- `./bin/gfarm-http-gateway.sh`
- For production use, it is recommended to use this with a reverse proxy.

#### Start for clients of any hosts

- (not for production use)
- `./bin/gfarm-http-gateway.sh --host 0.0.0.0 --port 8000`

#### Start for developer

- (install GNU make)
- `make test` to run test
- `./bin/gfarm-http-gateway-dev.sh --port 8000 --log-level debug`
  - for clients of any hosts (0.0.0.0:8000)
  - high load average

### Systemd

- Copy this gfarm-http-gateway (source tree) to any directory
  - Ex.: /opt/gfarm-http-gateway
- `sudo cp gfarm-http.service /etc/systemd/system/`
  - `gfarm-http.service` is an example file
- Edit `/etc/systemd/system/gfarm-http.service` for your environment
- `sudo systemctl daemon-reload`
- `sudo systemctl enable gfarm-http`
- `sudo systemctl start gfarm-http`
- `sudo systemctl status gfarm-http`

## Logging

- To change log level: --log-level
  - See `venv/bin/uvicorn --help`
  - See: <https://www.uvicorn.org/settings/#logging>
- To change the log format
  - use LOGURU_FORMAT environment variable
    - cannot be specified in a configuration file
  - Ex.: `LOGURU_FORMAT="<level>{level}</level>: <level>{message}</level>"`
  - default: LOGURU_FORMAT from loguru._defaults
    - <https://github.com/Delgan/loguru/blob/master/loguru/_defaults.py>

## API Documentation

- Swagger (auto-generated by FastAPI)
  - <http://(hostname:port)/docs>

## Development

### Development environment in gfarm/docker/dist

- set up gfarm/docker/dist (refer to (gfarm source)/docker/dist/README.md)
  - set up `Explore on virtual clusters`
  - set up `For OAuth authentication`
  - set up `Use http proxy` (squid container)
- clone(git clone) gfarm-http-gateway repository to (gfarm source)/gfarm-http-gateway
- `make`
  - login to c1 container
- `ssh c2`
- (in c2 container)
- `cd ~/gfarm/gfarm-http-gateway/server`
- `make setup-latest-with-sys-packages`
- `bin/gfarm-http-gateway-dev-for-docker-dist.sh  --port 8000 --log-level debug` to launch the gateway
- (Optional) in c3 container, launch the gateway using the same procedure described above
- refer to `Keycloak on gfarm/docker/dist (developer setup)` for configuration details
- use the http proxy (squid) for c2, c3, keycloak and jwt-server for a web browser
- open <https://jwt-server/> in a web browser
- copy the command line of jwt-agent and start jwt-agent in c1 container
  - input the passphrase from jwt-server
- setup [gfarm-http Client](../client)
- `gfmkdir -m 1777 /tmp`
- `export GFARM_HTTP_URL=http://c2:8000`
- `make test-client`
- `make test-unit`
- open <http://c2:8000/> in a web browser
  - auto-redirect to <http://keycloak>
  - login: `user1/PASSWORD`
  - This page contains examples of API usage

#### Keycloak on gfarm/docker/dist (developer setup)

This section shows how to configure **Keycloak** as an OpenID Connect provider in the gfarm/docker/dist environment.  
It is intended as a development example only.

1. Open the Keycloak admin console in a web browser:  
   - `https://keycloak:8443/auth/admin/master/console/#/HPCI/`  
   - Login with `admin/admin`

2. In the **HPCI** realm, an example client `hpci-pub` is already created.  
   Edit it and configure:
   - **Valid redirect URIs** → add entries such as:
     - `http://c2:8000/*`
     - `http://c2/*`
   - **Valid post logout redirect URIs** → add entries such as:
     - `http://c2:8000/*`
     - `http://c2/*`

3. Save your changes.

### To freeze python packages

- Edit requirements_dev.txt
  - Ex.: `uvicorn>=0.34`
- DO NOT edit requirements.txt
- `make setup-latest`

### To update requirements.txt for latest

```
make test-unit
make freeze
git add requirements.txt
git commit requirements.txt
```

### To update frontend/app/react-app/package.json for latest

See `Update packages` in [frontend/app/react-app/README.md](./frontend/app/react-app/README.md)

### GitHub Actions

- See: `../.github/workflows/`
- See: <https://github.com/ad-m/github-push-action?tab=readme-ov-file#requirements-and-prerequisites>
  - (Requirements and Prerequisites)
  - `Read and write permissions` for Actions is required
- Auto `make freeze`, commit and push
- ./requirements.txt may be updated/committed/pushed automatically on GitHub, so `git pull` on your working directory may be required after `git push`
