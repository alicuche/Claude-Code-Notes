# CONTEXT AI — AI Context Window

**NOTE:**
- Target audience: AI engineers, developers building or using AI agents
- Flow: Foundation → Optimization → Scale

---

## Agenda

# Agenda

```
FOUNDATION                      OPTIMIZATION                    SCALE
─────────────                   ─────────────                   ─────
① Tool Use                      ④ Context Optimization          ⑦ 10K Skills Problem
   The most basic primitive        Keep context clean               Solutions at Scale

② MCP & Skills                  ⑤ SubAgent vs Main Agent        ⑧ Top Best Practices
   Fan-out from Tool               Delegation pattern              Highest-impact techniques

③ Tokens & Cost                 ⑥ Skill Loading Mechanism
   Snowball effect                 Progressive disclosure
```

---

**NOTE:**
- 3 clear sections: Foundation (understand), Optimization (apply), Scale (system design)
- Each section builds on the previous — follow sequentially

---

## The Problem

# The Problem

### 67% of context window consumed before you type anything

```
┌──────────────────────────────────────────────────────────┐
│                                                            │
│   A real Claude Code session:                              │
│                                                            │
│   58 MCP tools across 5 servers = 134,000 tokens           │
│                                                            │
│   ████████████████████████████████████████████░░░░░░░░░░░  │
│   ◄──── 134K tool definitions ────►◄── 66K remaining ──►  │
│                                        for actual work     │
│                                                            │
│   Context Window = 200,000 tokens                          │
│                                                            │
│   → 67% context WASTED before conversation even starts     │
│   → Session runs a few turns → auto-compact → loses context│
│   → Cost spikes due to snowball effect                     │
│                                                            │
└──────────────────────────────────────────────────────────┘
```

### This document will explain WHY and HOW TO FIX it

---

**NOTE:**
- This is a documented real case — not hypothetical
- Goal: create an "aha moment" right away — audience needs to FEEL the problem before learning the solution
- After this section, the reader will want to know: what are tool definitions? why so expensive?
- Evidence: https://claudefa.st/blog/guide/mechanics/context-buffer-management

---

## ① Tool Use — The Foundation

# ① Tool Use — The Foundation

> *"Tool access is one of the highest-leverage primitives you can give an agent."* — Anthropic

### Why do we need Tools? LLMs only know what they were trained on

```
WITHOUT Tools:                         WITH Tools:
──────────────                          ──────────
┌──────────────────┐                    ┌──────────────────┐
│    LLM Brain     │                    │    LLM Brain     │
│                  │                    │                  │
│  Trained Data    │                    │  Trained Data    │
│  (up to 2025)   │                    │  + Tool Access   │
│                  │                    │    │             │
│  ❌ Doesn't know │                    │    ├─► APIs     │
│    today's BTC   │                    │    ├─► Database  │
│    price         │                    │    ├─► Files     │
│  ❌ Can't read   │                    │    ├─► Web       │
│    databases     │                    │    └─► Services  │
│  ❌ Can't call   │                    │                  │
│    APIs          │                    │  ✅ Real-time    │
│                  │                    │  ✅ Live data    │
│  "I don't have  │                    │  ✅ Can take     │
│   real-time      │                    │     action!      │
│   information"   │                    │                  │
└──────────────────┘                    └──────────────────┘

Tool = THE BRIDGE between LLM and THE OUTSIDE WORLD
```

### How it works (identical across ALL providers)

```
    Developer/Host                              LLM (Claude Server)
    ─────────────                               ────────────
         │  ① tool definitions (JSON schema)         │
         │──────────────────────────────────────────►│
         │  ② tool_use: { name, args }               │
         │◄──────────────────────────────────────────│
         │                                           │
         │  ③ Host EXECUTES (calls API, queries DB)  │
         │                                           │
         │  ④ tool_result: "Hanoi: 32°C"             │
         │──────────────────────────────────────────►│
         │  ⑤ "Weather in Hanoi is 32°C, sunny."     │
         │◄──────────────────────────────────────────│
```

### 3 Key Insights

