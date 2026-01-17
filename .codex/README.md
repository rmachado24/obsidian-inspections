# .codex Directory

This directory contains dependencies from external repositories that are automatically synced.

## Contents

### skills/
Skills from [kepano/obsidian-skills](https://github.com/kepano/obsidian-skills/tree/main/skills)

These files are automatically synced daily via GitHub Actions. The sync workflow fetches the latest versions of skill definitions that can be used by AI agents working with Obsidian.

## Automatic Updates

The files in this directory are automatically updated by the `sync-skills` GitHub Actions workflow, which runs:
- Daily at 00:00 UTC
- On manual trigger via workflow_dispatch
- Whenever changes are pushed to the main branch

To manually trigger an update:
1. Go to Actions tab in GitHub
2. Select "Sync Skills Dependencies" workflow
3. Click "Run workflow"
