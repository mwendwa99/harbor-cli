# Harbor-CLI

Harbor-CLI is a simple, open-source CLI tool for migrating apps from bare-metal servers (e.g., VPS) to Docker. It automates file generation, image building, data syncing, deployments, troubleshooting, and email notifications—with interactive prompts and clear explanations. Works for any tech stack (Node.js/Prisma, Python, React, etc.).

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/harbor-cli.svg)](https://npmjs.org/package/harbor-cli)
[![Downloads/week](https://img.shields.io/npm/dw/harbor-cli.svg)](https://npmjs.org/package/harbor-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<!-- toc -->
* [Why Use Harbor-CLI?](#why-use-harbor-cli)
* [Installation](#installation)
* [Quick Start](#quick-start)
* [Commands](#commands)
* [Examples](#examples)
* [Requirements](#requirements)
* [Contributing](#contributing)
* [License](#license)
<!-- tocstop -->

## Why Use Harbor-CLI?
- **Safe & Automated**: Handles migrations with zero-downtime (e.g., staging deployments) and safety checks.
- **Smart Detection**: Auto-detects your project's stack (e.g., from package.json or requirements.txt) for tailored Docker files.
- **Beginner-Friendly**: Interactive prompts guide you; logs explain every step and why it's needed.
- **Extensible**: Supports Node.js/Prisma/PostgreSQL, Python, React, and more—add your own stacks.
- **Notifications**: Email alerts for events like migration success or failures.
- **Portable**: Run via npm or Docker on Mac, Windows, Linux.

Built for developers migrating live apps without hassle.

## Installation
### Via npm (Recommended for Local Use)
Requires Node.js 18+.
```
npm install -g harbor-cli
```
Verify:
```
harbor-cli --version
```

### Via Docker (No Node.js Needed)
```
docker pull mwendwa99/harbor-cli:latest  # Replace with your Docker Hub repo
```
Run commands (mount your project dir):
```
docker run -it --rm -v $(pwd):/project -w /project mwendwa99/harbor-cli:latest generate
```

## Quick Start
Run from your app's project directory.
1. Generate Docker files:
   ```
   harbor-cli generate
   ```
2. Migrate:
   ```
   harbor-cli migrate --image yourusername/myapp:latest
   ```
3. Troubleshoot issues:
   ```
   harbor-cli troubleshoot
   ```
4. Set up notifications:
   ```
   harbor-cli notify --config
   ```

For help:
```
harbor-cli <command> --help
```

## Commands
### `harbor-cli generate`
Generate or enhance Dockerfile and docker-compose.yml. Auto-detects stack or uses --stack.

```
USAGE
  $ harbor-cli generate [--stack <value>] [--output <value>] [--force]

FLAGS
  --stack=<value>   Force a tech stack (e.g., node-prisma, python, react)
  --output=<value>  Output directory (default: .)
  --force           Overwrite existing files

DESCRIPTION
  Checks for existing files, auto-detects your project (e.g., package.json for Node), and generates customized templates.

EXAMPLES
  $ harbor-cli generate  # Auto-detect and generate
```

_See code: [src/commands/generate.ts](https://github.com/mwendwa99/harbor-cli/blob/main/src/commands/generate.ts)_

### `harbor-cli migrate --image <value>`
Migrate app to Docker: Build/push image, sync data, deploy staging.

```
USAGE
  $ harbor-cli migrate --image <value> [--vps <value>] [--dbType <value>] [--force]

FLAGS
  --image=<value>   (required) Docker image name (e.g., username/app:latest)
  --vps=<value>     VPS SSH address (e.g., user@ip)
  --dbType=<value>  Database type (postgres, mysql, none)
  --force           Skip confirmations

DESCRIPTION
  Automates safe migration with staging for testing. Checks for Docker files first.

EXAMPLES
  $ harbor-cli migrate --image myapp:latest --dbType postgres
```

_See code: [src/commands/migrate.ts](https://github.com/mwendwa99/harbor-cli/blob/main/src/commands/migrate.ts)_

### `harbor-cli troubleshoot`
Diagnose Docker issues: Check containers, logs, ports.

```
USAGE
  $ harbor-cli troubleshoot [--container <value>]

FLAGS
  --container=<value>  Specific container name

DESCRIPTION
  Interactive wizard to inspect and fix common problems.

EXAMPLES
  $ harbor-cli troubleshoot  # Lists and selects containers
```

_See code: [src/commands/troubleshoot.ts](https://github.com/mwendwa99/harbor-cli/blob/main/src/commands/troubleshoot.ts)_

### `harbor-cli notify`
Set up/send email notifications.

```
USAGE
  $ harbor-cli notify [--config] [--to <value>] [--subject <value>] [--message <value>]

FLAGS
  --config            Configure SMTP (interactive)
  --to=<value>        Recipient email
  --subject=<value>   Email subject (default: HarborCLI Notification)
  --message=<value>   Email body (default: Test message)

DESCRIPTION
  Configures SMTP via env vars and sends alerts.

EXAMPLES
  $ harbor-cli notify --config  # Setup
  $ harbor-cli notify --to you@email.com --message "Migration done!"
```

_See code: [src/commands/notify.ts](https://github.com/mwendwa99/harbor-cli/blob/main/src/commands/notify.ts)_

## Examples
- **Node.js/Prisma App**:
  ```
  harbor-cli generate --stack node-prisma
  harbor-cli migrate --image myapp:latest --dbType postgres
  harbor-cli troubleshoot
  harbor-cli notify --to admin@email.com --message "Migration successful"
  ```

- **Python App**:
  ```
  harbor-cli generate --stack python
  harbor-cli migrate --image mypythonapp:latest
  ```

- **With VPS**:
  ```
  harbor-cli migrate --image myapp:latest --vps user@myvps-ip
  ```

## Requirements
- Docker (for building/deploying).
- For DB sync: `pg_dump` (Postgres) or `mysqldump` (MySQL).
- For notifications: SMTP account (e.g., Gmail with app password).
- For VPS: SSH access.

## Contributing
Fork on GitHub: https://github.com/mwendwa99/harbor-cli  
1. Clone: `git clone https://github.com/mwendwa99/harbor-cli.git`  
2. Install: `npm install`  
3. Develop: Add to `src/commands/` and test with `npm run build && node bin/dev.js`  
4. PR: Submit pull requests!  

See CONTRIBUTING.md for details.

## License
MIT