| Insight | Impact |
|---------|--------|
| LLM **does not execute** — only outputs JSON | Host = executor, LLM = decision maker |
| Tool result **must be sent back** to LLM | → context grows with every tool call |
| Tool definition = JSON schema **eats tokens** | 1 tool = 300-1,500 tokens! |

---

**NOTE:**
- Tool Use = Function Calling — same concept, Anthropic vs OpenAI naming
- This is the root primitive — ALL subsequent patterns (MCP, Skills, Agents) build on this
- EMPHASIZE: without Tools, LLM is just a chatbot with stale knowledge. With Tools → LLM becomes an Agent
- Demo suggestion: show 1 tool definition JSON, emphasize size (~300 tokens for a simple tool)
- Evidence: https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview
- Evidence: https://developers.openai.com/api/docs/guides/function-calling/

---

## ② MCP & Skills — Fan-out from Tool

# ② MCP & Skills — Everything builds on Tool

### Tool is the only primitive LLM understands — MCP, Skill, Agent all use it

```
                        ┌─────────────┐
                        │     LLM     │
                        │  (Claude)   │
                        └──────┬──────┘
                               │
                        UNDERSTANDS ONLY
                         ONE THING:
                         Tool Use JSON
                               │
                    ┌──────────┼──────────┐
                    │          │          │
                    ▼          ▼          ▼
              ┌──────────┐ ┌──────┐ ┌──────────┐
              │   MCP    │ │Skill │ │  Agent   │
              │  Server  │ │      │ │(SubAgent)│
              └────┬─────┘ └──┬───┘ └────┬─────┘
                   │          │          │
                   ▼          ▼          ▼
              ┌──────────────────────────────────┐
              │         TOOL USE (JSON)           │
              │  { name: "...", args: {...} }     │
              │                                    │
              │  ← The root primitive LLM speaks   │
              └──────────────────────────────────┘
                   │          │          │
                   ▼          ▼          ▼
              External    Local FS    Other
              APIs/DB     Scripts     Agents

MCP   = standardized CONNECTION to external services (JSON-RPC 2.0)
Skill = lazy-loaded DOMAIN KNOWLEDGE (prompt expansion)
Agent = DELEGATION — separate context, separate task
```

### Common thread: LLM commands via Tool Use → Host executes

```
MCP tool call:    tool_use → { name: "mcp__jira__search", args: {query: "bug"} }
Skill invoke:     tool_use → { name: "Skill", args: {skill: "review-pr"} }
Agent spawn:      tool_use → { name: "Agent", args: {prompt: "find tests"} }

→ SAME PRIMITIVE, different packaging
→ Every tool definition EATS tokens in the context window!
```

---

**NOTE:**
- Common misconception: Tool → MCP → A2A → Skill is a linear chain. WRONG — it's a fan-out from Tool
- MCP inspired by LSP (Language Server Protocol for code editors)
- A2A (Google) = agent-to-agent, complementary to MCP, not a successor
- Skills: anyone who understands tool use + context window could invent a similar pattern
- GitHub Copilot uses the SAME SKILL.md format → portable between Claude Code & Copilot!
- MCP Architecture: Host → Client (1:1) → Server. Transport: JSON-RPC 2.0, Auth: OAuth 2.1
- Evidence: https://modelcontextprotocol.io/specification/2025-11-25
- Evidence: https://code.claude.com/docs/en/skills
- Evidence: https://taylordaughtry.com/posts/claude-skills-are-lazy-loaded-context/

---

## ③ Tokens — Snowball Effect

# ③ Tokens — Snowball Effect

### API is stateless — every turn resends the ENTIRE history

