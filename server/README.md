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
- **Database (Redis)** - Token persistence using Redis
  - optional; required only when GFARM_HTTP_TOKEN_STORE=database
- **Performance** - Performance-related settings
- **Logging** - Local log file output and rotation settings
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


## Using Redis as the Token Store (with Docker Compose)

This section shows an **example configuration** for enabling Redis as the Token Store.  
By default, gfarm-http-gateway stores tokens in the HTTP session.  

If the IdP enforces **refresh token rotation (non-reusable refresh tokens)**, then a long-running `gfptar` execution may require the user to re-login when the refresh token expires.
By enabling **Redis as the Token Store**, the gateway can automatically refresh and update tokens during `gfptar` execution, so the user does not need to re-login.

### 1. Prepare Configuration

#### gfarm-http-gateway Settings

Edit `gfarm-http-gateway.conf`:

```ini
# Enable to store tokens in Redis instead of in-memory sessions
GFARM_HTTP_TOKEN_STORE=database

# Redis connection settings (See gfarm-http-gateway.conf.default for details)
GFARM_HTTP_REDIS_HOST=redis
GFARM_HTTP_REDIS_PORT=6379
GFARM_HTTP_REDIS_DB=0
GFARM_HTTP_REDIS_SSL=no
GFARM_HTTP_REDIS_SSL_CERTFILE=
GFARM_HTTP_REDIS_SSL_KEYFILE=
GFARM_HTTP_REDIS_SSL_CA=
GFARM_HTTP_REDIS_ID_PREFIX=
GFARM_HTTP_TOKEN_TTL_MARGIN=86400
```

##### TLS Settings (Gateway Side)

```ini
GFARM_HTTP_REDIS_SSL=yes                           # enable TLS
GFARM_HTTP_REDIS_SSL_CERTFILE=/path/to/client.crt  # client cert for mTLS
GFARM_HTTP_REDIS_SSL_KEYFILE=/path/to/client.key   # client key for mTLS
GFARM_HTTP_REDIS_SSL_CA=/path/to/redis/ca.crt      # CA bundle (not needed if CA is trusted by OS)
```

#### Redis Settings

Copy and edit the provided sample:

```bash
cp redis.conf.sample ./redis/redis.conf
```

Example (without TLS):
```conf
# Listen on the default Redis port
port 6379

# Disable TLS
tls-port 0
tls-auth-clients no

# Persistence settings
dir /data
appendonly yes
```
> Note: Use non-TLS Redis only inside a private Docker network. Do not expose Redis publicly without TLS and authentication.

Example (with TLS):
```conf
# Disable plaintext, enable TLS
port 0
tls-port 6379

# TLS certificates
tls-ca-cert-file /certs/redis/ca.crt
tls-cert-file    /certs/redis/cert.pem
tls-key-file     /certs/redis/key.pem

# mTLS (set yes to require client certificates)
tls-auth-clients no   # use "yes" to require client certificates (mTLS)

# Data persistence settings
dir /data
appendonly yes
```

### 2. docker-compose.yaml Setup

A sample file is provided (Redis service is commented out):
[`docker-compose.yaml.sample`](./docker-compose.yaml.sample)

```bash
cp docker-compose.yaml.sample docker-compose.yaml
```

Uncomment and edit the Redis section as needed.

### 3. Launch with Docker Compose

Start all services defined in the Compose file:

```bash
docker compose up -d
```

### 4. Stop the Containers

To stop all services defined in your Compose file:

