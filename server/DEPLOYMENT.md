# 🐳 Docker Deployment Guide: Feedback Server

This guide provides step-by-step instructions on how to deploy and configure the Agent Skills Feedback Backend using Docker and Nginx (with HTTPS).

## 1. Prerequisites

- A Server/VPS (e.g., Oracle Cloud, Alibaba Cloud, DigitalOcean).
- Docker and Docker Compose installed.
- A Domain Name pointing to your server's IP address.

## 2. Environment Setup

Create a `.env` file in the `server/` directory of your project:

```env
# GitHub Configuration
GITHUB_TOKEN=your_personal_access_token
GITHUB_OWNER=HoangNguyen0403
GITHUB_REPO=agent-skills-standard

# Server Configuration
NODE_ENV=production
PORT=3000
```

> [!TIP]
> Ensure your GitHub Token has `repo` permissions to create issues.

## 3. Configure Nginx & Domain

Open `server/nginx.conf` and replace `ags-feedback.hoangnguyen.dev` with your actual domain in all locations (3 occurrences).

```nginx
server_name your-domain.com;
...
ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
```

## 4. Deployment Steps

### A. Initial Deployment (Manual SSL setup)

If you are setting up SSL for the first time, you need to generate certificates using Certbot.

1. **Comment out the 443 server block** in `nginx.conf` temporarily.
2. **Start the containers** to handle the ACME challenge:
   ```bash
   cd server
   docker compose up -d
   ```
3. **Run Certbot** to get the certificate:
   ```bash
   docker compose run --rm certbot certonly --webroot --webroot-path /var/www/certbot/ -d your-domain.com
   ```
4. **Restore `nginx.conf`**: Uncomment the 443 block and reload Nginx:
   ```bash
   docker compose restart nginx
   ```

### B. Standard Deployment (Existing Certs)

Once certificates are configured:

```bash
cd server
docker compose up -d --build
```

## 5. Monitoring & Maintenance

### Check Logs

- Backend: `docker compose logs -f feedback-server`
- Nginx: `docker compose logs -f nginx`

### Health Check

Visit `https://your-domain.com/health` to verify the server status.

### Update Deployment

When you push new code to your repo:

```bash
git pull
cd server
docker compose up -d --build
```

## 6. Architecture Overview

- **`feedback-server`**: The NestJS application running on port 3000.
- **`nginx`**: Reverse proxy handling SSL termination and routing.
- **`certbot`**: Automated service that renews SSL certificates every 12 hours.
- **`app-network`**: Isolated bridge network for internal communication.

---

## 7. Initial Setup for Render.com

To use the automated pipeline, you first need to create the service on Render:

1.  **Create a New Web Service**: In your Render Dashboard, click "New" > "Web Service".
2.  **Connect Your Repository**: Select this GitHub repository.
3.  **Configure Runtime**:
    - **Language**: Select **`Docker`**.
    - **Docker Command**: Leave as default (it will use our `Dockerfile`).
    - **Docker Context**: Set to `.` (the root of the repo).
    - **Dockerfile Path**: Set to `server/Dockerfile`.
4.  **Environment Variables**: Add the following in the Render "Environment" tab:
    - `GITHUB_TOKEN`: Your personal access token.
    - `GITHUB_OWNER`: `HoangNguyen0403`.
    - `GITHUB_REPO`: `agent-skills-standard`.
    - `NODE_ENV`: `production`.
5.  **Disable Auto-Deploy**: Go to "Settings" > "General" and set **Auto-Deploy** to **`No`**.
    - _Why?_ We want to control deployments only via our `server-v*` tags using the GitHub Action.
6.  **Capture the Deploy Hook**:
    - Go to "Settings" > "Deploy Hook".
    - Copy the unique URL provided.
    - Go to your GitHub Repo > "Settings" > "Secrets and variables" > "Actions".
    - Create a new secret called `RENDER_DEPLOY_HOOK_URL` and paste the URL there.

## 8. Automated Release Pipeline (Render.com)

The project is configured for automated deployment to Render.com using Git tags.

### Triggering a Release

To deploy a new version of the server:

```bash
pnpm server:release
```

This command will:

1.  Ask you to select a new version (Patch, Minor, Major).
2.  Update `server/package.json` and `CHANGELOG.md`.
3.  Create and push a Git tag with the `server-v*` prefix (e.g., `server-v0.0.5`).
4.  **GitHub Actions** will then automatically trigger the Render.com deploy hook.

### Setup Requirements

- Add `RENDER_DEPLOY_HOOK_URL` to your **GitHub Repository Secrets**. You can find this URL in your Render service dashboard under the "Deploy Hook" section.

🚀 _The server is now fully automated and ready for professional scale!_
