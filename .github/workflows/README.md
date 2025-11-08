# CI/CD Workflows

## Overview

This project uses three separate workflows for continuous integration and deployment:

### 1. Main Pipeline (`main.yml`)
**Trigger**: Push or PR to `main` branch

**Purpose**: Run tests and quality checks on the main development branch

**Jobs**:
- Run unit tests with coverage
- Run E2E tests
- Lint code
- Format check
- Database migrations and seeding

### 2. Sync Release Branch (`sync-release.yml`)
**Trigger**: Push to `main` branch (except commits with `[skip ci]`)

**Purpose**: Automatically sync changes from `main` to `release` branch and trigger release

**Jobs**:
- Checkout code with full history
- Merge `main` into `release` branch
- Push updated `release` branch
- Manually trigger the release workflow via GitHub API

**Note**: 
- Skips execution if commit message contains `[skip ci]` to prevent infinite loops
- Explicitly triggers release workflow to ensure it runs (GitHub Actions doesn't always auto-trigger on branch pushes from workflows)

### 3. Release (`release.yml`)
**Trigger**: 
- Push to `release` branch
- Manual workflow dispatch
- Triggered by sync-release workflow

**Purpose**: Create semantic releases and publish Docker images

**Jobs**:
- Build application
- Run semantic-release to:
  - Analyze commits since last release
  - Generate changelog
  - Create GitHub release
  - Update version in package.json
- Build and push Docker image to GitHub Container Registry

## Release Process

### Automatic Flow
1. Merge PR to `main` branch with conventional commit messages
2. `sync-release.yml` automatically merges `main` → `release`
3. `release.yml` triggers on `release` branch
4. Semantic-release analyzes commits and creates new version if needed

### Conventional Commits
Semantic-release requires conventional commit format:

- `feat:` - New feature (minor version bump)
- `fix:` - Bug fix (patch version bump)
- `BREAKING CHANGE:` - Breaking change (major version bump)
- `chore:`, `docs:`, `style:`, `refactor:`, `test:` - No version bump

### Manual Release
If you need to manually trigger a release:
```bash
git checkout release
git merge main
git push origin release
```

## Troubleshooting

### Release not triggering
- Ensure commits follow conventional commit format
- Check that there are new commits since the last release
- Verify the `release` branch exists and is up to date
- Check GitHub Actions logs for errors

### Docker image not published
- Verify `GITHUB_TOKEN` has package write permissions
- Check that semantic-release successfully created a new version
- Review Docker build logs in the workflow

### Sync conflicts
- If `main` and `release` diverge significantly, manual intervention may be needed
- Resolve conflicts locally and push to `release` branch
