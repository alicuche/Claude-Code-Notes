# Compact Lifecycle

## Flow 1: Claude API Request Body — BEFORE Compact

```
┌──────────────────────────────────────────────────────────────────────────┐
│              Claude Messages API — Request Body (Turn 7)                 │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  "model": "claude-opus-4-..."                                            │
│  "max_tokens": 16384                                                     │
│  "stream": true                                                          │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ "system": [...]                                                    │  │
│  │                                                                    │  │
│  │  [0] { type: "text", text: "<billing header>" }                   │  │
│  │  [1] { type: "text", text: "You are a Claude agent..." }          │  │
│  │  [2] { type: "text", text: "<instructions + CLAUDE.md>" }         │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ "tools": [...]                                                     │  │
│  │                                                                    │  │
│  │  { name: "Agent",  description: "...", input_schema: {...} }      │  │
│  │  { name: "Bash",   description: "...", input_schema: {...} }      │  │
│  │  { name: "Read",   description: "...", input_schema: {...} }      │  │
│  │  { name: "Edit",   description: "...", input_schema: {...} }      │  │
│  │  { name: "Write",  description: "...", input_schema: {...} }      │  │
│  │  { name: "Glob",   description: "...", input_schema: {...} }      │  │
│  │  { name: "Grep",   description: "...", input_schema: {...} }      │  │
│  │  { name: "Skill",  description: "...", input_schema: {...} }      │  │
│  │  ... + ToolSearch, MCP tools                                      │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ "messages": [...]                                                  │  │
│  │                                                                    │  │
│  │  ┌─ [0] { role: "user" } ─────────────────────────────────────┐  │  │
│  │  │  content: [                                                 │  │  │
│  │  │    { type: "text", text: "<available-deferred-tools>        │  │  │
│  │  │      AskUserQuestion, WebSearch, mcp__jira__...             │  │  │
│  │  │      </available-deferred-tools>" }                         │  │  │
│  │  │  ]                                                          │  │  │
│  │  └────────────────────────────────────────────────────────────┘  │  │
│  │                                                                    │  │
│  │  ┌─ [1] { role: "user" } (isMeta + prompt) ───────────────────┐  │  │
│  │  │  content: [                                                 │  │  │
│  │  │    { type: "text", text: "<system-reminder>                 │  │  │
│  │  │        CLAUDE.md context                                    │  │  │
│  │  │        skill_listing                                        │  │  │
│  │  │        </system-reminder>" },                               │  │  │
│  │  │    { type: "text", text: "Create login page feature" }      │  │  │
│  │  │  ]                                                          │  │  │
│  │  └────────────────────────────────────────────────────────────┘  │  │
│  │                                                                    │  │
│  │  ┌─ [2] { role: "assistant" } ────────────────────────────────┐  │  │
│  │  │  content: [                                                 │  │  │
│  │  │    { type: "text", text: "To create this feature, I need    │  │  │
│  │  │        to read the current code first..." },                │  │  │
│  │  │    { type: "tool_use", id: "toolu_abc123",                  │  │  │
│  │  │        name: "Read",                                        │  │  │
│  │  │        input: { file_path: "src/app.ts" } }                 │  │  │
│  │  │  ]                                                          │  │  │
│  │  └────────────────────────────────────────────────────────────┘  │  │
│  │                                                                    │  │
│  │  ┌─ [3] { role: "user" } ─────────────────────────────────────┐  │  │
│  │  │  content: [                                                 │  │  │
│  │  │    { type: "tool_result",                                   │  │  │
│  │  │      tool_use_id: "toolu_abc123",                           │  │  │
│  │  │      content: "import React from 'react';\n                 │  │  │
│  │  │          export function App() {\n                          │  │  │
│  │  │            return <div>...</div>\n                          │  │  │
│  │  │          }"                                                  │  │  │
│  │  │    }                                                        │  │  │
│  │  │  ]                                                          │  │  │
│  │  └────────────────────────────────────────────────────────────┘  │  │
│  │                                                                    │  │
│  │  ┌─ [4] { role: "assistant" } ────────────────────────────────┐  │  │
│  │  │  content: [                                                 │  │  │
│  │  │    { type: "text", text: "Got it. I'll create the login     │  │  │
│  │  │        component and need to check routes." },              │  │  │
│  │  │    { type: "tool_use", id: "toolu_def456",                  │  │  │
│  │  │        name: "Grep",                                        │  │  │
│  │  │        input: { pattern: "Route", path: "src/" } }          │  │  │
│  │  │  ]                                                          │  │  │
│  │  └────────────────────────────────────────────────────────────┘  │  │
│  │                                                                    │  │
│  │  ┌─ [5] { role: "user" } ─────────────────────────────────────┐  │  │
│  │  │  content: [                                                 │  │  │
│  │  │    { type: "tool_result",                                   │  │  │
│  │  │      tool_use_id: "toolu_def456",                           │  │  │
│  │  │      content: "src/routes.ts:5: <Route path='/login'\n      │  │  │
│  │  │          src/routes.ts:12: <Route path='/signup'\n          │  │  │
│  │  │          ..."                                               │  │  │
│  │  │    }                                                        │  │  │
│  │  │  ]                                                          │  │  │
│  │  └────────────────────────────────────────────────────────────┘  │  │
│  │                                                                    │  │
│  │  ┌─ [6] { role: "assistant" } ────────────────────────────────┐  │  │
│  │  │  content: [                                                 │  │  │
│  │  │    { type: "text", text: "Analysis complete. I'll create    │  │  │
│  │  │        LoginPage with form validation..." },                │  │  │
│  │  │    { type: "tool_use", id: "toolu_ghi789",                  │  │  │
│  │  │        name: "Write",                                       │  │  │
│  │  │        input: { file_path: "src/Login.tsx",                 │  │  │
│  │  │                 content: "..." } }                           │  │  │
│  │  │  ]                                                          │  │  │
│  │  └────────────────────────────────────────────────────────────┘  │  │
│  │                                                                    │  │
│  │  ┌─ [7] { role: "user" } ─────────────────────────────────────┐  │  │
│  │  │  content: [                                                 │  │  │
│  │  │    { type: "tool_result",                                   │  │  │
│  │  │      tool_use_id: "toolu_ghi789",                           │  │  │
│  │  │      content: "File written successfully" }                 │  │  │
│  │  │  ]                                                          │  │  │
│  │  └────────────────────────────────────────────────────────────┘  │  │
│  │                                                                    │  │
│  │  ┌─ [8] { role: "assistant" } ────────────────────────────────┐  │  │
│  │  │  content: [                                                 │  │  │
│  │  │    { type: "text", text: "LoginPage created. Do you need    │  │  │
│  │  │        unit tests as well?" }                               │  │  │
│  │  │  ]                                                          │  │  │
│  │  └────────────────────────────────────────────────────────────┘  │  │
│  │                                                                    │  │
│  │  ┌─ [9] { role: "user" } ─────────────────────────────────────┐  │  │
│  │  │  content: [                                                 │  │  │
│  │  │    { type: "text", text: "<system-reminder>                 │  │  │
│  │  │        skill_listing (re-injected)                          │  │  │
│  │  │        </system-reminder>" },                               │  │  │
│  │  │    { type: "text", text: "Add tests and dark mode too" }    │  │  │
│  │  │  ]                                                          │  │  │
│  │  └────────────────────────────────────────────────────────────┘  │  │
│  │                                                                    │  │
│  │  ... (more turns)                                                  │  │
│  │                                                                    │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ Token usage breakdown (~120K total)                                │  │
│  │                                                                    │  │
│  │  "system":   ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ~25K  (21%) │  │
│  │  "tools":    ██████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ~18K  (15%) │  │
│  │  "messages": ████████████████████████████░░░░░░░░░░░░  ~77K  (64%) │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Flow 2: Compact LIFECYCLE

```
                    ┌──────────────────────────┐
                    │  Token count >= 151K     │
                    │  or user types /compact   │
                    └────────────┬─────────────┘
                                 │
                                 ▼
               ┌─────────────────────────────────────┐
               │  STEP 1: PreCompact Hook             │
               │                                      │
               │  Run shell command (if configured)   │
               │  stdout → appended to summary prompt │
               │  exit 0 → continue                   │
               │  exit 2 → CANCEL compact             │
               └──────────────────┬──────────────────┘
                                  │ exit 0
                                  ▼
               ┌─────────────────────────────────────┐
               │  STEP 2: Build Summary Request       │
               │                                      │
               │  system: "You are a helpful AI       │
               │    assistant tasked with              │
               │    summarizing conversations."        │
               │                                      │
               │  messages: [                          │
               │    ...entire_original_history...,     │
               │    {                                  │
               │      role: "user",                    │
               │      content: SUMMARY_PROMPT          │
               │    }                                  │
               │  ]                                    │
               │                                      │
               │  tools: [] (no tools allowed)         │
               │  max_tokens: 200K / 1M                │
               └──────────────────┬──────────────────┘
                                  │
                                  ▼
               ┌─────────────────────────────────────┐
               │  STEP 3: Send to Claude API          │
               │                                      │
               │  Claude AI reads entire history       │
               │  → Writes summary with 9 sections:   │
               │                                      │
               │  1. Primary Request & Intent          │
               │  2. Key Technical Concepts            │
               │  3. Files & Code Sections             │
               │  4. Errors & Fixes                    │
               │  5. Problem Solving                   │
               │  6. ALL User Messages                 │
               │  7. Pending Tasks                     │
               │  8. Current Work                      │
               │  9. Optional Next Step                │
               │                                      │
               │  Output: <summary>...</summary>       │
               └──────────────────┬──────────────────┘
                                  │
                                  ▼
               ┌─────────────────────────────────────┐
               │  STEP 4: Replace Messages             │
               │                                      │
               │  DELETE: messages[0..N]               │
               │                                      │
               │  REPLACE WITH: messages = [           │
               │    {                                  │
               │      role: "user",                    │
               │      content:                         │
               │        "This session is being         │
               │         continued from a previous     │
               │         conversation that ran out     │
               │         of context.\n                 │
               │         Summary:\n                    │
               │         <summary content>"            │
               │    }                                  │
               │  ]                                    │
               └──────────────────┬──────────────────┘
                                  │
                                  ▼
               ┌─────────────────────────────────────┐
               │  STEP 5: Write Compact Boundary       │
               │                                      │
               │  Write to JSONL:                      │
               │  {                                    │
               │    type: "system",                    │
               │    subtype: "compact_boundary",       │
               │    compactMetadata: {                 │
               │      trigger: "auto"|"manual",        │
               │      preTokens: 151000,               │
               │      messagesSummarized: 20,          │
               │      preCompactDiscoveredTools:        │
               │        ["mcp__jira__search"]          │
               │    }                                  │
               │  }                                    │
               └──────────────────┬──────────────────┘
                                  │
                                  ▼
               ┌─────────────────────────────────────┐
               │  STEP 6: Re-inject Metadata           │
               │                                      │
               │  Re-inject into new messages:         │
               │  ├── <available-deferred-tools>       │
               │  ├── <system-reminder>                │
               │  │     skill_listing                  │
               │  │     CLAUDE.md context              │
               │  │   </system-reminder>               │
               │  └── discovered MCP tools             │
               └──────────────────┬──────────────────┘
                                  │
                                  ▼
               ┌─────────────────────────────────────┐
               │  STEP 7: PostCompact Hook             │
               │                                      │
               │  Run shell command (if configured)   │
               │  Receives summary text                │
               │  stdout → displayed to user           │
               └──────────────────┬──────────────────┘
                                  │
                                  ▼
               ┌─────────────────────────────────────┐
               │  STEP 8: SessionStart Hook            │
               │          (trigger="compact")         │
               │                                      │
               │  Inject additional context if needed  │
               └──────────────────┬──────────────────┘
                                  │
                                  ▼
                    ┌───────────────────────┐
                    │  ✅ Compact DONE       │
                    │  Continue conversation │
                    └───────────────────────┘
