# Compact Flows

## Flow 1: Context TRƯỚC compact

```
┌─────────────────────────────────────────────────────────────────────┐
│                        API REQUEST (Turn 7)                         │
│                        ~120K tokens total                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ SYSTEM (3 blocks)                              ~25K tokens    │  │
│  │                                                               │  │
│  │  [0] billing header                                 84 chars  │  │
│  │  [1] "You are a Claude agent..."                    62 chars  │  │
│  │  [2] Full instructions + CLAUDE.md              ~25K chars    │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ TOOLS                                          ~18K tokens    │  │
│  │                                                               │  │
│  │  Agent, Bash, Glob, Grep, Read, Edit, Write, Skill,          │  │
│  │  ToolSearch + MCP tools                                       │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ MESSAGES                                       ~77K tokens    │  │
│  │                                                               │  │
│  │  ┌─ [0] user ─────────────────────────────────────────────┐   │  │
│  │  │  <available-deferred-tools>                             │   │  │
│  │  │  AskUserQuestion, WebSearch, mcp__jira__...            │   │  │
│  │  └────────────────────────────────────────────────────────┘   │  │
│  │                                                               │  │
│  │  ┌─ [1] user (isMeta + prompt) ───────────────────────────┐   │  │
│  │  │  { type: "text"  → <system-reminder>                    │   │  │
│  │  │                     CLAUDE.md context                   │   │  │
│  │  │                     skill_listing                       │   │  │
│  │  │                     </system-reminder>           }      │   │  │
│  │  │  { type: "text"  → "Tạo feature login page" }          │   │  │
│  │  └────────────────────────────────────────────────────────┘   │  │
│  │                                                               │  │
│  │  ┌─ [2] assistant ────────────────────────────────────────┐   │  │
│  │  │  { type: "text"      → "Để tạo feature này, tôi cần   │   │  │
│  │  │                         đọc code hiện tại trước..." }   │   │  │
│  │  │  { type: "tool_use"  → Read                             │   │  │
│  │  │                        input: { file: "src/app.ts" } }  │   │  │
│  │  └────────────────────────────────────────────────────────┘   │  │
│  │                                                               │  │
│  │  ┌─ [3] user ─────────────────────────────────────────────┐   │  │
│  │  │  { type: "tool_result"                                  │   │  │
│  │  │    tool_use_id: "toolu_abc123"                          │   │  │
│  │  │    content: "import React from 'react';\n               │   │  │
│  │  │             export function App() {\n                   │   │  │
│  │  │               return <div>...</div>\n                   │   │  │
│  │  │             }"                               ~3K chars  │   │  │
│  │  │  }                                                      │   │  │
│  │  └────────────────────────────────────────────────────────┘   │  │
│  │                                                               │  │
│  │  ┌─ [4] assistant ────────────────────────────────────────┐   │  │
│  │  │  { type: "text"      → "Hiểu rồi. Tôi sẽ tạo login   │   │  │
│  │  │                         component và cần check routes." │   │  │
│  │  │  }                                                      │   │  │
│  │  │  { type: "tool_use"  → Grep                             │   │  │
│  │  │                        input: { pattern: "Route",       │   │  │
│  │  │                                 path: "src/" } }        │   │  │
│  │  └────────────────────────────────────────────────────────┘   │  │
│  │                                                               │  │
│  │  ┌─ [5] user ─────────────────────────────────────────────┐   │  │
│  │  │  { type: "tool_result"                                  │   │  │
│  │  │    tool_use_id: "toolu_def456"                          │   │  │
│  │  │    content: "src/routes.ts:5: <Route path='/login'      │   │  │
│  │  │             src/routes.ts:12: <Route path='/signup'     │   │  │
│  │  │             ..."                             ~2K chars  │   │  │
│  │  │  }                                                      │   │  │
│  │  └────────────────────────────────────────────────────────┘   │  │
│  │                                                               │  │
│  │  ┌─ [6] assistant ────────────────────────────────────────┐   │  │
│  │  │  { type: "text" → "Đã phân tích xong. Tôi sẽ tạo      │   │  │
│  │  │    LoginPage component với form validation..." }        │   │  │
│  │  │  { type: "tool_use"  → Write                            │   │  │
│  │  │                        input: { file: "src/Login.tsx",  │   │  │
│  │  │                                 content: "..." } }      │   │  │
│  │  └────────────────────────────────────────────────────────┘   │  │
│  │                                                               │  │
│  │  ┌─ [7] user ─────────────────────────────────────────────┐   │  │
│  │  │  { type: "tool_result"                                  │   │  │
│  │  │    content: "File written successfully" }               │   │  │
│  │  └────────────────────────────────────────────────────────┘   │  │
│  │                                                               │  │
│  │  ┌─ [8] assistant ────────────────────────────────────────┐   │  │
│  │  │  { type: "text" → "Đã tạo xong LoginPage. Bạn cần     │   │  │
│  │  │    thêm unit test không?" }                             │   │  │
│  │  └────────────────────────────────────────────────────────┘   │  │
│  │                                                               │  │
│  │  ┌─ [9] user ─────────────────────────────────────────────┐   │  │
│  │  │  { type: "text" → <system-reminder>                     │   │  │
│  │  │                     skill_listing (re-inject)           │   │  │
│  │  │                     </system-reminder> }                │   │  │
│  │  │  { type: "text" → "Thêm test và cả dark mode nữa" }    │   │  │
│  │  └────────────────────────────────────────────────────────┘   │  │
│  │                                                               │  │
│  │  ... (nhiều turns nữa cho đến ~120K tokens)                   │  │
│  │                                                               │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ⚠️  120K / 151K threshold = 79% → SẮP compact!                    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Flow 2: Compact LIFECYCLE

```
                    ┌──────────────────────────┐
                    │  Token count >= 151K     │
                    │  hoặc user gõ /compact   │
                    └────────────┬─────────────┘
                                 │
                                 ▼
               ┌─────────────────────────────────┐
               │  STEP 1: PreCompact Hook        │
               │                                  │
               │  Chạy shell command (nếu config) │
               │  stdout → thêm vào summary prompt│
               │  exit 0 → tiếp tục               │
               │  exit 2 → HỦY compact            │
               └────────────────┬────────────────┘
                                │ exit 0
                                ▼
               ┌─────────────────────────────────┐
               │  STEP 2: Build Summary Request   │
               │                                  │
               │  system: "You are a helpful AI   │
               │    assistant tasked with          │
               │    summarizing conversations."    │
               │                                  │
               │  messages: [                      │
               │    ...toàn_bộ_history_gốc...,    │
               │    {                              │
               │      role: "user",                │
               │      content: SUMMARY_PROMPT      │
               │    }                              │
               │  ]                                │
               │                                  │
               │  tools: [] (không cho dùng tools) │
               │  max_tokens: 200K / 1M              │
               └────────────────┬────────────────┘
                                │
                                ▼
               ┌─────────────────────────────────┐
               │  STEP 3: Send to Claude API      │
               │                                  │
               │  Claude AI đọc toàn bộ history   │
               │  → Viết summary theo 9 sections: │
               │                                  │
               │  1. Primary Request & Intent      │
               │  2. Key Technical Concepts        │
               │  3. Files & Code Sections         │
               │  4. Errors & Fixes                │
               │  5. Problem Solving               │
               │  6. ALL User Messages             │
               │  7. Pending Tasks                 │
               │  8. Current Work                  │
               │  9. Optional Next Step            │
               │                                  │
               │  Output: <summary>...</summary>   │
               └────────────────┬────────────────┘
                                │
                                ▼
               ┌─────────────────────────────────┐
               │  STEP 4: Replace Messages        │
               │                                  │
               │  XÓA: messages[0..N]             │
               │                                  │
               │  THAY BẰNG: messages = [          │
               │    {                              │
               │      role: "user",                │
               │      content:                     │
               │        "This session is being     │
               │         continued from a previous │
               │         conversation that ran out │
               │         of context.\n             │
               │         Summary:\n                │
               │         <nội dung summary>"       │
               │    }                              │
               │  ]                                │
               └────────────────┬────────────────┘
                                │
                                ▼
               ┌─────────────────────────────────┐
               │  STEP 5: Write Compact Boundary  │
               │                                  │
               │  Ghi vào JSONL:                   │
               │  {                                │
               │    type: "system",                │
               │    subtype: "compact_boundary",   │
               │    compactMetadata: {             │
               │      trigger: "auto"|"manual",    │
               │      preTokens: 151000,           │
               │      messagesSummarized: 20,      │
               │      preCompactDiscoveredTools:    │
               │        ["mcp__jira__search"]      │
               │    }                              │
               │  }                                │
               └────────────────┬────────────────┘
                                │
                                ▼
               ┌─────────────────────────────────┐
               │  STEP 6: Re-inject Metadata      │
               │                                  │
               │  Re-inject vào messages mới:      │
               │  ├── <available-deferred-tools>   │
               │  ├── <system-reminder>            │
               │  │     skill_listing              │
               │  │     CLAUDE.md context          │
               │  │   </system-reminder>           │
               │  └── discovered MCP tools         │
               └────────────────┬────────────────┘
                                │
                                ▼
               ┌─────────────────────────────────┐
               │  STEP 7: PostCompact Hook        │
               │                                  │
               │  Chạy shell command (nếu config) │
               │  Nhận summary text               │
               │  stdout → hiển thị cho user       │
               └────────────────┬────────────────┘
                                │
                                ▼
               ┌─────────────────────────────────┐
               │  STEP 8: SessionStart Hook       │
               │          (trigger="compact")     │
               │                                  │
               │  Inject thêm context nếu cần     │
               └────────────────┬────────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │  ✅ Compact DONE       │
                    │  Tiếp tục conversation │
                    └───────────────────────┘