```
REQUEST 1 (Turn 1):
┌────────────────────────────────────────────────────────────┐
│ System  │ Tools  │ User₁                                   │
│  25K    │  8K    │  500                                     │
└────────────────────────────────────────────────────────────┘
Input tokens sent: 33,500
                                                    ▼ Claude responds (Asst₁: 1K)

REQUEST 2 (Turn 2):
┌────────────────────────────────────────────────────────────┐
│ System  │ Tools  │ User₁ │ Asst₁ │ User₂                  │
│  25K    │  8K    │  500  │ 1,000 │  500                    │
└────────────────────────────────────────────────────────────┘
Input tokens sent: 35,000   (+1,500 new content, but RESENDS 33.5K old!)
                                                    ▼ Claude responds (Asst₂: 2K)

REQUEST 3 (Turn 3):
┌────────────────────────────────────────────────────────────┐
│ System  │ Tools  │ User₁ │ Asst₁ │ User₂ │ Asst₂ │ User₃ │
│  25K    │  8K    │  500  │ 1,000 │  500  │ 2,000 │  500   │
└────────────────────────────────────────────────────────────┘
Input tokens sent: 37,500   (+2,500 new, but RESENDS 35K old!)

ACCUMULATED after 3 turns:
  New content created:    4,500 tokens (User×3 + Asst×2)
  Total tokens SENT:      33,500 + 35,000 + 37,500 = 106,000 tokens!
                           ═══════════════════════
                           23x the new content!
```

---

**NOTE:**
- THIS is why context window matters — not "AI forgets" but "cumulative cost"
- Tool results are especially dangerous: reading 1 file at 5K tokens = 5K resent EVERY subsequent turn
- Example: 10 file reads × 5K = 50K tokens permanent in history
- Token Count API is free: /v1/messages/count_tokens
- Evidence: https://docs.anthropic.com/en/docs/build-with-claude/token-counting

---

## ③ Cost — Quadratic Accumulation

# ③ Cost — Quadratic Accumulation

### Cost per turn increases because input grows larger each time

```
Assuming: System+Tools = 33K (fixed), each turn adds ~2K new tokens
Pricing: Opus 4.6 = $5/1M input, $25/1M output

Turn │ Input tokens │ Cost/turn (input) │ Cumulative cost
─────┼──────────────┼───────────────────┼───────────────
  1  │    33,500    │     $0.168        │    $0.168
  2  │    35,500    │     $0.178        │    $0.345
  3  │    37,500    │     $0.188        │    $0.533
  5  │    41,500    │     $0.208        │    $0.938
 10  │    51,500    │     $0.258        │    $2.13
 20  │    71,500    │     $0.358        │    $5.26
 30  │    91,500    │     $0.458        │    $9.39

     ┌──────────────────────────────────────────┐
     │  $                                        │
     │  9 ┤                                  ●   │
     │  8 ┤                               ╱      │
     │  7 ┤                            ╱         │
     │  6 ┤                         ╱            │
     │  5 ┤                      ●               │   ← TOTAL COST
     │  4 ┤                   ╱                  │     grows
     │  3 ┤                ╱                     │     QUADRATICALLY
     │  2 ┤          ●  ╱                        │
     │  1 ┤      ● ╱                             │
     │  0 ┤──●──────────────────────────────────│
     │    0    5    10   15   20   25   30 turns │
     └──────────────────────────────────────────┘

Formula: Total Cost ≈ N × fixed_cost + N×(N+1)/2 × delta_cost
→ Cost grows QUADRATICALLY, not linearly!
→ 30 turns = 56x the cost of the first turn (cumulative)
```

### Prompt Caching saves 90% on static content

```
WITHOUT cache: System+Tools 33K × $5/1M = $0.165/turn
WITH cache:    System+Tools 33K × $0.5/1M = $0.017/turn  ← 10x cheaper!

→ Only messages (snowball) pay full price
→ Cache write = 1.25x first time, cache read = 0.1x — breaks even by turn 2
```

---

**NOTE:**
- Cost grows QUADRATIC (squared) not linear — because each turn's input is larger than the previous
- Prompt Caching only helps the static portion (system+tools) — messages still snowball
- Batch API saves an additional 50% for async processing
- Evidence: https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching
- Evidence: https://docs.anthropic.com/en/docs/about-claude/pricing

---

## ④ Context Optimization

# ④ Context Optimization

### When context gets TOO LARGE — What happens?