```bash
docker compose down
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

#### Set up the environment

- **Gfarm server environment**
  Configure SASL XOAUTH2 on the server side. In
  `$(pkg-config --variable=libdir libsasl2)/sasl2/gfarm.conf`:

  - `mech_list: XOAUTH2`
    See also: [http://oss-tsukuba.org/gfarm/share/doc/gfarm/html/en/user/auth-sasl.html](http://oss-tsukuba.org/gfarm/share/doc/gfarm/html/en/user/auth-sasl.html)

- **Gfarm client environment**
  Make sure `gf*` commands and `gfarm2.conf` are available.
  In `~/.gfarm2rc` (or `<prefix>/etc/gfarm2.conf`):

  - `auth enable sasl` (or `sasl_auth`)
  - `auth disable <all other methods>`
  - **Do not** set `sasl_mechanisms` or `sasl_user` manually.

- **gfarm-http-gateway requirements**

  - On **Ubuntu 24.04 or RHEL (8, 9)**:

    - Run `make setup` (runs `setup.sh` with `INSTALL_SYS_PACKAGES=0`) to create a Python venv and install Python/Node.js dependencies.
    - Run `make setup-with-sys-packages` (runs `setup.sh` with `INSTALL_SYS_PACKAGES=1`) if you also want to install required **system packages** (Python, Node.js) automatically.
  - On **other environments**:

    - Refer to `setup.sh` for the full list of required packages and install them manually.
  - When using **Pyenv** instead of the system Python:

    - Install and configure Pyenv ([https://github.com/pyenv/pyenv](https://github.com/pyenv/pyenv))
    - Example:

      ```bash
      pyenv install -v 3.12
      cd gfarm-http-gateway
      make clear-venv
      pyenv local 3.12
      make setup   # or make setup-latest
      ```

- **OpenID Connect provider**
  Prepare the following values from your IdP (e.g., Keycloak):

  - Client ID and client secret
  - Valid redirect URI
  - Logout redirect URI (optional)

#### Prepare Configuration

See **Configuration variables**

### Start the server

#### Localhost only (127.0.0.1)

Run the gateway for local testing on your own machine:

```bash
./bin/gfarm-http-gateway.sh
```

- Accessible only from `localhost`.
- For production, run behind a reverse proxy (e.g., NGINX) with HTTPS.

> Note: `gfarm-http-gateway.sh` is a wrapper around **Uvicorn** to launch the FastAPI app (`gfarm_http_gateway:app`).  
> This script:  
> - Loads common paths from `gfarm-http-gateway-common.sh` (virtual environment, Uvicorn binary, app entrypoint).
> - Cleans up temporary files in `$GFARM_HTTP_TMPDIR` before starting.
> - Changes to the project root directory.
> - Runs Uvicorn with `--proxy-headers` and forwards any extra arguments.

#### Accessible from any host (0.0.0.0)

Expose the gateway to all network interfaces:

```bash
./bin/gfarm-http-gateway.sh --host 0.0.0.0 --port 8000
```

- Useful for quick experiments or testing across machines.
- **Not recommended for production** (unencrypted HTTP access to everyone).

#### Developer mode

Run the gateway with developer settings:

```bash
make test             # run automated tests
./bin/gfarm-http-gateway-dev.sh --port 8000
```

- Enables debug logging.
- Listens on all interfaces (`0.0.0.0:8000`).
- May cause high CPU load (auto-reload, detailed logs).
- Intended for development only.

> Note: `gfarm-http-gateway-dev.sh` is a wrapper around **Uvicorn** to launch the FastAPI app > (`gfarm_http_gateway:app`) in **developer mode**.  
> This script:  
> - Loads common paths from `gfarm-http-gateway-common.sh` (virtual environment, Uvicorn binary, app > entrypoint).
> - Runs with `--reload` enabled for automatic code reloading.
> - Sets log level to **debug** for detailed output.
> - Binds to all interfaces (`--host 0.0.0.0`).
> - Uses `--proxy-headers` and forwards any extra arguments.

### Systemd

You can run the gateway as a **systemd service** for automatic startup and easier management.

1. Copy the source tree to a suitable location (e.g., `/opt`):

   ```bash
   cp -r gfarm-http-gateway/server /opt/gfarm-http-gateway
   ```

2. Copy the provided example service file:

   ```bash
   sudo cp gfarm-http.service /etc/systemd/system/
   ```

3. Edit `/etc/systemd/system/gfarm-http.service` to match your environment.

4. Reload systemd so it recognizes the new service:

   ```bash
   sudo systemctl daemon-reload
   ```

5. Enable the service to start automatically on boot:

   ```bash
   sudo systemctl enable gfarm-http
   ```

6. Start the service now:

   ```bash
   sudo systemctl start gfarm-http
   ```

7. Check the status and logs:

   ```bash
   sudo systemctl status gfarm-http
   ```


## File Icons

The Gateway reads `file_icons.json` to decide which icon to display for each file type.

- **How to set this file**:  
  - **Docker**: mount your `file_icons.json` into the container at `/config/file_icons.json`.  
  - **Manual installation**: edit or replace `frontend/app/react-app/dist/assets/file_icons.json` after building the Web UI (e.g., after running `make setup`).

- **Default file in the source tree**:
  - `frontend/app/react-app/public/assets/file_icons.json`  

### Structure

- **category**: maps file extensions to categories  
  - Example: `"image": ["jpg", "jpeg", "png", "gif"]`  
  - Extensions should be lowercase and written without the dot.
- **icons**: maps categories to CSS classes for the icon to display  
  - Example: `"image": "bi bi-file-earmark-image"`
- **css**: the URL of the stylesheet required to load the icons  
  - Example: `"https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css"`

### Display Rules

- **Folders** always use the icon defined in `icons.folder`.  
- **Symlinks** (if present) use the icon defined in `icons.symlink`.  
- **Files** are matched by extension against the categories in `category`.  
   - If a match is found, the corresponding icon from `icons[category]` is used.  
   - If no match is found, the `icons.default` class is used.  

### Example

```json
{
  "category": {
    "image": ["jpg", "jpeg", "png", "gif", "svg"],
    "video": ["mp4", "mov", "avi", "mkv"],
    "audio": ["mp3", "wav", "flac"],
    "document": ["doc", "docx", "txt"],
    "pdf": ["pdf"],
    "archive": ["zip", "rar", "tar", "gz"],
    "code": ["js", "ts", "py", "html", "css", "c", "cpp"]
  },
  "icons": {
    "folder": "bi bi-folder-fill",
    "symlink": "bi bi-link-45deg",
    "image": "bi bi-file-earmark-image",
    "video": "bi bi-file-earmark-play",
    "audio": "bi bi-file-earmark-music",
    "document": "bi bi-file-earmark-text",
    "pdf": "bi bi-file-earmark-pdf",
    "archive": "bi bi-file-earmark-zip",
    "code": "bi bi-file-earmark-code",
    "default": "bi bi-file-earmark"
  },
  "css": "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css"
}
```


## Logging

### Change log level
  Use the `--log-level` option when starting the gateway:

  ```bash
  ./bin/gfarm-http-gateway.sh --log-level info
  ```

  Available levels: `critical`, `error`, `warning`, `info`, `debug`, `trace`

  - See `venv/bin/uvicorn --help`
  - See: [https://www.uvicorn.org/settings/#logging](https://www.uvicorn.org/settings/#logging)

### Change log format
  Set the `LOGURU_FORMAT` environment variable before starting the server.

  ```bash
  LOGURU_FORMAT="<level>{level}</level>: <level>{message}</level>" ./bin/gfarm-http-gateway.sh
  ```

  - Cannot be specified in the configuration file.
  - Defaults are defined in [loguru/\_defaults.py](https://github.com/Delgan/loguru/blob/master/loguru/_defaults.py).


## API Documentation

The gateway provides interactive API documentation via **Swagger UI**, auto-generated by FastAPI.

- Open in a browser at:

  ```
  http://<hostname>:<port>/docs
  ```


## Development

### Development environment in gfarm/docker/dist

You can build and test the gateway inside the **gfarm/docker/dist** developer environment.

1. **Set up gfarm/docker/dist**
   Follow `(gfarm source)/docker/dist/README.md` and configure:

   - `Explore on virtual clusters`
   - `For OAuth authentication`
     - `Use http proxy instead of remote desktop` (squid container)

2. **Clone this repository into the gfarm source tree**

   ```bash
   cd (gfarm source)
   git clone https://github.com/oss-tsukuba/gfarm-http-gateway.git
   ```

3. **Log in to the cluster**

   ```bash
   make     # log in to the c1 container
   ssh c2   # move into the c2 container
   ```

4. **Install dependencies in c2**

   ```bash
   cd ~/gfarm/gfarm-http-gateway/server
   make setup-latest-with-sys-packages
   ```

5. **Launch the gateway in c2**

   ```bash
   bin/gfarm-http-gateway-dev-for-docker-dist.sh --port 8000
   ```

   - Running this command starts the gateway in **developer mode** (debug logging, auto reload).
   - Optionally, repeat steps 4-5 in **c3** if you want another gateway instance.

6. **Configure authentication**

   - Open the Keycloak admin console: `https://keycloak:8443/auth/admin/master/console/#/HPCI/`
     (login with `admin/admin`).
   - In the **HPCI** realm, edit the example client `hpci-pub`.
   - Add redirect URIs:
       - `http://c2:8000/*`
       - `http://c2/*`
   - Add post logout redirect URIs:
       - `http://c2:8000/*`
       - `http://c2/*`
   - Save the changes.

7. **Access the Web UI**
   
   - Open [http://c2:8000/](http://c2:8000/) in a browser.
   - Click the **Login** button, and you will be redirected to [http://keycloak](http://keycloak).
   - Example login: `user1 / PASSWORD`.
   - The landing page includes API usage examples.

### Run tests

- `make test-all` - run all available tests (server + client).
  -  Requires the client to be built first (`cd ../client && make`).
- `make test` - run the following tests:
  - `make test-unit` - run API unit tests with pytest.
  - `make test-flake8` - run style checks with flake8.
  - `make test-playwright` - run Web UI end-to-end tests with Playwright (must be installed).

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