```

---

## Flow 3: Context SAU compact

```
┌─────────────────────────────────────────────────────────────────────┐
│                    API REQUEST (Turn 1 sau compact)                  │
│                        ~35K tokens total                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ SYSTEM (3 blocks)                              ~25K tokens    │  │
│  │                                                               │  │
│  │  [0] billing header                                 84 chars  │  │
│  │  [1] "You are a Claude agent..."                    62 chars  │  │
│  │  [2] Full instructions + CLAUDE.md              ~25K chars    │  │
│  │                                                               │  │
│  │  → KHÔNG THAY ĐỔI — giữ nguyên 100%                          │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ TOOLS                                          ~18K tokens    │  │
│  │                                                               │  │
│  │  Agent, Bash, Glob, Grep, Read, Edit, Write, Skill,          │  │
│  │  ToolSearch + MCP tools                                       │  │
│  │                                                               │  │
│  │  → KHÔNG THAY ĐỔI — giữ nguyên 100%                          │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ MESSAGES                                        ~8K tokens    │  │
│  │                                                               │  │
│  │  ┌─ [0] user ─────────────────────────────────────────────┐   │  │
│  │  │  <available-deferred-tools>                             │   │  │
│  │  │  AskUserQuestion, WebSearch, mcp__jira__...            │   │  │
│  │  │                                                        │   │  │
│  │  │  → RE-INJECT                                           │   │  │
│  │  └────────────────────────────────────────────────────────┘   │  │
│  │                                                               │  │
│  │  ┌─ [1] user (isMeta) ────────────────────────────────────┐   │  │
│  │  │  <system-reminder>                                      │   │  │
│  │  │    CLAUDE.md context                                    │   │  │
│  │  │    skill_listing                                        │   │  │
│  │  │  </system-reminder>                                     │   │  │
│  │  │                                                        │   │  │
│  │  │  → RE-INJECT                                           │   │  │
│  │  └────────────────────────────────────────────────────────┘   │  │
│  │                                                               │  │
│  │  ┌─ [2] user (SUMMARY) ───────────────────────────────────┐   │  │
│  │  │  "This session is being continued from a previous       │   │  │
│  │  │   conversation that ran out of context.                 │   │  │
│  │  │                                                        │   │  │
│  │  │   Summary:                                              │   │  │
│  │  │   1. Primary Request: Tạo feature login page            │   │  │
│  │  │   2. Key Concepts: React, TypeScript, routing           │   │  │
│  │  │   3. Files: src/app.ts, src/Login.tsx (created),        │   │  │
│  │  │      src/routes.ts (referenced)                         │   │  │
│  │  │   4. Errors: none                                       │   │  │
│  │  │   5. Problem Solving: Read app.ts → Grep routes →       │   │  │
│  │  │      Write Login.tsx                                    │   │  │
│  │  │   6. User Messages: 'Tạo feature login page',          │   │  │
│  │  │      'Thêm test và cả dark mode nữa'                   │   │  │
│  │  │   7. Pending: unit test, dark mode                      │   │  │
│  │  │   8. Current: login page created, awaiting next step    │   │  │
│  │  │   9. Next: implement dark mode toggle                   │   │  │
│  │  │                                                        │   │  │
│  │  │   If you need details, read transcript at:              │   │  │
│  │  │   ~/.claude/projects/.../session.jsonl                  │   │  │
│  │  │                                                        │   │  │
│  │  │   Continue without asking further questions."           │   │  │
│  │  │                                               ~5K chars │   │  │
│  │  └────────────────────────────────────────────────────────┘   │  │
│  │                                                               │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ SO SÁNH TRƯỚC / SAU                                           │  │
│  │                                                               │  │
│  │              TRƯỚC              SAU                            │  │
│  │  system:     25K tokens    →    25K tokens  (giữ nguyên)      │  │
│  │  tools:      18K tokens    →    18K tokens  (giữ nguyên)      │  │
│  │  messages:   77K tokens    →     8K tokens  (giảm 90%)        │  │
│  │  ─────────────────────────────────────────                    │  │
│  │  TOTAL:     120K tokens    →    51K tokens                    │  │
│  │                                                               │  │
│  │  ❌ MẤT: tool_result contents (file nội dung, grep output)   │  │
│  │  ❌ MẤT: tool_use params (input chi tiết)                    │  │
│  │  ❌ MẤT: thinking blocks                                     │  │
│  │  ❌ MẤT: isMeta messages gốc                                 │  │
│  │  ❌ MẤT: exact code snippets (trừ khi AI include)            │  │
│  │                                                               │  │
│  │  ✅ CÒN: system prompt + CLAUDE.md                           │  │
│  │  ✅ CÒN: tool definitions                                    │  │
│  │  ✅ CÒN: skill listing (re-inject)                           │  │
│  │  ✅ CÒN: deferred tools list (re-inject)                     │  │
│  │  ✅ CÒN: summary of everything above                         │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```