```
┌────────────────────────────────────────────────────────────────┐
│                                                                  │
│  ❌ "Lost in the Middle"                                        │
│     LLM attends to beginning + end, SKIPS the middle            │
│     → File read at turn 5 gets "forgotten" despite being in ctx │
│                                                                  │
│  ❌ Hallucination increases                                      │
│     Too many tools/info → model picks WRONG tool, wrong args    │
│     5 tools → 95% accuracy  |  50+ tools → <60% accuracy       │
│                                                                  │
│  ❌ Unexpected auto-compact                                      │
│     Context hits limit → AI auto-summarizes → LOSES code in     │
│     progress, LOSES files read, LOSES decisions discussed        │
│                                                                  │
│  ❌ Latency increases                                            │
│     More tokens = slower processing = longer response times      │
│                                                                  │
│  ❌ Cost explodes (quadratic)                                    │
│     As shown: 30 turns = 56x cost of first turn                 │
│                                                                  │
│  ❌ Output quality degrades                                      │
│     Attention diluted → generic, less accurate answers           │
│                                                                  │
└────────────────────────────────────────────────────────────────┘
```

### 4 Rules to keep context clean

```
┌───────────────────────────────────────────────────────────┐
│                                                             │
│  Rule #1: INJECT ENOUGH, NOT EVERYTHING                     │
│  ──────────────────────────────────────────                  │
│  ❌ 58 MCP tools "just in case" → 55K wasted               │
│  ✅ 5 needed tools + defer the rest → 5K used              │
│                                                             │
│  Rule #2: USE CLI WHEN POSSIBLE                             │
│  ────────────────────────────                                │
│  ❌ MCP tool "list_files" = 500 tokens definition           │
│  ✅ Bash: ls -la = 0 tokens definition (built-in)          │
│  → CLI tools (Bash, Read, Grep) are built-in, NO extra     │
│    token cost for definitions. Only use MCP when CLI can't. │
│                                                             │
│  Rule #3: DELEGATE → SUBAGENT                               │
│  ──────────────────────────                                  │
│  ❌ File reads, greps in main → 70K context                 │
│  ✅ SubAgent does it, returns summary → 35K context         │
│                                                             │
│  Rule #4: COMPACT AT THE RIGHT TIME                         │
│  ─────────────────────────                                   │
│  ❌ Auto-compact mid-task → loses critical context           │
│  ✅ /compact after milestones → clean break                 │
│                                                             │
└───────────────────────────────────────────────────────────┘
```

### SubAgent — Separate Context, Clean Main

```
BEFORE delegation:                  AFTER delegation:
┌────────────────────┐              ┌────────────────────┐
│ Main (200K)        │              │ Main (200K)        │
│                    │              │                    │
│ Overhead     30K   │              │ Overhead     30K   │
│ File reads   18K   │              │ Summaries     5K   │
│ Grep          8K   │              │ TOTAL: 35K ✅     │
│ Tests         4K   │              └─────────┬──────────┘
│ Chat         10K   │                        │
│ TOTAL: 70K ❌     │              ┌─────────┼─────────┐
└────────────────────┘              ▼         ▼         ▼
                                 Explore   Research    Test
                                 (200K)    (200K)    (200K)

                                 TOTAL: 600K working context!
                                 84% reduction in main token usage
```

---

**NOTE:**
- Anthropic: "Every tool must justify its existence"
- Tool Search auto-activates when MCP tools > 10% context → ~85% overhead reduction
- CLI advantage: Bash, Read, Grep, Glob are built-in tools — always available, no extra definitions
- Each MCP tool = 300-1,500 tokens definition PERMANENT. CLI = 0 extra
- Example: instead of MCP tool "read_file" → use the built-in Read tool
- Each subagent = separate context window, NOT shared. Main only receives a short summary
- Evidence: https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
- Evidence: https://www.richsnapp.com/article/2025/10-05-context-management-with-subagents-in-claude-code

---

## CLAUDE.md Hierarchy

# CLAUDE.md — Parent → Child Inheritance

```
~/.claude/CLAUDE.md                    ← Global (all projects)
    │
my-monorepo/
├── CLAUDE.md                          ← Project root (git shared)
│   "Use TypeScript. Follow ESLint."
│
├── packages/frontend/
│   └── CLAUDE.md                      ← Subdirectory (LAZY load)
│       "Use React 19. Server components."
│
└── packages/backend/
    └── CLAUDE.md                      ← Subdirectory (LAZY load)
        "Use Hono. APIs must have OpenAPI."
```

### Key behaviors