```

---

## Flow 3: Claude API Request Body — AFTER Compact

```
┌──────────────────────────────────────────────────────────────────────────┐
│           Claude Messages API — Request Body (Turn 1 after compact)      │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  "model": "claude-opus-4-..."                                            │
│  "max_tokens": 16384                                                     │
│  "stream": true                                                          │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ "system": [...]                                                    │  │
│  │                                                                    │  │
│  │  [0] { type: "text", text: "<billing header>" }                   │  │
│  │  [1] { type: "text", text: "You are a Claude agent..." }          │  │
│  │  [2] { type: "text", text: "<instructions + CLAUDE.md>" }         │  │
│  │                                                                    │  │
│  │  → UNCHANGED — kept 100%                                          │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ "tools": [...]                                                     │  │
│  │                                                                    │  │
│  │  { name: "Agent",  description: "...", input_schema: {...} }      │  │
│  │  { name: "Bash",   description: "...", input_schema: {...} }      │  │
│  │  ... + ToolSearch, MCP tools                                      │  │
│  │                                                                    │  │
│  │  → UNCHANGED — kept 100%                                          │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ "messages": [...]                                                  │  │
│  │                                                                    │  │
│  │  ┌─ [0] { role: "user" } ─────────────────────────────────────┐  │  │
│  │  │  content: [                                                 │  │  │
│  │  │    { type: "text", text: "<available-deferred-tools>        │  │  │
│  │  │      AskUserQuestion, WebSearch, mcp__jira__...             │  │  │
│  │  │      </available-deferred-tools>" }                         │  │  │
│  │  │  ]                                                          │  │  │
│  │  │  → RE-INJECTED                                              │  │  │
│  │  └────────────────────────────────────────────────────────────┘  │  │
│  │                                                                    │  │
│  │  ┌─ [1] { role: "user" } (isMeta) ────────────────────────────┐  │  │
│  │  │  content: [                                                 │  │  │
│  │  │    { type: "text", text: "<system-reminder>                 │  │  │
│  │  │        CLAUDE.md context                                    │  │  │
│  │  │        skill_listing                                        │  │  │
│  │  │        </system-reminder>" }                                │  │  │
│  │  │  ]                                                          │  │  │
│  │  │  → RE-INJECTED                                              │  │  │
│  │  └────────────────────────────────────────────────────────────┘  │  │
│  │                                                                    │  │
│  │  ┌─ [2] { role: "user" } (SUMMARY) ───────────────────────────┐  │  │
│  │  │  content: [                                                 │  │  │
│  │  │    { type: "text", text:                                    │  │  │
│  │  │      "This session is being continued from a previous       │  │  │
│  │  │       conversation that ran out of context.                 │  │  │
│  │  │                                                             │  │  │
│  │  │       Summary:                                              │  │  │
│  │  │       1. Primary Request: Create login page feature         │  │  │
│  │  │       2. Key Concepts: React, TypeScript, routing           │  │  │
│  │  │       3. Files: src/app.ts, src/Login.tsx (created),        │  │  │
│  │  │          src/routes.ts (referenced)                         │  │  │
│  │  │       4. Errors: none                                       │  │  │
│  │  │       5. Problem Solving: Read app.ts → Grep routes →       │  │  │
│  │  │          Write Login.tsx                                    │  │  │
│  │  │       6. User Messages: 'Create login page feature',        │  │  │
│  │  │          'Add tests and dark mode too'                      │  │  │
│  │  │       7. Pending: unit test, dark mode                      │  │  │
│  │  │       8. Current: login page created, awaiting next step    │  │  │
│  │  │       9. Next: implement dark mode toggle                   │  │  │
│  │  │                                                             │  │  │
│  │  │       If you need details, read transcript at:              │  │  │
│  │  │       ~/.claude/projects/.../session.jsonl                  │  │  │
│  │  │                                                             │  │  │
│  │  │       Continue without asking further questions."           │  │  │
│  │  │    }                                                        │  │  │
│  │  │  ]                                                          │  │  │
│  │  └────────────────────────────────────────────────────────────┘  │  │
│  │                                                                    │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ Token usage breakdown (~51K total)                                 │  │
│  │                                                                    │  │
│  │  "system":   ████████████████░░░░░░░░░░░░░░░░░░░░░░  ~25K  (49%) │  │
│  │  "tools":    ████████████░░░░░░░░░░░░░░░░░░░░░░░░░░  ~18K  (35%) │  │
│  │  "messages": █████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   ~8K  (16%) │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ BEFORE vs AFTER compact                                            │  │
│  │                                                                    │  │
│  │  BEFORE  "system":   ████████░░░░░░░░░░░░░░░░░░░░░░░░  ~25K      │  │
│  │  AFTER   "system":   ████████░░░░░░░░░░░░░░░░░░░░░░░░  ~25K      │  │
│  │                                                                    │  │
│  │  BEFORE  "tools":    ██████░░░░░░░░░░░░░░░░░░░░░░░░░░  ~18K      │  │
│  │  AFTER   "tools":    ██████░░░░░░░░░░░░░░░░░░░░░░░░░░  ~18K      │  │
│  │                                                                    │  │
│  │  BEFORE  "messages": ██████████████████████████░░░░░░░  ~77K      │  │
│  │  AFTER   "messages": ███░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   ~8K      │  │
│  │                                                 reduced 90% ↑     │  │
│  │                                                                    │  │
│  │  BEFORE  TOTAL:      ████████████████████████████████░  ~120K     │  │
│  │  AFTER   TOTAL:      █████████████░░░░░░░░░░░░░░░░░░░   ~51K     │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ What compact loses vs keeps                                        │  │
│  │                                                                    │  │
│  │  ❌ LOST: tool_result contents (file contents, grep output)       │  │
│  │  ❌ LOST: tool_use params (detailed inputs)                       │  │
│  │  ❌ LOST: thinking blocks                                         │  │
│  │  ❌ LOST: original isMeta messages                                │  │
│  │  ❌ LOST: exact code snippets (unless AI included them)           │  │
│  │                                                                    │  │
│  │  ✅ KEPT: "system" — full system prompt + CLAUDE.md               │  │
│  │  ✅ KEPT: "tools" — all tool definitions                          │  │
│  │  ✅ KEPT: skill listing (re-injected into "messages")             │  │
│  │  ✅ KEPT: deferred tools list (re-injected into "messages")       │  │
│  │  ✅ KEPT: summary of entire conversation history                  │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```
