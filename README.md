<div align="center">

# Claude Code Notes

[![Cheatsheet](https://img.shields.io/badge/cheatsheet-SVG-orange.svg)](claude-code-cheatsheet.svg)

</div>

---

## Quick Navigation

<table>
<tr>
<td width="33%" valign="top">

**Core Reference**
- [Configuration](#configuration)
- [Multiple Profiles](#multiple-profiles-claude_config_dir)
- [Status Line Setup](#status-line-setup)
- [CLAUDE.md & Memory](#claudemd--project-memory)
- [Slash Commands](#slash-commands)
- [Custom Commands](#custom-slash-commands)
- [Headless Mode](#headless-mode)
- [Checkpointing & Rewind](#checkpointing--rewind)

</td>
<td width="33%" valign="top">

**Advanced Features**
- [Agent Skills](#agent-skills)
- [Subagents](#subagents)
- [Plugins](#plugins)
- [MCP Servers & Integrations](#mcp-servers--integrations)
- [Git Worktrees](#git-worktrees)
- [Permissions & Security](#permissions--security)
- [Hooks & Automation](#hooks--automation)

</td>
<td width="33%" valign="top">

**How-To Guides (MCP)**
- [Edit PDFs](#edit-pdfs) | [Convert Docs](#convert-documents) | [Read Excel](#read-excel)
- [Query DBs](#query-databases) | [PostgreSQL](#connect-to-postgresql)
- [Browser](#automate-browsers) | [Scraping](#scrape-websites)
- [Email](#send-emails) | [Notion](#manage-notion) | [Calendar](#manage-calendar)
- [Slack](#read-slack) | [Discord](#use-discord) | [Telegram](#use-telegram) | [WhatsApp](#use-whatsapp)
- [GitHub](#manage-github) | [PRs](#create-pull-requests) | [Jira](#manage-jira)
- [Errors](#track-errors) | [APIs](#call-rest-apis) | [Tests](#run-tests)
- [Memory](#give-claude-memory) | [Docs](#search-documentation) | [Obsidian](#use-obsidian)
- [Docker](#manage-docker) | [K8s](#manage-kubernetes) | [AWS](#deploy-to-aws) | [Monitor](#monitor-servers)
- [Figma](#use-figma) | [YouTube](#use-youtube) | [3D](#create-3d-models)

</td>
</tr>
</table>

---

# CORE REFERENCE

## Configuration

**Settings priority (highest to lowest):**

| Priority | Location | Scope |
|---|---|---|
| 1 | `/etc/claude-code/managed-settings.json` | Enterprise policy |
| 2 | `.claude/settings.local.json` | Project local (gitignored) |
| 3 | `.claude/settings.json` | Project shared (committed) |
| 4 | `~/.claude/settings.json` | User global |

<sup>[Back to top](#quick-navigation)</sup>

---

## Multiple Profiles (CLAUDE_CONFIG_DIR)

Run multiple Claude Code accounts or isolated configurations side by side using the `CLAUDE_CONFIG_DIR` environment variable. Each profile gets its own settings, sessions, and usage limits.

```bash
# Set up shell aliases for different accounts
alias claude-work='CLAUDE_CONFIG_DIR=~/.claude-work claude'
alias claude-personal='CLAUDE_CONFIG_DIR=~/.claude-personal claude'

# Or export for the current shell session
export CLAUDE_CONFIG_DIR="$HOME/.claude-work"
claude
```

**How it works:**
- `CLAUDE_CONFIG_DIR` tells Claude Code where to store config, sessions, and memory
- Default location: `~/.claude/` (or `~/.config/claude/` on newer versions)
- Each directory is fully isolated -- separate settings, MCP configs, and conversation history
- Requires separate Anthropic accounts (different emails) for separate usage limits

**Parallel usage:**

```bash
# Terminal 1 -- work account
CLAUDE_CONFIG_DIR=~/.claude-work claude

# Terminal 2 -- personal account
CLAUDE_CONFIG_DIR=~/.claude-personal claude
```

**Community tools for profile management:**
- [claude-code-profiles](https://github.com/pegasusheavy/claude-code-profiles) -- profile switcher
- [clausona](https://github.com/larcane97/clausona) -- CLI profile manager

> **Note:** This is an unofficial/undocumented feature. The `/ide` command may not work with custom config dirs. Claude may still create local `.claude/` directories in project workspaces.

<sup>[Back to top](#quick-navigation)</sup>

---

## Status Line Setup

Show real-time Claude Code status (model, cost, mode) in your terminal prompt.

```bash
npx -y ccstatusline@latest
```

This configures your shell to display a status line showing the active model, token usage, and current mode while Claude Code is running.

<sup>[Back to top](#quick-navigation)</sup>

---

## CLAUDE.md & Project Memory

`CLAUDE.md` is a special file that Claude reads at the start of every conversation to understand project context, conventions, and rules.

### File Locations & Inheritance

Claude loads `CLAUDE.md` files from multiple locations and merges them in order:

| Location | Scope | Loaded When |
|---|---|---|
| `~/.claude/CLAUDE.md` | User global | Always |
| `CLAUDE.md` (repo root) | Project-wide | When in this repo |
| `CLAUDE.md` (any subfolder) | Folder-specific | When working in that folder |
| `.claude/CLAUDE.md` | Project config dir | When in this repo |

**Inheritance rules:**
- Claude loads **all** `CLAUDE.md` files from the repo root down to the current working directory
- A `CLAUDE.md` in `src/api/` will be loaded **in addition to** the root `CLAUDE.md` when working in `src/api/`
- More specific (deeper) files can override or extend rules from parent directories
- Use `/init` to generate a starter `CLAUDE.md` for your project

### What to Put in CLAUDE.md

```markdown
# Project Overview
Brief description of what this project does.

# Tech Stack
- TypeScript, React 19, Next.js 15
- PostgreSQL via Prisma ORM
- Testing: Vitest + Playwright

# Conventions
- Use functional components, not classes
- Prefer named exports over default exports
- Error messages must be user-friendly (no stack traces in UI)
- All API routes need input validation with Zod

# File Structure
- src/app/ -- Next.js app router pages
- src/lib/ -- Shared utilities and helpers
- src/components/ -- React components

# Commands
- `npm run dev` -- Start dev server
- `npm test` -- Run tests
- `npm run lint` -- Lint and type-check

# Rules
- Never modify migration files after they are committed
- Always run tests before suggesting a commit
- Use conventional commit messages (feat:, fix:, refactor:, etc.)
```

### Subfolder CLAUDE.md Example

File: `src/api/CLAUDE.md`

```markdown
# API-Specific Rules
- All endpoints must validate input with Zod schemas
- Return consistent error format: { error: string, code: number }
- Add rate limiting to any public-facing endpoint
- Log all mutations with user context
```

This file is loaded **on top of** the root `CLAUDE.md` when Claude works in `src/api/`.

### Editing Memory

Use `/memory` to quickly open and edit your `CLAUDE.md` files from within a Claude session.

<sup>[Back to top](#quick-navigation)</sup>

---

## Slash Commands

| Command | Purpose |
|---|---|
| `/add-dir` | Add directory to session context |
| `/agents` | List available subagents |
| `/bug` | Report a bug to Anthropic |
| `/clear` | Clear conversation history |
| `/compact [focus]` | Compress conversation to save context |
| `/config` | View/modify settings |
| `/cost` | Show token usage & cost |
| `/doctor` | Run setup diagnostics |
| `/help` | Show available commands |
| `/init` | Create `CLAUDE.md` for project |
| `/login` / `/logout` | Account management |
| `/mcp` | Manage MCP servers |
| `/memory` | Edit `CLAUDE.md` memory files |
| `/model` | Switch active model |
| `/permissions` | View/update tool permissions |
| `/pr_comments` | View PR comments |
| `/review` | Request code review |
| `/rewind` | Roll back to checkpoint |
| `/sandbox` | Toggle sandboxed execution |
| `/status` | Session info |
| `/terminal-setup` | Configure terminal integration |
| `/usage` | Show API usage & quota |
| `/vim` | Toggle vim keybindings |

### Custom Slash Commands

Store `.md` files in `.claude/commands/` (project) or `~/.claude/commands/` (global).

```markdown
---
description: Deploy to staging
argument_hint: <environment>
model: claude-sonnet-4-20250514
---

Deploy the project to the $ARGUMENTS environment:
1. Run tests
2. Build production bundle
3. Push to deployment target
```

Usage: `/project:deploy staging`

Variables: `$ARGUMENTS` (all args), `$1`, `$2`, `$3` (positional)

<sup>[Back to top](#quick-navigation)</sup>

---

## Headless Mode

Run Claude Code programmatically without the interactive REPL.

```bash
# Basic
claude -p "Explain what this project does"

# JSON output
claude -p "List all functions" --output-format json

# Streaming JSON
claude -p "Refactor this" --output-format stream-json

# Continue previous session
claude -p "Add error handling" --session-id abc123
claude -p "What was I working on?" --continue

# Pipe input
cat error.log | claude -p "What caused this?"
git diff HEAD~3 | claude -p "Summarize changes"

# Control autonomy
claude -p "Fix lint errors" --max-turns 10
claude -p "Run tests" --allowedTools "Bash,Read,Edit"
```

**Real-world examples:**

```bash
# SRE triage
LOGS=$(kubectl logs deployment/api --tail=200)
claude -p "Analyze these logs: $LOGS" --output-format json --max-turns 5

# Batch processing
for file in src/**/*.ts; do
  claude -p "Add JSDoc to all exports in @$file" --max-turns 3
done
```

<sup>[Back to top](#quick-navigation)</sup>

---

## Checkpointing & Rewind

Claude Code auto-creates checkpoints before every file-modifying turn.

**Trigger rewind:** `Esc` `Esc` or `/rewind`

| Rewind Type | Behavior |
|---|---|
| Conversation only | Remove last turn, keep file changes |
| Code only | Revert files, keep conversation |
| Full rewind | Restore both conversation and code |

**Limitations:** Shell side-effects (API calls, DB migrations) cannot be undone. Only git-tracked files are restored.

<sup>[Back to top](#quick-navigation)</sup>

---

# ADVANCED FEATURES

## Agent Skills

Reusable instruction sets that teach Claude how to perform specific tasks.

| Location | Scope |
|---|---|
| `.claude/skills/` | Project (team-shared) |
| `~/.claude/skills/` | User (personal) |

**Example:** `.claude/skills/commit-helper.md`

```markdown
---
name: commit-helper
description: Generates commit messages following conventional commits
triggers:
  - commit
  - save changes
---

When asked to commit:
1. Run `git diff --staged`
2. Analyze change type (feat/fix/refactor/docs/test)
3. Write message under 72 chars following Conventional Commits
4. Add body paragraph if change needs explanation
```

| Aspect | Skills | Slash Commands |
|---|---|---|
| Activation | Automatic or `/skill` | Explicitly typed |
| Purpose | Background knowledge | On-demand actions |
| Arguments | Not supported | `$ARGUMENTS` |

<sup>[Back to top](#quick-navigation)</sup>

---

## Subagents

Specialized Claude instances that the main agent delegates tasks to.

| Location | Scope |
|---|---|
| `.claude/agents/` | Project-level |
| `~/.claude/agents/` | Global |

**Commands:** `/agents` to list, `/agent:<name> "task"` to invoke.

**Example:** `.claude/agents/code-reviewer.md`

```markdown
---
name: code-reviewer
description: Reviews code for quality, security, and maintainability
model: claude-sonnet-4-20250514
tools:
  - Read
  - Grep
  - Glob
  - Bash
---

You are a senior code reviewer. When given code:
1. Read all relevant files
2. Check for bugs, logic errors, edge cases
3. Evaluate style and naming
4. Look for security vulnerabilities
5. Suggest performance improvements
6. Score 0-100

Output: Summary, Issues, Suggestions, Score.
```

Other useful agents: **debugger** (investigate & fix bugs), **data-scientist** (analysis & queries).

> **Tip:** Keep tool lists minimal -- only grant what each agent needs.

<sup>[Back to top](#quick-navigation)</sup>

---

## Plugins

Extend Claude Code with installable packages.

```bash
claude plugins list                      # Browse plugins
claude plugins install <name>            # Install
claude plugins remove <name>             # Remove
claude plugins update                    # Update all
```

Plugins can bundle: commands, agents, skills, hooks, and MCP servers.

<sup>[Back to top](#quick-navigation)</sup>

---

## MCP Servers & Integrations

MCP servers bridge Claude with external tools and services.

```bash
# Add servers
claude mcp add <name> -- <command> [args...]          # stdio (default)
claude mcp add remote --transport sse --url <url>     # SSE
claude mcp add web --transport http --url <url>       # HTTP

# Manage
claude mcp list
claude mcp remove <name>
```

### Popular MCP Servers

| Category | Server | Install |
|---|---|---|
| **Browser** | Playwright | `claude mcp add playwright -- npx @anthropic-ai/mcp-playwright` |
| **Browser** | Puppeteer | `claude mcp add puppeteer -- npx @anthropic-ai/mcp-puppeteer` |
| **Git** | GitHub | `claude mcp add github -- npx @anthropic-ai/mcp-github` |
| **Chat** | Slack | `claude mcp add slack -- npx @anthropic-ai/mcp-slack` |
| **DB** | PostgreSQL | `claude mcp add postgres -- npx @anthropic-ai/mcp-postgres` |
| **DB** | MySQL | `claude mcp add mysql -- npx @anthropic-ai/mcp-mysql` |
| **DB** | MongoDB | `claude mcp add mongodb -- npx @anthropic-ai/mcp-mongodb` |
| **DB** | Redis | `claude mcp add redis -- npx @anthropic-ai/mcp-redis` |
| **DB** | Supabase | `claude mcp add supabase -- npx @anthropic-ai/mcp-supabase` |
| **DB** | Firebase | `claude mcp add firebase -- npx @anthropic-ai/mcp-firebase` |
| **DB** | Elasticsearch | `claude mcp add elasticsearch -- npx @anthropic-ai/mcp-elasticsearch` |
| **Files** | Filesystem | `claude mcp add filesystem -- npx @anthropic-ai/mcp-filesystem /path` |
| **Cloud** | AWS | `claude mcp add aws -- npx @anthropic-ai/mcp-aws` |
| **Cloud** | Vercel | `claude mcp add vercel -- npx @anthropic-ai/mcp-vercel` |
| **Cloud** | Cloudflare | `claude mcp add cloudflare -- npx @anthropic-ai/mcp-cloudflare` |
| **Cloud** | Netlify | `claude mcp add netlify -- npx @anthropic-ai/mcp-netlify` |
| **DevOps** | Docker | `claude mcp add docker -- npx @anthropic-ai/mcp-docker` |
| **PM** | Jira | `claude mcp add jira -- npx @anthropic-ai/mcp-jira` |
| **PM** | Linear | `claude mcp add linear -- npx @anthropic-ai/mcp-linear` |
| **PM** | Notion | `claude mcp add notion -- npx @anthropic-ai/mcp-notion` |
| **PM** | Asana | `claude mcp add asana -- npx @anthropic-ai/mcp-asana` |
| **PM** | ClickUp | `claude mcp add clickup -- npx @anthropic-ai/mcp-clickup` |
| **PM** | Monday | `claude mcp add monday -- npx @anthropic-ai/mcp-monday` |
| **PM** | Airtable | `claude mcp add airtable -- npx @anthropic-ai/mcp-airtable` |
| **Design** | Figma | `claude mcp add figma -- npx @anthropic-ai/mcp-figma` |
| **Design** | Canva | `claude mcp add canva -- npx @anthropic-ai/mcp-canva` |
| **Monitor** | Sentry | `claude mcp add sentry -- npx @anthropic-ai/mcp-sentry` |
| **Monitor** | Datadog | `claude mcp add datadog -- npx @anthropic-ai/mcp-datadog` |
| **Monitor** | Grafana | `claude mcp add grafana -- npx @anthropic-ai/mcp-grafana` |
| **Monitor** | PagerDuty | `claude mcp add pagerduty -- npx @anthropic-ai/mcp-pagerduty` |
| **Payments** | Stripe | `claude mcp add stripe -- npx @anthropic-ai/mcp-stripe` |
| **Payments** | PayPal | `claude mcp add paypal -- npx @anthropic-ai/mcp-paypal` |
| **Payments** | Square | `claude mcp add square -- npx @anthropic-ai/mcp-square` |
| **Storage** | Google Drive | `claude mcp add gdrive -- npx @anthropic-ai/mcp-gdrive` |
| **Storage** | Box | `claude mcp add box -- npx @anthropic-ai/mcp-box` |
| **Comms** | Twilio | `claude mcp add twilio -- npx @anthropic-ai/mcp-twilio` |
| **Comms** | SendGrid | `claude mcp add sendgrid -- npx @anthropic-ai/mcp-sendgrid` |
| **CRM** | HubSpot | `claude mcp add hubspot -- npx @anthropic-ai/mcp-hubspot` |
| **CRM** | Salesforce | `claude mcp add salesforce -- npx @anthropic-ai/mcp-salesforce` |
| **CRM** | Intercom | `claude mcp add intercom -- npx @anthropic-ai/mcp-intercom` |
| **Support** | Zendesk | `claude mcp add zendesk -- npx @anthropic-ai/mcp-zendesk` |
| **Ecommerce** | Shopify | `claude mcp add shopify -- npx @anthropic-ai/mcp-shopify` |
| **Automation** | Zapier | `claude mcp add zapier -- npx @anthropic-ai/mcp-zapier` |
| **AI** | Hugging Face | `claude mcp add huggingface -- npx @anthropic-ai/mcp-huggingface` |
| **Media** | Cloudinary | `claude mcp add cloudinary -- npx @anthropic-ai/mcp-cloudinary` |
| **Docs** | Confluence | `claude mcp add confluence -- npx @anthropic-ai/mcp-confluence` |

> Config stored in `.claude/mcp.json` when added from a project directory.

<sup>[Back to top](#quick-navigation)</sup>

---

## Git Worktrees

Work on multiple branches simultaneously, each with its own Claude Code session.

```bash
# Create / list / remove
git worktree add <path> <branch>
git worktree add <path> -b <new-branch> <start-point>
git worktree list
git worktree remove <path>
git worktree prune
```

**Parallel features:**

```bash
# Terminal 1
git worktree add ../myapp-auth auth-refactor && cd ../myapp-auth && claude

# Terminal 2
git worktree add ../myapp-dashboard dashboard-v2 && cd ../myapp-dashboard && claude
```

**Hotfix without disruption:**

```bash
git worktree add ../myapp-hotfix main
cd ../myapp-hotfix && claude  # fix → push → return to feature branch
```

**Compare approaches or models:**

```bash
git worktree add ../try-a experiment-a
git worktree add ../try-b experiment-b
# Run different models: claude --model sonnet vs claude --model opus
```

<sup>[Back to top](#quick-navigation)</sup>

---

## Permissions & Security

```json
{
  "permissions": {
    "allow": [
      "Read", "Glob", "Grep",
      "Bash(git status)", "Bash(git diff)", "Bash(git log)",
      "Bash(npm test)", "Bash(npm run lint)"
    ],
    "deny": [
      "Bash(rm -rf *)", "Bash(curl * | bash)", "Bash(sudo *)"
    ]
  }
}
```

**Strict mode (read-only):**

```json
{ "permissions": { "allow": ["Read", "Glob", "Grep"], "deny": ["Bash", "Edit", "Write"] } }
```

**MCP permissions:** `"allow": ["mcp__github"]` (all tools from server) or `"mcp__github__get_issue"` (specific tool). Wildcards NOT supported.

**Enterprise:** Managed settings at `/etc/claude-code/managed-settings.json`. Deny lists take absolute precedence.

<sup>[Back to top](#quick-navigation)</sup>

---

## Hooks & Automation

Run custom scripts at specific lifecycle events.

| Event | When |
|---|---|
| `PreToolUse` | Before any tool call |
| `PostToolUse` | After tool finishes |
| `UserPromptSubmit` | When user sends message |
| `Notification` | On notifications |
| `Stop` | When Claude finishes responding |
| `SubagentStop` | When subagent completes |
| `PreCompact` | Before conversation compaction |
| `SessionStart` | Session begins/resumes |
| `SessionEnd` | Session ends |

**Environment variables:** `CLAUDE_TOOL_NAME`, `CLAUDE_TOOL_INPUT`, `CLAUDE_FILE_PATH`, `CLAUDE_USER_PROMPT`, `CLAUDE_SESSION_ID`

**Exit codes:** `0` = success, `2` = block & show to Claude, other = error

**Example -- auto-format on edit:**

```json
{
  "hooks": {
    "PostToolUse": [
      { "matcher": "Edit", "command": "npx prettier --write $CLAUDE_FILE_PATH" },
      { "matcher": "Write", "command": "npx prettier --write $CLAUDE_FILE_PATH" }
    ]
  }
}
```

**Example -- lint TypeScript after edits:**

```json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Edit",
      "command": "if echo $CLAUDE_FILE_PATH | grep -q '\\.ts$'; then npx eslint --fix $CLAUDE_FILE_PATH; fi"
    }]
  }
}
```

**Example -- block dangerous prompts:**

```json
{
  "hooks": {
    "UserPromptSubmit": [{
      "command": "echo $CLAUDE_USER_PROMPT | grep -qi 'delete.*production' && echo 'BLOCKED' && exit 1 || exit 0"
    }]
  }
}
```

<sup>[Back to top](#quick-navigation)</sup>

---

# HOW-TO GUIDES: MCP INTEGRATIONS

> Each guide covers recommended MCP tools, setup commands, and example prompts.

## File Manipulation

### Edit PDFs

**Tools:** MarkItDown (`pip install 'markitdown[all]'`), Markdownify MCP (`npx markdownify-mcp`), MCP Pandoc (`pip install mcp-pandoc`)

| Tool | Best For | Setup |
|---|---|---|
| MarkItDown | Text extraction with structure | `pip install 'markitdown[all]'` |
| Markdownify MCP | Quick conversions | `npx markdownify-mcp` |
| MCP Pandoc | Multi-format output | `pip install mcp-pandoc` |

> "Read the PDF at /docs/report.pdf, extract all tables, summarize key metrics, then convert to a new PDF."

### Convert Documents

**Tools:** MarkItDown, MCP Pandoc (40+ formats), Markdownify MCP, Fetch MCP

| Tool | Best For | Formats |
|---|---|---|
| MarkItDown | Any → Markdown | DOCX, PDF, PPTX, XLSX, HTML |
| MCP Pandoc | Bidirectional | 40+ formats via Pandoc |
| Fetch MCP | Remote files | HTTP URLs with auth |

> "Convert /reports/annual-review.docx to Markdown, clean up formatting, then generate a styled PDF."

### Read Excel

**Tools:** MarkItDown, Microsoft 365 MCP, Markdownify MCP

| Tool | Best For | Setup |
|---|---|---|
| MarkItDown | Local .xlsx/.xls files | `pip install 'markitdown[all]'` |
| Microsoft 365 MCP | Cloud OneDrive/SharePoint files | MS Graph API credentials |

> "Open /data/sales-q4.xlsx, read all sheets, break down revenue by region, flag discounts over 30%."

<sup>[Back to top](#quick-navigation)</sup>

---

## Database & SQL

### Query Databases

**Tools:** Supabase MCP, Postgres MCP Pro (`pip install postgres-mcp`), MCP Toolbox (Google), MySQL MCP

| Tool | Best For | Setup |
|---|---|---|
| Supabase MCP | Supabase projects | Remote URL config |
| Postgres MCP Pro | PG performance tuning | `pip install postgres-mcp` |
| MCP Toolbox | Multi-DB enterprise | Google Cloud config |
| MySQL MCP | MySQL/MariaDB | `pip install mysql-mcp-server` |

> "Show all order-related tables, find top 10 customers by spend in the last 90 days."

### Connect to PostgreSQL

**Tools:** Postgres MCP Pro, Postgres MCP (Anthropic), Supabase MCP

| Tool | Best For | Setup |
|---|---|---|
| Postgres MCP Pro | Deep analysis & optimization | `pip install postgres-mcp` |
| Postgres MCP | Simple queries | `npx @modelcontextprotocol/server-postgres` |
| Supabase MCP | Managed Supabase PG | Remote URL |

Connection string: `postgresql://user:pass@host:5432/dbname`

> "Analyze query performance for the users table, suggest missing indexes, rewrite the slowest query."

<sup>[Back to top](#quick-navigation)</sup>

---

## Browser & Web

### Automate Browsers

**Tools:** Playwright MCP (24k stars), Browser MCP (ByteDance, 19k), BrowserMCP, mcp-playwright

| Tool | Best For | Setup |
|---|---|---|
| Playwright MCP | Production automation | `npx @anthropic-ai/playwright-mcp` |
| Browser MCP | Existing browser sessions | Browser extension |
| BrowserMCP | Quick tasks | `npx browsermcp` |

> "Open the dashboard, log in, navigate to reports, download monthly usage as PDF."

### Scrape Websites

**Tools:** Apify Actors, Fetcher MCP, Playwright MCP, Fetch MCP

| Tool | Best For | Setup |
|---|---|---|
| Apify Actors | Scale + anti-bot | `npx @apify/actors-mcp-server` |
| Fetcher MCP | Clean article extraction | `npx fetcher-mcp` |
| Playwright MCP | JS-heavy/dynamic sites | Via Playwright config |
| Fetch MCP | Simple HTTP requests | `npx fetch-mcp` |

> "Scrape top 20 products from /electronics, extract name, price, rating, availability into a table."

<sup>[Back to top](#quick-navigation)</sup>

---

## Communication

### Send Emails

**Tools:** Google Workspace MCP (`uvx workspace-mcp`), Gmail MCP, AgentMail MCP

| Tool | Best For | Setup |
|---|---|---|
| Google Workspace MCP | Gmail + Calendar + Drive | `uvx workspace-mcp` |
| Gmail MCP | Gmail only | Google API credentials |
| AgentMail MCP | AI-native email | `npx -y agentmail-mcp` |

> "Check my inbox for unread emails from the engineering team, summarize each, draft replies."

### Manage Notion

**Tools:** Notion MCP (Official), Notion MCP (Community)

| Tool | Best For | Setup |
|---|---|---|
| Notion MCP (Official) | Full Notion API | `npx @anthropic-ai/mcp-notion` |

> "Create a new page in the Engineering wiki with today's architecture decisions."

### Manage Calendar

**Tools:** Google Workspace MCP, Google Calendar MCP

| Tool | Best For | Setup |
|---|---|---|
| Google Workspace MCP | Google Calendar | `uvx workspace-mcp` |

> "Show my meetings for this week, find a free 1-hour slot on Thursday, create a team sync."

### Read Slack

**Tools:** Slack MCP (Anthropic), Slack MCP (Community)

| Tool | Best For | Setup |
|---|---|---|
| Slack MCP | Read/post messages | `npx @anthropic-ai/mcp-slack` |

> "Read the last 20 messages in #engineering, summarize the key discussions."

### Use Discord

**Tools:** Discord MCP

| Tool | Best For | Setup |
|---|---|---|
| Discord MCP | Server interactions | Bot token config |

> "Read recent messages in #dev-chat, summarize topics discussed today."

### Use Telegram

**Tools:** Telegram MCP

| Tool | Best For | Setup |
|---|---|---|
| Telegram MCP | Bot messaging | Bot API token |

> "Send a deployment notification to the ops group with build details."

### Use WhatsApp

**Tools:** WhatsApp MCP (via Twilio/Business API)

| Tool | Best For | Setup |
|---|---|---|
| WhatsApp MCP | Business messaging | Twilio/Business API |

> "Send the order confirmation to the customer's WhatsApp number."

<sup>[Back to top](#quick-navigation)</sup>

---

## Development

### Manage GitHub

**Tools:** GitHub MCP Server (Official, 25k stars), GitMCP (7k), MCP Git Ingest

| Tool | Best For | Setup |
|---|---|---|
| GitHub MCP | Full GitHub ops | Remote URL `https://api.githubcopilot.com/mcp/` |
| GitMCP | Reading public repos | `gitmcp.io` URLs |
| MCP Git Ingest | Codebase analysis | Repo URL config |

> "Find unassigned bug issues, summarize each, create a priority list by reactions."

### Create Pull Requests

**Tools:** GitHub MCP Server, Git MCP

| Tool | Best For | Setup |
|---|---|---|
| GitHub MCP | PR creation & management | GitHub token + MCP config |

> "Create a PR from this branch with a summary of all changes and test results."

### Manage Jira

**Tools:** Jira MCP, Atlassian MCP

| Tool | Best For | Setup |
|---|---|---|
| Jira MCP | Issue/sprint management | `npx @anthropic-ai/mcp-jira` |

> "Show all in-progress tickets for the current sprint, flag any blocked items."

### Track Errors

**Tools:** Sentry MCP, Datadog MCP, PagerDuty MCP

| Tool | Best For | Setup |
|---|---|---|
| Sentry MCP | Error tracking | `npx @anthropic-ai/mcp-sentry` |
| Datadog MCP | APM + logs | `npx @anthropic-ai/mcp-datadog` |

> "Check Sentry for new unresolved errors in the last 24 hours, group by component."

### Call REST APIs

**Tools:** Fetch MCP, Fetcher MCP

| Tool | Best For | Setup |
|---|---|---|
| Fetch MCP | HTTP requests | `npx fetch-mcp` |
| Fetcher MCP | Content extraction | `npx fetcher-mcp` |

> "Call our internal API at /api/v2/users, paginate through all results, export to CSV."

### Run Tests

**Tools:** Shell MCP, project-specific test runners via Bash

| Tool | Best For | Setup |
|---|---|---|
| Shell MCP | Execute any test command | `npx @modelcontextprotocol/server-shell` |

> "Run the test suite, analyze failures, fix the broken tests, then re-run to confirm."

<sup>[Back to top](#quick-navigation)</sup>

---

## AI & Memory

### Give Claude Memory

**Tools:** Mem0 MCP, ApeRAG, Neo4j MCP, Memory Server (Anthropic)

| Tool | Best For | Setup |
|---|---|---|
| Memory Server | Simple key-value memory | `npx @modelcontextprotocol/server-memory` |
| Mem0 MCP | Auto memory extraction | `pip install mem0-mcp` |
| Neo4j MCP | Complex relationship graphs | Neo4j credentials |

> "Remember that our team uses TypeScript strict mode, 2-space indent, functional components."

### Search Documentation

**Tools:** Context7 MCP, Docs MCP, GitMCP

| Tool | Best For | Setup |
|---|---|---|
| Context7 MCP | Library docs search | API config |
| GitMCP | Reading repo docs | `gitmcp.io` URLs |

> "Search the React 19 docs for the new use() hook API and summarize usage patterns."

### Use Obsidian

**Tools:** Obsidian MCP

| Tool | Best For | Setup |
|---|---|---|
| Obsidian MCP | Read/write vault notes | Vault path config |

> "Search my vault for notes about the auth system, summarize the architecture decisions."

<sup>[Back to top](#quick-navigation)</sup>

---

## Cloud & DevOps

### Manage Docker

**Tools:** Docker MCP (Official), Shell MCP + Docker CLI, MCP Server Docker

| Tool | Best For | Setup |
|---|---|---|
| Docker MCP | Official Docker mgmt | `npx docker-mcp` |
| Shell MCP | Full CLI access | `npx @modelcontextprotocol/server-shell` |
| MCP Server Docker | Daemon-level access | `npx mcp-server-docker` |

> "List running containers, check api-server logs for errors, restart if timeout issues found."

### Manage Kubernetes

**Tools:** Kubernetes MCP, Shell MCP + kubectl

| Tool | Best For | Setup |
|---|---|---|
| Kubernetes MCP | Cluster management | K8s credentials config |
| Shell MCP | kubectl commands | `npx @modelcontextprotocol/server-shell` |

> "Show all pods in the production namespace, check for crash loops, get logs from failing pods."

### Deploy to AWS

**Tools:** AWS MCP, Shell MCP + AWS CLI

| Tool | Best For | Setup |
|---|---|---|
| AWS MCP | AWS resource management | `npx @anthropic-ai/mcp-aws` |
| Shell MCP | AWS CLI commands | AWS credentials config |

> "Check the status of our ECS services, identify any unhealthy tasks, and redeploy the api service."

### Monitor Servers

**Tools:** Grafana MCP, Datadog MCP, PagerDuty MCP

| Tool | Best For | Setup |
|---|---|---|
| Grafana MCP | Metrics & dashboards | `npx @anthropic-ai/mcp-grafana` |
| Datadog MCP | APM & logs | `npx @anthropic-ai/mcp-datadog` |
| PagerDuty MCP | Incident management | `npx @anthropic-ai/mcp-pagerduty` |

> "Check Grafana for API latency spikes in the last 6 hours, correlate with recent deployments."

<sup>[Back to top](#quick-navigation)</sup>

---

## Design & Media

### Use Figma

**Tools:** Figma MCP (Official), Figma Context MCP

| Tool | Best For | Setup |
|---|---|---|
| Figma MCP | Design file access | `npx @anthropic-ai/mcp-figma` |

> "Extract the login page design from Figma, generate the React component with Tailwind classes."

### Use YouTube

**Tools:** YouTube Transcript MCP, Fetch MCP

| Tool | Best For | Setup |
|---|---|---|
| YouTube Transcript MCP | Video transcripts | API config |

> "Get the transcript of this conference talk, summarize the key points in bullet format."

### Create 3D Models

**Tools:** Blender MCP, Shell MCP + Blender CLI

| Tool | Best For | Setup |
|---|---|---|
| Blender MCP | 3D model generation | Blender + MCP plugin |

> "Create a simple 3D model of a coffee mug with handle, export as .glb file."

<sup>[Back to top](#quick-navigation)</sup>