| Behavior | Detail |
|----------|--------|
| **Precedence** | Child > Parent (specific overrides general) |
| **Subdirectory** | Lazy-loaded — only when Claude reads files in that directory |
| **Compaction** | **SURVIVES** — one of the few things NOT lost during compact |
| **Size** | Keep < 200 lines — every token is "permanent" |

⚠️ **Skills do NOT have inheritance** — only 2-tier (global + project)

---

**NOTE:**
- CLAUDE.local.md for personal settings (gitignored)
- claudeMdExcludes in settings to exclude patterns
- Skills have a feature request for parent traversal: GitHub issue #26489
- Skill Budget: 2% of context window for listing. Exceeded → skills are COMPLETELY hidden (omitted, not truncated)
- Override budget: SLASH_COMMAND_TOOL_CHAR_BUDGET env var
- Evidence: https://code.claude.com/docs/en/memory

---

## ⑤ SubAgent vs Main Agent

# SubAgent — Comparison & Gotchas

### Main Agent vs SubAgent

| | Main Agent | SubAgent |
|--|-----------|----------|
| **Context** | Shared session (entire conversation) | Fresh, isolated (separate) |
| **Spawn agents** | ✅ Yes (no hard limit) | ❌ Cannot |
| **Tools** | All built-in + MCP | Default: inherit all. Restrict via `tools`/`disallowedTools` |
| **MCP Servers** | All configured | Default: inherit all. Can scope separately via `mcpServers` |
| **Skills** | Lazy — loads description only, full body on invoke | Default: nothing. Must explicitly list via `skills` → injects full body immediately |
| **CLAUDE.md** | Full hierarchy (ancestor + lazy child) | Not received. Only custom system prompt from agent `.md` body |
| **Deferred loading** | ✅ ToolSearch for MCP tools | ❌ Not available |

### ⚠️ Gotcha #1: Eager Skill Loading

```
20 skills × 5K = 100K tokens consumed immediately on spawn!
→ Only 60K left for the task → ONLY ASSIGN NEEDED SKILLS
```

### ⚠️ Gotcha #2: Cannot Nest

```
Main → SubAgent ✅
Main → SubAgent → SubAgent ❌ (intentional constraint)
Workaround: chain subagents sequentially from main
```

```yaml
# .claude/agents/payroll-agent.md
---
name: payroll-agent
tools: Bash, Read, Edit
skills: payroll-calc, salary-report  # ONLY 2 skills!
---
```

---

**NOTE:**
- SubAgent = focused worker: narrow scope, clean context, less flexibility
- Task tool is not available for subagents — even if you try to assign it, it won't work
- No ToolSearch/deferred loading in subagents
- SubAgent loads skills from the `skills:` field in frontmatter
- If not specified → loads ALL skills (very expensive)
- Evidence: https://code.claude.com/docs/en/sub-agents
- Evidence: https://github.com/anthropics/claude-code/issues/19077

---

## ⑥ Skill Loading — Progressive Disclosure

# ⑥ Skill Loading — Progressive Disclosure

### Lifecycle of a Skill in Claude Code

```
PHASE 1: STARTUP — Only loads metadata
──────────────────────────────────────

  .claude/skills/review-pr.md          System Prompt
  ┌─────────────────────────┐          ┌──────────────────────────┐
  │ ---                     │          │ Available skills:        │
  │ name: review-pr         │ ──────►  │                          │
  │ description: Review PRs │          │ - review-pr: Review PRs  │
  │ ---                     │          │ - commit: Create commits │
  │                         │          │ - ...                    │
  │ [Full body: 5K tokens   │          │                          │
  │  NOT loaded yet!]       │          │ ~100 tokens/skill ✅     │
  └─────────────────────────┘          └──────────────────────────┘


PHASE 2: INVOKE — User types /review-pr
──────────────────────────────────────

  ① Claude calls the "Skill" tool
     tool_use: { name: "Skill", args: { skill: "review-pr" } }
                    │
                    ▼
  ② Host reads SKILL.md from local filesystem
     Read .claude/skills/review-pr.md → full body (5K tokens)
                    │
                    ▼
  ③ Full content INJECTED into context (messages)
     ┌──────────────────────────────────────────┐
     │ messages: [                               │
     │   ...previous messages...,                │
     │   { role: "user",                         │
     │     content: "<skill>                     │
     │       [Full 5K tokens skill body]         │
     │       Instructions, templates, refs...    │
     │     </skill>" }                           │
     │ ]                                         │
     └──────────────────────────────────────────┘
                    │
                    ▼
  ④ Sent to Claude Server — now Claude fully understands the skill
     → From here, skill body STAYS IN history (snowball!)


SUMMARY:
  100 skills × 100 tokens (metadata) = 10K tokens at startup
  Invoke 1 skill                     = +5K tokens when needed
  → 98% reduction for unused skills ✅
```

