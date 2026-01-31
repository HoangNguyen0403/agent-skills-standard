# 🐳 Cloud Deployment Guide: Feedback Server

This guide provides instructions on how to deploy the Agent Skills Feedback Backend to **Render.com** (or similar PaaS providers like Railway/Fly.io).

## 1. Prerequisites

- A GitHub repository containing this code.
- A **Render.com** account.

## 2. Local Environment Preparation

While Render handles production, you can test the container locally using:

```bash
cd server
docker build -t feedback-server -f Dockerfile ..
docker run -p 3000:3000 feedback-server
```

## 3. Cloud Infrastructure Overview

- **Cloud Platform**: Render.com (Recommended).
- **Runtime**: Docker (Multi-stage build).
- **Security**: Managed SSL and DDoS protection provided by the platform.
- **Scaling**: Managed horizontal/vertical scaling support.

---

## 7. Initial Setup for Render.com

To use the automated pipeline, you first need to create the service on Render:

1. **Create a New Web Service**: In your Render Dashboard, click "New" > "Web Service".
2. **Connect Your Repository**: Select this GitHub repository.
3. **Configure Runtime**:
   - **Language**: Select **`Docker`**.
   - **Docker Command**: Leave as default (it will use our `Dockerfile`).
   - **Docker Context**: Set to `.` (the root of the repo).
   - **Dockerfile Path**: Set to `server/Dockerfile`.
4. **Environment Variables**: Add the following in the Render "Environment" tab:
   - `GITHUB_TOKEN`: Your personal access token.
   - `GITHUB_OWNER`: `HoangNguyen0403`.
   - `GITHUB_REPO`: `agent-skills-standard`.
   - `NODE_ENV`: `production`.
5. **Disable Auto-Deploy**: Go to "Settings" > "General" and set **Auto-Deploy** to **`No`**.
   - _Why?_ We want to control deployments only via our `server-v*` tags using the GitHub Action.
6. **Capture the Deploy Hook**:
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

1. Ask you to select a new version (Patch, Minor, Major).
2. Update `server/package.json` and `CHANGELOG.md`.
3. Create and push a Git tag with the `server-v*` prefix (e.g., `server-v0.0.5`).
4. **GitHub Actions** will then automatically trigger the Render.com deploy hook.

### Setup Requirements

- Add `RENDER_DEPLOY_HOOK_URL` to your **GitHub Repository Secrets**. You can find this URL in your Render service dashboard under the "Deploy Hook" section.

🚀 _The server is now fully automated and ready for professional scale!_