---

**NOTE:**
- ChatGPT GPTs load eagerly — all actions loaded when GPT activates
- Skill Budget: 2% of context window. Exceeded → skills are completely hidden
- Check with: /context
- Override: SLASH_COMMAND_TOOL_CHAR_BUDGET env var
- Skill body lives in messages (NOT system) → subject to snowball and lost during compact
- Evidence: https://github.blog/changelog/2025-12-18-github-copilot-now-supports-agent-skills/
- Evidence: https://mikhail.io/2025/10/claude-code-skills/

---

## ⑦ Scale — 10K Skills Problem

# ⑦ Scale — 10K Skills Problem

### The challenge

```
10,000 skills × 300 tokens = 3,000,000 tokens
Context Window             =   200,000 tokens

                    ❌ tokens + init cost too high
                    ❌ 15x over the limit
```

### Skill Finder + Tag/Scope Architecture

```
System Prompt (~2.2K tokens total)
│
├── General Skills (20)  ── always loaded ── ~2K tokens
│
└── Skill Finder ── meta-tool ── ~200 tokens
    │
    │  User: team = "Payroll"
    ▼
┌─────────────────────────────────────────┐
│  Tags:                                   │
│  ├── general      20 skills   → all     │
│  ├── payroll      50 skills   → Payroll │
│  ├── hr           80 skills   → HR      │
│  ├── engineering  200 skills  → Eng     │
│  └── ...          10K total             │
│                                          │
│  Payroll user loads:                     │
│  general(20) + payroll(50) = 70 skills  │
│  Cost: 70 × 100 = 7K tokens ✅         │
│                                          │
│  vs ALL: 10K × 300 = 3M tokens ❌       │
└─────────────────────────────────────────┘
```

> "Agentic AI is a routing problem, not an intelligence problem"

---

**NOTE:**
- Above ~20 tools, the model starts picking the wrong tool frequently (hallucination)
- Tool RAG paper: arxiv 2511.01854 — Tool-to-Agent Retrieval
- Code-as-Tool-Call: Viktor blog — agent browses function directory like a human developer
- Skill Finder is itself a skill — a meta-skill that finds other dynamic skills
- Pattern applies to everything: tools, skills, agents, knowledge
- Evidence: https://next.redhat.com/2025/11/26/tool-rag-the-next-breakthrough-in-scalable-ai-agents/
- Evidence: https://getviktor.com/blog/what-breaks-when-your-agent-has-100000-tools
- Evidence: https://voltagent.dev/blog/tool-routing/

---

## ⑧ Top Best Practices

# ⑧ Top 6 Highest-Impact Techniques

| # | Technique | Savings | Effort |
|---|-----------|---------|--------|
| 1 | **defer_loading: true** | 85-95% tool tokens | 1 line of config |
| 2 | **Use CLI instead of MCP when possible** | 0 token overhead | Use Bash/Read/Grep |
| 3 | **Delegate to SubAgent** | -84% main tokens | Create .claude/agents/ |
| 4 | **Prompt Caching** | -90% static cost | API config |
| 5 | **/compact at milestones** | -60-80% context | Type /compact |
| 6 | **CLAUDE.md < 200 lines** | Permanent savings | Edit file |

---

**NOTE:**
- defer_loading = biggest easy win — 1 line of config, massive impact
- CLI tools (Bash, Read, Grep, Glob, Edit, Write) = built-in, always present in tools definition
- SubAgent delegation = most powerful technique for long sessions
- Prompt caching needs a stable prefix — put static content at the beginning of the prompt
- Manual /compact is better than auto: you choose the timing, no context lost mid-task
- Evidence: https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents

---
