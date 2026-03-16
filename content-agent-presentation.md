# CONTEXT AI - Everything That Affects Your AI Context Window

> Tài liệu presentation về Context AI — từ cơ bản đến nâng cao
> Mỗi ý đều có evidence từ tài liệu chính thức hoặc research papers

---

## MỤC LỤC

1. [Tool Use — Primitive cơ bản nhất](#1-tool-use--primitive-cơ-bản-nhất)
2. [Tokens & Cost — Hiểu cái giá phải trả](#2-tokens--cost--hiểu-cái-giá-phải-trả)
3. [MCP & Skills — 2 hướng mở rộng từ Tool](#3-mcp--skills--2-hướng-mở-rộng-từ-tool)
4. [Context Optimization — Giữ context sạch](#4-context-optimization--giữ-context-sạch)
5. [Skill & SubAgent Loading Mechanism](#5-skill--subagent-loading-mechanism)
6. [Scale Problem — 10K Skills/Tools/Knowledge](#6-scale-problem--10k-skillstoolsknowledge)
7. [Kiến thức nâng cao bổ sung](#7-kiến-thức-nâng-cao-bổ-sung)
8. [Best Practices — Tổng hợp tối ưu Context Window](#8-best-practices--tổng-hợp-tối-ưu-context-window)
9. [Claude API Request Body — Bên trong 1 API call](#9-claude-api-request-body--bên-trong-1-api-call)
10. [Compact Action — Chuyện gì xảy ra khi context đầy?](#10-compact-action--chuyện-gì-xảy-ra-khi-context-đầy-8)

---

## 1. Tool Use — Primitive cơ bản nhất

### 1.1 Tool là cơ bản nhất của AI để tương tác với bên ngoài (1)

**Verdict: ĐÚNG**

Tool Use (Function Calling) là **primitive cơ bản nhất** để LLM tương tác với thế giới bên ngoài. Không có tool, LLM chỉ biết những gì nó học lúc training — không thể truy cập dữ liệu real-time, gọi API, hay thực hiện action.

**Cách hoạt động (giống nhau ở MỌI provider — Claude, GPT, Gemini):**

```
┌──────────┐                                          ┌───────────┐
│          │  1. Gửi tool definitions (JSON schema)    │           │
│Developer/│ ─────────────────────────────────────►    │   LLM     │
│Host App  │  2. Model trả tool_use (tên tool + args)  │  (Claude) │
│          │ ◄─────────────────────────────────────    │           │
│          │                                           │           │
│          │  3. Host thực thi function thật            │           │
│          │     (gọi API, query DB, đọc file...)      │           │
│          │                                           │           │
│          │  4. Gửi tool_result về cho Model           │           │
│          │ ─────────────────────────────────────►    │           │
│          │  5. Model tổng hợp → trả response         │           │
│          │ ◄─────────────────────────────────────    │           │
└──────────┘                                           └───────────┘

Chiều mũi tên:
  ──►  = Host/Developer GỬI ĐẾN LLM (input)
  ◄──  = LLM TRẢ VỀ Host/Developer (output)
```

> **Lưu ý bước 4:** tool_result PHẢI gửi lại cho LLM vì LLM không tự thực thi được.
> LLM chỉ output JSON nói "tôi muốn gọi tool X với args Y", còn Host mới là người
> thực thi thật. Kết quả phải gửi lại để LLM biết và tổng hợp response cuối cùng.
> Đây cũng là lý do context tăng — mỗi tool_result trở thành phần của conversation history.

**Ví dụ cụ thể:**
```json
// Developer định nghĩa tool
{
  "name": "get_weather",
  "description": "Lấy thời tiết hiện tại của 1 thành phố",
  "input_schema": {
    "type": "object",
    "properties": {
      "city": { "type": "string", "description": "Tên thành phố" }
    }
  }
}

// Model output (quyết định gọi tool)
{ "type": "tool_use", "name": "get_weather", "input": { "city": "Hanoi" } }

// Host thực thi → trả kết quả
{ "type": "tool_result", "content": "Hanoi: 32°C, sunny" }

// Model tổng hợp: "Thời tiết Hà Nội hiện tại là 32°C, trời nắng."
```

Anthropic docs nói rõ: _"Tool access is one of the highest-leverage primitives you can give an agent."_

**Evidence:**
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview
- https://developers.openai.com/api/docs/guides/function-calling/
- https://arxiv.org/pdf/2409.18807 (LLM With Tools: A Survey)

---

### 1.2 MCP và Skills — Đều là patterns trên nền Tool Interface

**Verdict gốc ("Tool → MCP → A2A → Skill tuyến tính"): SAI MỘT PHẦN**

Mối quan hệ **KHÔNG phải tuyến tính** mà là **fan-out từ gốc Tool Use**:

```
                    ┌─────────────────┐
                    │    TOOL USE     │  ← Primitive gốc (2023+)
                    │ Function Calling│
                    └────────┬────────┘
                             │
                    ┌────────┴────────┐
                    │                 │
                    ▼                 ▼
              ┌──────────┐     ┌──────────┐
              │   MCP    │     │  Skills  │
              │ (11/2024)│     │  (2025)  │
              └──────────┘     └──────────┘
              Agent ↔ Tool      Portable
              (standardize)     Expertise
```

| Layer              | Technology              | Mục đích                                                  |
| ------------------ | ----------------------- | --------------------------------------------------------- |
| **Foundation**     | Tool Use                | Primitive: model gọi function, nhận result                |
| **Standardization**| MCP                     | Protocol chuẩn hóa kết nối tools, resources, prompts     |
| **Expertise**      | Skills                  | Kiến thức chuyên môn tái sử dụng, hướng dẫn cách dùng tools |

**Nhận định: "MCP, Skills chỉ là pattern quy định cách sử dụng tool, bản chất đều phải qua tool interface để giao tiếp với LLM"**

**ĐÚNG VỀ CƠ BẢN, nhưng cần nuance:**

| | Qua Tool Interface? | Giải thích |
|--|---------------------|-----------|
| **MCP Tools** | Trực tiếp | MCP Tools chính là tool definitions gửi cho LLM. LLM gọi `tool_use` → Host forward qua MCP protocol → Server thực thi → trả result. **100% đi qua tool interface.** |
| **MCP Resources** | Gián tiếp | Resources là data mà **Application** tự quyết định inject vào context, KHÔNG phải model gọi. Nhưng data vẫn phải vào context window → vẫn "qua" LLM interface. |
| **MCP Prompts** | Gián tiếp | Prompts là templates mà **User** invoke (slash commands). Kết quả inject vào context dưới dạng text, không qua tool_use. |
| **Skills** | Có, qua Skill tool | Skill được invoke qua 1 meta-tool (`Skill`). Kết quả là inject prompt text vào context. Sau đó Claude dùng existing tools (Read, Edit, Bash...) để thực hiện. |

→ **Kết luận chính xác:** Mọi thứ muốn "vào" LLM đều phải đi qua context window (system prompt, tools, messages). Tool interface là cách chính nhưng KHÔNG phải cách duy nhất — data cũng có thể inject trực tiếp vào system prompt hoặc user message.

**Evidence:**
- https://modelcontextprotocol.io/specification/2025-11-25
- https://code.claude.com/docs/en/skills
- https://devcenter.upsun.com/posts/mcp-interaction-types-article/

---

### 1.3 "Hiểu biết đâu phát minh ra khái niệm mới giống Skill"

**Verdict: ĐÚNG VỀ TINH THẦN**

Skill chỉ là 1 design pattern: **lazy-loaded prompt expansion thông qua tool interface**. Bất kỳ ai hiểu:
- Tool use hoạt động thế nào
- Context window bị tiêu thụ ra sao
- Progressive disclosure pattern

...đều có thể phát minh ra pattern tương tự. (2)

**Bản chất Skill:**
```
SKILL.md file = YAML frontmatter (name + description) + Instructions body + scripts/

Khi invoke:
1. Skill tool đọc SKILL.md
2. Inject instructions vào context
3. Claude follow instructions dùng existing tools (Read, Edit, Bash...)
```

Anthropic nói: _"MCP connects Claude to data; Skills teach Claude what to do with that data."_

**Evidence:**
- https://taylordaughtry.com/posts/claude-skills-are-lazy-loaded-context/
- https://mikhail.io/2025/10/claude-code-skills/

---

## 2. Tokens & Cost — Hiểu cái giá phải trả

### 2.1 "Context tăng dựa trên input và output"

**Verdict: ĐÚNG**

Claude API là **stateless** — mỗi lần gọi API phải gửi **TOÀN BỘ conversation history** (3). Đây gọi là **"Snowball Effect"**:

```
Turn 1: [System + Tools + User₁]                    → 1,000 input tokens
Turn 2: [System + Tools + User₁ + Asst₁ + User₂]   → 2,200 input tokens
Turn 3: [System + Tools + ... + User₃]              → 3,600 input tokens
Turn 4: [System + Tools + ... + User₄]              → 5,000 input tokens
Turn 5: [System + Tools + ... + User₅]              → 6,400 input tokens
                                            TỔNG TÍCH LŨY: 18,200 tokens
```

> Turn 5 mới tạo ~6K tokens nội dung mới nhưng đã gửi **18.2K tokens tích lũy**.

**Cái gì ăn tokens TRƯỚC KHI mày gõ chữ nào:**

| Component                | Tokens ước tính     |
| ------------------------ | ------------------- |
| System prompt            | ~2,600              |
| Built-in tool definitions (18 tools) | ~17,600 |
| MCP tool schemas         | 300–1,500 / tool    |
| CLAUDE.md files          | Tùy dung lượng      |
| Skill names (frontmatter)| ~100 / skill        |
| **TỔNG trước khi gõ gì**| **30K–40K tokens**  |

**Ví dụ thực tế đáng sợ:**
- 58 tools qua 5 MCP servers = **~55,000 tokens** chỉ riêng tool definitions
- 1 Jira MCP server = **~17,000 tokens**
- Trường hợp xấu nhất ghi nhận: **134,000 tokens** tool definitions (67% context window!)

**Evidence:**
- https://docs.anthropic.com/en/docs/build-with-claude/token-counting
- https://docs.anthropic.com/en/api/messages-count-tokens (Token Count API miễn phí)
- https://claudefa.st/blog/guide/mechanics/context-buffer-management

---

### 2.2 Tokens của MCP Tools, Skills, SubAgents

**MCP Tools — ăn tokens mỗi turn:**
- Mỗi tool schema (JSON) được inject vào system prompt **MỖI lần gọi API**
- Tất cả tool definitions gửi đi bất kể có dùng hay không trong turn đó

**Skills — progressive disclosure:**
```
Startup:  Chỉ load YAML frontmatter → ~100 tokens/skill
Invoke:   Load full SKILL.md body   → ~5,000 tokens
Execute:  Load thêm scripts/refs    → thêm tokens tùy file

→ ~98% token reduction cho skills có mặt nhưng chưa activate
→ 10 skills installed = ~1,000 tokens at startup (thay vì 50,000+)
```

**SubAgents — context RIÊNG BIỆT:**
```
Main Agent   ──── 200K context window
SubAgent A   ──── 200K context window (riêng)
SubAgent B   ──── 200K context window (riêng)
SubAgent C   ──── 200K context window (riêng)

→ 3 subagents song song = 600K tokens working context tổng
→ Main chỉ nhận summary ngắn gọn
→ Giảm token consumption tới 84% trong testing
```

**Evidence:**
- https://www.richsnapp.com/article/2025/10-05-context-management-with-subagents-in-claude-code
- https://www.codewithseb.com/blog/claude-code-skills-reusable-ai-workflows-guide

---

### 2.3 "Cost tăng dần sau mỗi lượt call tool"

**Verdict: ĐÚNG, nhưng cần chính xác hơn**

Cost tăng vì **2 yếu tố kết hợp**:
1. **Snowball effect**: mỗi turn gửi lại TOÀN BỘ history
2. **Tool results trở thành history** (4 - ý quan trọng): 1 file read 5,000 tokens → bị gửi lại mỗi turn sau

**Pricing hiện tại (2026):**

| Model            | Input (per 1M tokens) | Output (per 1M tokens) |
| ---------------- | --------------------- | ---------------------- |
| Claude Opus 4.6  | $5.00                 | $25.00                 |
| Claude Haiku 4.5 | $1.00                 | $5.00                  |
| Opus 4.6 (>200K) | $10.00                | $37.50                 |

**Giảm cost bằng Prompt Caching:**

```
Không cache:  Mỗi turn trả full price cho system prompt + tool definitions
Có cache:     Cache write = 1.25x (lần đầu) → Cache hit = 0.1x (90% savings!)

Ví dụ: System + Tools = 40K tokens
- Không cache: 40K × $5/1M = $0.20 MỖI turn
- Có cache:    40K × $0.50/1M = $0.02 MỖI turn (tiết kiệm 90%)
```

**Extended Thinking:** Thinking blocks từ turns trước được **tự động bỏ qua**, KHÔNG tính vào input tokens turn sau.

**Evidence:**
- https://docs.anthropic.com/en/docs/about-claude/pricing
- https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching
- https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking

---

## 3. MCP & Skills — 2 hướng mở rộng từ Tool

### 3.1 MCP (Model Context Protocol) — Anthropic, 11/2024

Chuẩn hóa cách AI kết nối với tools/data. Lấy cảm hứng từ LSP (Language Server Protocol).

**3 interaction types — ai điều khiển gì:**

| Primitive      | Ai điều khiển    | Mục đích                          | Ví dụ                     |
| -------------- | ---------------- | --------------------------------- | ------------------------- |
| **Tools**      | Model            | Functions AI gọi tự chủ          | `search_jira`, `run_query`|
| **Resources**  | Application      | Raw data app consume              | File contents, DB records |
| **Prompts**    | User             | Templates user invoke trực tiếp   | Slash commands, menus     |

**Architecture:**
```
┌────────────┐     ┌────────────┐     ┌────────────┐
│   Host     │     │   Client   │     │   Server   │
│ (Claude    │────►│ (Connector │────►│ (Expose    │
│  Desktop)  │     │  1:1 với   │     │  tools,    │
│            │     │  server)   │     │  resources) │
└────────────┘     └────────────┘     └────────────┘
                   Transport: JSON-RPC 2.0
                   (stdio local / Streamable HTTP remote)
                   Auth: OAuth 2.1 (spec 2025-11-25)
```

**Evidence:**
- https://modelcontextprotocol.io/specification/2025-11-25
- https://modelcontextprotocol.io/docs/learn/architecture
- https://devcenter.upsun.com/posts/mcp-interaction-types-article/

---

### 3.2 Skills — Portable Expertise

Skills = **lazy-loaded prompt expansion**. Không phải tool, không phải agent — là **kiến thức inject on-demand**.

**So sánh Skills vs Tools vs SubAgents:** (5)

| Aspect        | Raw Tool                   | Skill                         | SubAgent                      |
| ------------- | -------------------------- | ----------------------------- | ----------------------------- |
| **Bản chất**  | External function (I/O)    | Injected instructions (prompt)| Separate process (context)    |
| **Execution** | Host thực thi, trả result  | Claude follow instructions    | Agent riêng, trả summary      |
| **Context**   | Result vào current context | Instructions vào current ctx  | Context riêng biệt            |
| **Persistence**| Defined per-session        | Files trong `.claude/skills/` | Files trong `.claude/agents/` |
| **State**     | Stateless                  | Có thể carry scripts/templates| Stateless per invocation      |

**Skill Budget — Giới hạn tokens cho skill listing:**

Claude Code dành **2% context window** cho skill listing (fallback: 16,000 characters). Khi tổng metadata vượt budget:
- **Toàn bộ skill bị ẩn** (omit hoàn toàn), KHÔNG phải cắt ngắn description
- Skills bị ẩn **hoàn toàn invisible** với agent — không thể discover hay invoke
- Claude Code hiển thị: `<!-- Showing 36 of 92 skills due to token limits -->`
- Kiểm tra bằng lệnh `/context`

```
Ví dụ: 200K context window
├── 2% = ~4,000 tokens cho skill listing
├── Mỗi skill ≈ description_length + ~110 chars overhead (XML tags, name, location)
├── Nếu có 92 skills → chỉ hiện ~36 skills, 56 skills bị ẩn hoàn toàn
└── Override bằng env var: SLASH_COMMAND_TOOL_CHAR_BUDGET=32000
```

> **Hệ quả:** Nếu team có nhiều skills, cần giữ description ngắn gọn hoặc tăng budget.
> Với 1M context window (Enterprise), budget tăng lên ~20K tokens → chứa được nhiều skills hơn.

**Evidence:**
- https://code.claude.com/docs/en/skills (section "Troubleshooting > Claude doesn't see all my skills")
- https://github.com/anthropics/claude-code/issues/13044
- https://github.com/anthropics/claude-code/issues/12782
- CHANGELOG v2.1.32: "Skill character budget now scales with context window (2% of context)"

**Evidence:**
- https://code.claude.com/docs/en/skills
- https://support.claude.com/en/articles/12512176-what-are-skills

---

## 4. Context Optimization — Giữ context sạch

### 4.1 "Cái nào default load → hạn chế dùng"

**Verdict: ĐÚNG**

**Nguyên tắc core:** Inject đủ tools, không inject tất cả.

Anthropic Engineering khuyến nghị:
- Mỗi tool phải **justify its existence** — self-contained, non-overlapping
- Tool-calling hallucinations **tăng tỷ lệ thuận** với số lượng tools
- Claude Code tự bật **Tool Search** khi MCP tools chiếm >10% context → giảm ~85% overhead
- Ngưỡng 10% **có thể tùy chỉnh** qua `ENABLE_TOOL_SEARCH`:

```
ENABLE_TOOL_SEARCH=true      # Luôn bật Tool Search
ENABLE_TOOL_SEARCH=false     # Tắt hoàn toàn
ENABLE_TOOL_SEARCH=auto      # Auto khi MCP tools > 10% context (default)
ENABLE_TOOL_SEARCH=auto:5    # Auto khi MCP tools > 5% context (nghiêm ngặt hơn)
```

- Khi Tool Search bật, Claude **KHÔNG thấy** tool definitions gốc — chỉ thấy 1 tool duy nhất là `ToolSearch`. Muốn dùng tool nào phải search trước.
- Ref: https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool

**Checklist:**
```
✅ Chỉ enable MCP servers thực sự cần cho project hiện tại
✅ Dùng defer_loading: true cho MCP tools không dùng thường xuyên
   (LÝ DO: khi defer_loading=true, tool definition KHÔNG được load vào context
    window của Claude ngay từ đầu → tiết kiệm tokens. Chỉ tên tool xuất hiện
    trong <available-deferred-tools>. Full schema chỉ load khi Claude cần qua ToolSearch)
✅ Có thể defer cả server nhưng giữ lại 1 vài tools hay dùng:
   {
     "mcpServers": {
       "jira": {
         "default_config": { "defer_loading": true },
         "tools": {
           "search_issues": { "defer_loading": false }
         }
       }
     }
   }
✅ CLAUDE.md ngắn gọn, <200 dòng, dùng headers + bullets
✅ Skills chỉ load name+description → full body khi invoke
❌ Đừng enable tất cả MCP servers "phòng khi cần"
❌ Đừng viết CLAUDE.md dài hàng ngàn dòng
❌ Đừng install skills không liên quan đến project
```

**Evidence:**
- https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
- https://01.me/en/2025/12/context-engineering-from-claude/

---

### 4.2 "Luôn delegate, keep main context sạch"

**Verdict: ĐÚNG — đây là pattern quan trọng nhất**

**Cách subagent giữ main context sạch:** (6 - ví dụ hay)

```
TRƯỚC delegation (mọi thứ ở main context):
┌─────────────────────────────────────────────────┐
│ Main Context (200K)                             │
│ ├── System prompt + Tools         30K           │
│ ├── File read: package.json       2K            │
│ ├── File read: src/index.ts       5K            │
│ ├── Grep results: 200 matches     8K            │
│ ├── File read: src/utils.ts       3K            │
│ ├── Test output: 500 lines        4K            │
│ └── Conversation                  10K           │
│                              TOTAL: 62K tokens  │
└─────────────────────────────────────────────────┘

SAU delegation (chỉ summary ở main):
┌─────────────────────────────────────────────────┐
│ Main Context (200K)                             │
│ ├── System prompt + Tools         30K           │
│ ├── Conversation + summaries      5K            │
│                              TOTAL: 35K tokens  │
└─────────────────────────────────────────────────┘
    │
    ├── SubAgent "Explore" (200K riêng)
    │   └── Grep + File reads → trả: "Found 3 files: X, Y, Z"
    │
    ├── SubAgent "Research" (200K riêng)
    │   └── Web search + reads → trả: "API supports cursor pagination"
    │
    └── SubAgent "Test" (200K riêng)
        └── Run tests → trả: "All 42 tests passed"
```

**SubAgent vs Main Agent — So sánh chi tiết:**

| Khả năng | Main Agent | SubAgent |
|----------|-----------|----------|
| **Context window** | 200K (shared cả session) | 200K riêng biệt (fresh mỗi lần spawn) |
| **Spawn sub-agents** | Có (tối đa ~5 đồng thời) | KHÔNG — Task tool không available |
| **Skill loading** | Lazy: chỉ load metadata (~100 tokens/skill), full body khi invoke | Eager: load FULL body ngay startup cho skills được gán |
| **Tool access** | Tất cả built-in tools + MCP tools | Chỉ tools được gán qua `tools:` trong frontmatter |
| **CLAUDE.md** | Load đầy đủ hierarchy (global → project → subdirectory) | Inherit system prompt từ parent (cho cache efficiency), KHÔNG load CLAUDE.md riêng |
| **Conversation history** | Giữ toàn bộ lịch sử | KHÔNG inherit — bắt đầu fresh, chỉ nhận prompt từ parent |
| **Output về parent** | N/A | Trả 1 summary message duy nhất |
| **File editing** | Có | Có (nếu được gán Edit/Write tools) |
| **Web search** | Có | Có (nếu được gán WebSearch tool) |
| **Worktree isolation** | Không (làm việc trên repo chính) | Có thể dùng `isolation: "worktree"` để làm việc trên bản copy |
| **Invoke skills** | Có (qua Skill tool + slash commands) | KHÔNG invoke on-demand — skills phải gán trước qua `skills:` |
| **MCP tools** | Có (bao gồm deferred loading) | Có (nếu được gán), nhưng KHÔNG có ToolSearch/deferred loading |
| **Compaction** | Auto-compact khi đầy | Thường hoàn thành trước khi cần compact |

**Tóm tắt: SubAgent = focused worker với scope hẹp hơn, context sạch hơn, nhưng ít linh hoạt hơn.**

**QUAN TRỌNG: SubAgent chỉ delegate 1 cấp**
- SubAgent KHÔNG THỂ spawn subagent khác (intentional design constraint)
- Task tool (spawn agent) **không available** cho subagent — dù bạn cố gán `Task` tool cũng không work
- Nếu subagent cố dùng Bash chạy `claude --agent` để workaround → crash OOM
- Ngăn uncontrolled agent recursion
- **Workaround:** dùng Skills thay cho nested subagents, hoặc chain subagents tuần tự từ main
- Ref: https://github.com/anthropics/claude-code/issues/19077

**SubAgent load TOÀN BỘ skill content khi startup (khác main agent!):**
```
Main Agent (lazy loading):
├── Skill A: chỉ load metadata (name + description) → ~100 tokens
├── Skill B: chỉ load metadata → ~100 tokens
└── Khi invoke /skillA → lúc này mới load full body → ~5,000 tokens

SubAgent (eager loading cho skills được gán):
├── skills: ["skillA", "skillB"]  ← defined trong .claude/agents/my-agent.md
├── Skill A: load FULL BODY ngay lúc startup → ~5,000 tokens
└── Skill B: load FULL BODY ngay lúc startup → ~5,000 tokens
    → 10K tokens bị chiếm ngay từ đầu!
```

> **Hệ quả quan trọng:** Nếu gán 20 skills cho subagent, mỗi skill ~5K tokens
> = 100K tokens bị chiếm ngay khi spawn → chỉ còn ~60K tokens cho task thực tế.
> **→ Chỉ gán skills THỰC SỰ CẦN cho subagent đó!**

**Cách define skillset cho SubAgent:**
```yaml
# .claude/agents/payroll-agent.md
---
name: payroll-agent
description: Handle payroll-related tasks
tools: Bash, Read, Edit, Grep
skills: payroll-calculator, salary-report  # CHỈ gán skills cần thiết
---
Your instructions here...
```

→ SubAgent chỉ load 2 skills thay vì tất cả → tiết kiệm tokens đáng kể

**Evidence:**
- https://code.claude.com/docs/en/sub-agents
- https://platform.claude.com/docs/en/agent-sdk/subagents
- https://claudefa.st/blog/guide/agents/sub-agent-best-practices
- https://github.com/anthropics/claude-code/issues/19445

---

### 4.3 CLAUDE.md — Hệ thống kế thừa Parent → Child

CLAUDE.md là file instructions **luôn được load vào context** (survive compaction). Claude Code dùng hệ thống kế thừa multi-tier:

```
Thứ tự load (rộng → hẹp, hẹp hơn sẽ override rộng hơn):

1. ~/.claude/CLAUDE.md              ← User-level (global, mọi project)
2. ../../CLAUDE.md                  ← Parent directories (monorepo root)
3. ./CLAUDE.md                      ← Project root (shared với team qua git)
4. ./src/CLAUDE.md                  ← Subdirectory (lazy load khi Claude đọc files trong src/)
5. ./src/components/CLAUDE.md       ← Deeper subdirectory (lazy load sâu hơn)
```

**Ví dụ monorepo:**
```
my-monorepo/
├── CLAUDE.md                     ← "Use TypeScript. Follow ESLint rules."
├── packages/
│   ├── frontend/
│   │   ├── CLAUDE.md             ← "Use React 19. Prefer server components."
│   │   └── src/
│   │       └── components/
│   │           └── CLAUDE.md     ← "All components must have unit tests."
│   └── backend/
│       └── CLAUDE.md             ← "Use Hono framework. All APIs must have OpenAPI docs."
└── .claude/
    └── CLAUDE.md                 ← Project-wide settings (private, gitignored)
```

**Key behaviors:**
- **Precedence:** Specific (child) > General (parent). Cùng instruction → child wins
- **Subdirectory CLAUDE.md** là **lazy-loaded** — chỉ load khi Claude thực sự đọc files trong thư mục đó (không load hết lúc startup)
- **CLAUDE.local.md** ở mỗi level cho personal/untracked instructions (gitignore)
- CLAUDE.md **survive compaction** — là 1 trong ít thứ KHÔNG bị mất khi context bị nén
- `claudeMdExcludes` trong settings cho phép exclude patterns

**Ảnh hưởng context:** Mỗi CLAUDE.md file ăn tokens. Nếu project có 10 file CLAUDE.md dài → nhiều tokens bị chiếm permanent. **Giữ mỗi file <200 dòng.**

**Evidence:**
- https://code.claude.com/docs/en/memory
- https://claude.com/blog/using-claude-md-files

---

### 4.4 Compaction — Auto-compact khi context đầy (7)

```
Trigger: ~83.5% capacity (~167K / 200K tokens)
Process: Claude tạo summary → thay thế full history
Result:  150K → 30-50K tokens (60-80% reduction)

⚠️  MẤT THÔNG TIN: tên biến cụ thể, error messages chính xác,
    decisions sớm trong session bị nén/mất

💡 Khuyến nghị: compact THỦ CÔNG tại logical breakpoints
   thay vì để auto-trigger giữa task
```

**Evidence:**
- https://platform.claude.com/docs/en/build-with-claude/compaction

---

## 5. Skill & SubAgent Loading Mechanism

### 5.1 "SubAgent tương tự cách hoạt động của Skill"

**Verdict: SAI MỘT PHẦN**

Có điểm chung (progressive disclosure) nhưng **khác biệt cơ bản:**

| Tiêu chí            | SubAgent                     | Skill                           |
| -------------------- | ---------------------------- | ------------------------------- |
| **Context**          | Riêng biệt hoàn toàn        | Inject vào CÙNG main context    |
| **Token impact**     | Không ảnh hưởng main context | Tăng main context khi invoke    |
| **Output**           | Summary ngắn trả về parent   | Instructions thực thi trực tiếp |
| **Dùng khi**         | Task nặng, nhiều exploration | Workflow có quy trình rõ ràng   |
| **Điểm chung**       | Lazy: chỉ spawn khi cần     | Lazy: chỉ load body khi invoke  |

**Đúng ở 1 điểm:** Cả hai đều giúp **giảm main context** — SubAgent qua isolation, Skill qua progressive loading.

---

### 5.2 Cách Claude Code load Skills — 2-Tier Architecture

**Tier 1 — Skills (prompt-based):**
```
┌─────────────────────────────────────────────────────────┐
│ STARTUP                                                 │
│                                                         │
│ Skill A: "commit - Create git commits" ──── ~100 tokens │
│ Skill B: "review-pr - Review pull requests" ─ ~100 tokens│
│ Skill C: "deploy - Deploy to production" ─── ~100 tokens│
│                                                         │
│ TOTAL: ~300 tokens (chỉ name + description)             │
└─────────────────────────────────────────────────────────┘
                         │
                    User: /commit
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│ ON INVOKE                                               │
│                                                         │
│ Load full SKILL.md body ──────────────── ~5,000 tokens  │
│ (nếu cần) Load scripts/references/ ──── thêm tokens    │
│                                                         │
│ → 98% token reduction cho skills chưa activate          │
└─────────────────────────────────────────────────────────┘
```

**Tier 2 — Deferred Tools (MCP Tool Search):**
```
┌─────────────────────────────────────────────────────────┐
│ STARTUP                                                 │
│                                                         │
│ <available-deferred-tools>                              │
│   AskUserQuestion                                       │
│   WebSearch                                             │
│   mcp__JIRA__search_issues                              │
│   mcp__JIRA__create_issue                               │
│   ... (chỉ TÊN, không có schema)                       │
│ </available-deferred-tools>                             │
│                                                         │
│ TOTAL: vài trăm tokens (thay vì 55K+ cho full schemas) │
└─────────────────────────────────────────────────────────┘
                         │
                  Claude cần tool
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│ ON DEMAND                                               │
│                                                         │
│ ToolSearch("jira search") → fetch full JSON schema      │
│ → 85-95% context reduction cho tool definitions         │
└─────────────────────────────────────────────────────────┘
```

**Evidence:**
- https://taylordaughtry.com/posts/claude-skills-are-lazy-loaded-context/
- https://jpcaparas.medium.com/claude-code-finally-gets-lazy-loading-for-mcp-tools-explained-39b613d1d5cc
- https://claudefa.st/blog/tools/mcp-extensions/mcp-tool-search

---

### 5.3 So sánh: Claude Code vs ChatGPT vs GitHub Copilot

| Feature            | Claude Code               | ChatGPT GPTs           | GitHub Copilot          |
| ------------------ | ------------------------- | ---------------------- | ----------------------- |
| **Load pattern**   | Progressive (lazy)        | Eager (load tất cả)    | Progressive (lazy)      |
| **Deferred tools** | Có (ToolSearch)           | Không                  | Có                      |
| **Skill format**   | SKILL.md + YAML           | OpenAPI schema          | SKILL.md + YAML         |
| **Discovery**      | Skill Finder (meta-skill) | GPT Store              | Directory scanning      |
| **Interoperable**  | Có (cùng format Copilot)  | Không                  | Có (cùng format Claude) |

> **Key insight:** GitHub Copilot và Claude Code dùng **cùng format SKILL.md** → Skills portable giữa 2 hệ thống!

**Evidence:**
- https://github.blog/changelog/2025-12-18-github-copilot-now-supports-agent-skills/
- https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills
- https://code.visualstudio.com/docs/copilot/customization/agent-skills

---

## 6. Scale Problem — 10K Skills/Tools/Knowledge

### 6.1 Bài toán: 10K skills × 300 tokens = 3M tokens (impossible!)

**Verdict: ĐÚNG — đây là vấn đề thực tế**

Thực tế còn tệ hơn con số 50 tokens/skill:
- 1 tool schema thường **300–1,500 tokens** (không phải 50)
- Tool-calling hallucinations **tăng tỷ lệ thuận** với tool count
- Trên ~20 tools, model bắt đầu chọn sai tool thường xuyên

---

### 6.2 "General Skills + Skill Finder dynamic"

**Verdict: ĐÚNG — đây chính xác là pattern được khuyến nghị**

#### Pattern 1: Two-Phase Loading (Claude Code đang dùng)

```
Phase 1: Load catalog nhẹ ─── name + 1-line description ─── ~100 tokens/skill
Phase 2: On-demand ────────── fetch full schema/instructions khi cần
```

#### Pattern 2: Tool RAG (Retrieval-Augmented Tool Selection)

```
1. Embed tool descriptions vào vector database
2. Query time: embed user intent → retrieve top-k relevant tools
3. Chỉ inject top-k tools vào context

→ TRIPLE tool invocation accuracy
→ Giảm 50% prompt length
```

**Evidence:**
- https://next.redhat.com/2025/11/26/tool-rag-the-next-breakthrough-in-scalable-ai-agents/
- https://arxiv.org/pdf/2511.01854 (Tool-to-Agent Retrieval)

#### Pattern 3: Code-as-Tool-Call (cho 100K+ tools)

```
Thay vì structured tool calling, agent viết code import và gọi functions
Agent browse directory of available functions giống human developer

→ Scale lên 100,000+ tools
```

**Evidence:**
- https://getviktor.com/blog/what-breaks-when-your-agent-has-100000-tools

#### Pattern 4: Tag/Scope-Based Filtering (ý tưởng cho Enterprise)

```
Architecture đề xuất cho 10K skills trong enterprise (vd: EH):

System Prompt
├── General Skills (10-20 skills, always loaded)      → ~2K tokens
├── Skill Finder meta-tool                            → ~200 tokens
└── Dynamic loading khi cần:
    └── Skill Finder → search by tag/scope → load on-demand -> dùng cho cả sub-agent vẫn work (tốt hơn là full load content skills vào lúc sub-agent startup)

Phân loại theo team/bộ phận: (9)
┌─────────────────────────────────────────────────┐
│ Tags/Scopes:                                    │
│ ├── general     (20 skills)  → load cho all     │
│ ├── payroll     (50 skills)  → chỉ team Payroll │
│ ├── hr          (80 skills)  → chỉ team HR      │
│ ├── engineering (200 skills) → chỉ team Eng     │
│ └── ...                                         │
│                                                 │
│ User thuộc team Payroll:                        │
│   Load: general (20) + payroll (50) = 70 skills │
│   Token cost: 70 × 100 = 7K tokens             │
│                                                 │
│ Thay vì load all: 10K × 300 = 3M tokens ❌     │
│ Chỉ load relevant: 70 × 100 = 7K tokens ✅     │
└─────────────────────────────────────────────────┘
```

**Evidence:**
- https://voltagent.dev/blog/tool-routing/
- https://nicholasnadeau.com/2026/02/genai-montreal-confoo-agentic-routing-mdx

---

### 6.3 Dynamic SubAgent Loading — Cùng pattern với Skills

```
SubAgent Catalog (lightweight):
├── "db-migration-agent"   - "Handle database migrations"
├── "api-integration-agent" - "Build API integrations"
├── "test-agent"           - "Write and run tests"
└── ...

Routing Layer:
User request → semantic matching → chọn agent phù hợp → spawn

Custom subagents: .claude/agents/*.md (YAML + instructions)
```

> _"Agentic AI is a routing problem, not an intelligence problem"_

**Evidence:**
- https://code.claude.com/docs/en/sub-agents

---

### 6.4 Dynamic Knowledge Base — Cùng pattern với Skills/Tools

| Mechanism        | Khi nào dùng                | Context cost              |
| ---------------- | --------------------------- | ------------------------- |
| **RAG**          | KB lớn, content động        | Chỉ load retrieved chunks |
| **Skills**       | Quy trình, workflows        | Progressive: name → body  |
| **MCP Resources**| Structured data, APIs       | On-demand qua tool calls  |
| **CLAUDE.md**    | Project context cố định     | Always loaded (survive compaction) |

**RAG = dynamic context loading:**
```
1. Indexing:  Documents → chunk → embed → vector DB
2. Query:    User query → embed → nearest-neighbor search → top-k chunks
3. Generate: LLM + retrieved chunks → grounded response

→ Thay vì load toàn bộ KB vào context
→ Chỉ load fragments liên quan nhất per query
```

**MCP Resources = standardized data access:**
- MCP servers có thể wrap RAG pipelines
- Agent gọi MCP tool → tool thực hiện retrieval → trả chunks

**Evidence:**
- https://www.truefoundry.com/blog/mcp-vs-rag
- https://blog.alexewerlof.com/p/rag-vs-skill-vs-mcp-vs-rlm
- https://becomingahacker.org/integrating-agentic-rag-with-mcp-servers-technical-implementation-guide-1aba8fd4e442

---

## 7. Kiến thức nâng cao bổ sung

### 7.1 Token-Efficient Tool Use (Claude 4 built-in)

- Tiết kiệm trung bình **14% output tokens** cho tool calls
- Khuyến khích parallel tool use
- Ref: https://docs.anthropic.com/en/docs/build-with-claude/tool-use/token-efficient-tool-use

### 7.2 Context Window Tiers

| Tier               | Context Window       |
| ------------------ | -------------------- |
| Standard           | **200K tokens**      |
| Enterprise         | **500K tokens**      |
| 1M Beta (Tier 4+)  | **1,000,000 tokens** |

- Ref: https://platform.claude.com/docs/en/build-with-claude/context-windows

### 7.3 Batch API — 50% discount

- Xử lý bất đồng bộ, giảm **50%** cả input lẫn output tokens
- Ref: https://docs.anthropic.com/en/docs/about-claude/pricing

### 7.4 Code Execution thay thế Tool Calls

- Pattern: Agent viết code gọi APIs thay vì structured tool calls
- Kết quả: **~150K tokens → ~2K tokens** (98.7% reduction)
- Ref: https://www.anthropic.com/engineering/advanced-tool-use

### 7.5 Token Count API (miễn phí)

- Endpoint `/v1/messages/count_tokens` — đếm tokens trước khi gửi message
- Bao gồm tools, images, documents
- Ref: https://docs.anthropic.com/en/api/messages-count-tokens

---

## 8. Best Practices — Tổng hợp tối ưu Context Window

> Tất cả các cách có thể giảm tokens trong context window, không chừa cách nào.

### 8.1 Trước khi bắt đầu session (Pre-session)

| # | Technique | Token savings | Cách làm |
|---|-----------|--------------|----------|
| 1 | **Giới hạn MCP servers** | Hàng chục ngàn tokens | Chỉ enable servers cần cho project hiện tại. 1 Jira server = ~17K tokens |
| 2 | **defer_loading: true** | 85-95% tool tokens | Tool definitions không load vào context. Chỉ tên xuất hiện, full schema load on-demand qua ToolSearch |
| 3 | **ENABLE_TOOL_SEARCH=auto:5** | ~85% overhead | Hạ ngưỡng auto-trigger từ 10% xuống 5% context |
| 4 | **CLAUDE.md ngắn gọn** | Vài ngàn tokens | Giữ <200 dòng/file. Dùng headers + bullets. Survive compaction nên mỗi token đều "permanent" |
| 5 | **Chọn lọc skills** | ~100 tokens/skill tiết kiệm | Uninstall skills không liên quan đến project hiện tại |
| 6 | **SubAgent skillset filtering** | Hàng ngàn tokens/agent | Chỉ gán skills cần thiết qua `skills:` trong agent frontmatter. SubAgent load FULL body, không lazy |
| 7 | **Chọn model phù hợp** | Cost savings | Dùng Haiku cho simple tasks ($1/1M input vs $5/1M Opus) |

### 8.2 Trong session (During session)

| # | Technique | Token savings | Cách làm |
|---|-----------|--------------|----------|
| 8 | **Delegate qua SubAgent** | Tới 84% tokens | Exploration, file reads, grep → subagent context riêng. Main chỉ nhận summary |
| 9 | **Compact thủ công tại logical breakpoints** | 60-80% context | Gõ `/compact` sau khi hoàn thành 1 task lớn, trước khi bắt đầu task mới. Tốt hơn auto-compact giữa chừng |
| 10 | **Parallel tool calls** | 14% output tokens | Claude 4 built-in. 1 message nhiều tool calls thay vì tuần tự |
| 11 | **Tránh đọc files lớn không cần thiết** | Vài ngàn tokens/file | Tool results trở thành history. Đọc 1 file 5K tokens = 5K tokens BỊ GỬI LẠI mỗi turn sau |
| 12 | **Dùng targeted reads** | Hàng ngàn tokens | `Read` với offset/limit thay vì đọc toàn bộ file. `Grep` thay vì đọc rồi search |
| 13 | **Skills thay vì lặp lại instructions** | Hàng ngàn tokens | Tạo skill 1 lần, invoke nhiều lần. Thay vì paste cùng instructions mỗi session |

### 8.3 Architecture level (System design)

| # | Technique | Token savings | Cách làm |
|---|-----------|--------------|----------|
| 14 | **Prompt Caching** | 90% cost cho static content | System prompt + tool definitions cache. Write 1.25x → Read 0.1x. Cache prefix phải ổn định |
| 15 | **Two-Phase Skill Loading** | 98% tokens | Phase 1: name + description (~100 tokens/skill). Phase 2: full body on-demand |
| 16 | **Tool RAG** | 50% prompt + 3x accuracy | Embed tool descriptions → vector search → top-k relevant tools only |
| 17 | **Tag/Scope-Based Filtering** | Scale 10K→70 skills | Phân loại skills theo team/role. User chỉ load relevant subset |
| 18 | **Code-as-Tool-Call** | 98.7% tokens | Agent viết code gọi APIs thay vì structured tool calls. Scale 100K+ tools |
| 19 | **CLAUDE.md hierarchy** | Lazy load per-directory | Subdirectory CLAUDE.md chỉ load khi Claude đọc files trong đó. Không load all lúc startup |
| 20 | **RAG cho knowledge base** | Chỉ load relevant chunks | Thay vì inject toàn bộ KB vào context, embed + retrieve on-demand |
| 21 | **Batch API** | 50% cost | Cho async processing. Giảm nửa giá cả input lẫn output |
| 22 | **Extended Thinking** | Free cho past turns | Thinking blocks từ turns trước tự động ignored, không tính input tokens |
| 23 | **Skill Finder meta-skill** | Dynamic discovery | 1 meta-skill (~200 tokens) thay thế catalog 10K skills. Search + load on-demand |
| 24 | **MCP Resources wrapping RAG** | On-demand data | MCP server wrap RAG pipeline. Agent call tool → server retrieve → trả relevant chunks |

### 8.4 Cheat Sheet — Token Budget Planning

```
Context Window:                              200,000 tokens
─────────────────────────────────────────────────────────
- System prompt + built-in tools:            -33,000 tokens  (fixed)
- MCP tools (nếu không defer):               -5,000 ~ -55,000
- CLAUDE.md files:                            -1,000 ~ -5,000
- Skill metadata:                               -500 ~ -2,000
─────────────────────────────────────────────────────────
= Còn lại cho conversation:                 ~105K ~ 160K tokens

Auto-compaction triggers at:                 ~167K tokens (83.5%)
─────────────────────────────────────────────────────────
💡 MỤC TIÊU: Giữ overhead < 40K tokens → còn > 120K cho actual work
   - defer_loading MCP tools
   - CLAUDE.md < 200 dòng
   - Uninstall unused skills
   - Compact thủ công tại milestones
```

**Evidence tổng hợp:**
- https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
- https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool
- https://platform.claude.com/docs/en/build-with-claude/compaction
- https://code.claude.com/docs/en/sub-agents
- https://code.claude.com/docs/en/skills
- https://code.claude.com/docs/en/memory
- https://www.anthropic.com/engineering/advanced-tool-use
- https://docs.anthropic.com/en/docs/about-claude/pricing

---

## TÓM TẮT — FLOW PRESENTATION

```
1. Tool Use (primitive cơ bản nhất)
   "Không có tools, AI chỉ biết quá khứ"
          │
          ▼
2. Tokens & Cost (hiểu cái giá phải trả)
   "Mỗi turn gửi lại TOÀN BỘ history — snowball effect"
          │
          ▼
3. MCP & Skills (2 hướng mở rộng từ tool)
   "Standardization / Expertise — đều qua tool interface"
          │
          ▼
4. Context Optimization (giữ context sạch)
   "Inject enough, delegate always, compact wisely"
          │
          ▼
5. Scale Problem (10K skills/tools/knowledge)
   "Progressive disclosure + Tool RAG + Tag/Scope routing"
          │
          ▼
6. Best Practices
   "24 techniques to optimize your context window"
          │
          ▼
7. Request Body (bên trong 1 API call)
   "system + tools + messages = toàn bộ context"
          │
          ▼
8. Compact Action (khi context đầy)
   "AI tự tóm tắt chính nó → reset conversation"
```

---

## 9. Claude API Request Body — Bên trong 1 API call

> Data thực tế từ debug interceptor — monkey-patch `fetch()` trong Claude Code

### 9.1 Tổng quan Request

Mỗi lần Claude Code cần AI trả lời, nó gửi 1 HTTP POST:

```
POST https://api.anthropic.com/v1/messages?beta=true

{
  "metadata":  { ... },       ← Session info
  "system":    [ ... ],       ← System prompt (3 blocks)
  "tools":     [ ... ],       ← Tool definitions
  "messages":  [ ... ],       ← TOÀN BỘ conversation history
}
```

### 9.2 Chi tiết từng thành phần

#### `metadata` — Session info
```json
{
  "user_id": "user_<hash>_account_<uuid>_session_<session-uuid>"
}
```
→ Chứa session ID, dùng để tracking & billing.

#### `system` — System Prompt (3 blocks, ~25K tokens)

```
system: [
  ┌─────────────────────────────────────────────────────────────┐
  │ [0] Billing header                              ~84 chars   │
  │     "cc_version=2.1.76; cc_entrypoint=sdk-cli; cch=..."    │
  │     cache_control: ❌                                       │
  ├─────────────────────────────────────────────────────────────┤
  │ [1] Agent identity                              ~62 chars   │
  │     "You are a Claude agent, built on Claude Agent SDK."    │
  │     cache_control: ephemeral (1h)  ✅                       │
  ├─────────────────────────────────────────────────────────────┤
  │ [2] FULL instructions                        ~25,000 chars  │
  │     ├── Core behavior rules                                 │
  │     ├── Tool usage guidelines                               │
  │     ├── Git/PR instructions                                 │
  │     ├── Environment info (OS, shell, cwd)                   │
  │     └── CLAUDE.md content (inject trực tiếp)                │
  │     cache_control: ephemeral (1h)  ✅                       │
  └─────────────────────────────────────────────────────────────┘

→ cache_control: ephemeral = Prompt Caching (tiết kiệm 90% cost)
→ CLAUDE.md KHÔNG phải message riêng — nằm TRONG system block[2]
→ Gửi đi MỖI request, nhưng cache nên chỉ tính tiền 0.1x sau lần đầu
```

#### `tools` — Tool Definitions (~18K tokens)

```
tools: [
  { name: "Agent",     description: "...", input_schema: {...} },
  { name: "Bash",      description: "...", input_schema: {...} },
  { name: "Glob",      description: "...", input_schema: {...} },
  { name: "Grep",      description: "...", input_schema: {...} },
  { name: "Read",      description: "...", input_schema: {...} },
  { name: "Edit",      description: "...", input_schema: {...} },
  { name: "Write",     description: "...", input_schema: {...} },
  { name: "Skill",     description: "...", input_schema: {...} },
  { name: "ToolSearch", description: "...", input_schema: {...} },
  // + MCP tools (nếu không defer)
]

→ 9 built-in tools = ~17,600 tokens (fixed cost EVERY request)
→ MCP tools thêm vào nếu KHÔNG defer_loading
→ Deferred tools chỉ xuất hiện trong <available-deferred-tools> message
→ Tool description chứa TOÀN BỘ hướng dẫn sử dụng (không chỉ 1 dòng)
```

#### `messages` — Conversation History (snowball!)

```
messages: [
  ┌──────────────────────────────────────────────────────────────┐
  │ [0] user: "<available-deferred-tools>                        │
  │            AskUserQuestion, WebSearch, mcp__JIRA__..."       │
  │     → Danh sách deferred tool names (KHÔNG có schema)        │
  ├──────────────────────────────────────────────────────────────┤
  │ [1] user: [                                                  │
  │       { type: "text", text: "<system-reminder>               │
  │         claudeMd: CLAUDE.md content...                       │
  │         skill_listing: danh sách skills available...         │
  │         </system-reminder>" },                               │
  │       { type: "text", text: "Hello, question đầu tiên" }    │
  │     ]                                                        │
  │     → isMeta messages wrap trong <system-reminder> tags      │
  │     → Skill listing NẰM TRONG messages, KHÔNG trong system   │
  ├──────────────────────────────────────────────────────────────┤
  │ [2] assistant: [                                             │
  │       { type: "thinking", thinking: "..." },                 │
  │       { type: "text", text: "Câu trả lời..." }              │
  │     ]                                                        │
  │     → thinking block = Extended Thinking (tự xóa turn sau)   │
  ├──────────────────────────────────────────────────────────────┤
  │ [3] user: "Câu hỏi tiếp theo"                               │
  ├──────────────────────────────────────────────────────────────┤
  │ [4] assistant: [                                             │
  │       { type: "thinking", thinking: "..." },                 │
  │       { type: "tool_use", name: "Read",                      │
  │         input: { file_path: "/src/app.ts" } }                │
  │     ]                                                        │
  │     → AI quyết định gọi tool                                 │
  ├──────────────────────────────────────────────────────────────┤
  │ [5] user: [                                                  │
  │       { type: "tool_result",                                 │
  │         tool_use_id: "toolu_xxx",                            │
  │         content: "nội dung file app.ts..." }                 │
  │     ]                                                        │
  │     → Tool result = HOST thực thi, gửi kết quả lại          │
  │     → Nội dung này STAY trong history → snowball!             │
  ├──────────────────────────────────────────────────────────────┤
  │ [6] assistant: [                                             │
  │       { type: "text", text: "Phân tích xong..." }            │
  │     ]                                                        │
  │     → AI tổng hợp tool result → trả response                │
  └──────────────────────────────────────────────────────────────┘

→ MỖI turn mới = gửi lại TOÀN BỘ messages từ [0] đến cuối
→ Tool results (file content, grep output) ở lại VĨNH VIỄN
→ Skill listing chỉ có 1 lần trong messages (không duplicate)
→ Thinking blocks từ turns trước TỰ ĐỘNG bị strip (free!)
```

### 9.3 Tóm tắt Token Budget per Request

```
┌────────────────────────────────────────────────────┐
│ 1 API Request =                                     │
│                                                     │
│ system[0-2]        ~25K tokens  (cached 0.1x)       │
│ + tools[0-8]       ~18K tokens  (cached 0.1x)       │
│ + messages[0..N]   TĂNG DẦN     (snowball effect)   │
│                                                     │
│ Turn 1:  25K + 18K + 2K   = ~45K tokens             │
│ Turn 5:  25K + 18K + 20K  = ~63K tokens             │
│ Turn 20: 25K + 18K + 100K = ~143K tokens            │
│                    ↑ gần trigger auto-compact!       │
│                                                     │
│ 💡 system + tools được CACHE → chỉ 0.1x cost       │
│ 💡 messages là phần tăng THỰC SỰ gây tốn tiền      │
└────────────────────────────────────────────────────┘
```

**Evidence:**
- Debug interceptor output từ monkey-patching `fetch()` trong Claude Code
- https://docs.anthropic.com/en/api/messages
- https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching

---

## 10. Compact Action — Chuyện gì xảy ra khi context đầy? (8)

> Phân tích từ source code Claude Code (`cli.js`) — KHÔNG phải docs chung chung

### 10.1 Khi nào Compact xảy ra?

```
Auto-compact trigger:
  effectiveWindow = contextWindow - maxOutputTokens - 20K buffer
  threshold       = effectiveWindow - 13,000 tokens

Ví dụ (Opus 200K context):
  effectiveWindow ≈ 200K - 16K - 20K = 164K
  threshold       ≈ 164K - 13K = 151K tokens
  → Khi messages vượt ~151K tokens → auto compact!

Manual compact:
  User gõ /compact → compact ngay lập tức
  → Tốt hơn: compact tại logical breakpoints (sau task lớn)

Override:
  CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=80     # compact ở 80% capacity
  CLAUDE_CODE_AUTO_COMPACT_WINDOW=150000 # set custom window
  DISABLE_AUTO_COMPACT=true              # tắt hoàn toàn
```

### 10.2 Compact Request — AI tự tóm tắt chính nó

```
Compact gửi 1 API call ĐẶC BIỆT:

POST /v1/messages
{
  system: "You are a helpful AI assistant tasked with
           summarizing conversations.",

  messages: [
    ...toàn_bộ_history...,         ← gửi NGUYÊN history
    {
      role: "user",
      content: SUMMARY_PROMPT       ← "Hãy tóm tắt..."
    }
  ],

  tools: [minimal],                 ← chỉ tools nội bộ
  headers: { "x-stainless-helper": "compaction" }
}

→ AI ĐỌC LẠI toàn bộ conversation → viết summary
→ Summary bắt buộc trong <summary>...</summary> tags
→ AI KHÔNG được dùng tools trong compact request
```

**Summary prompt yêu cầu 9 sections:**
```
1. Primary Request & Intent      ← User muốn gì?
2. Key Technical Concepts        ← Tech stack, patterns
3. Files & Code Sections         ← File paths + code snippets
4. Errors & Fixes                ← Bugs gặp phải & cách fix
5. Problem Solving               ← Approach & decisions
6. ALL User Messages             ← Liệt kê lại TẤT CẢ
7. Pending Tasks                 ← Việc chưa xong
8. Current Work                  ← Đang làm gì?
9. Optional Next Step            ← Bước tiếp theo
```

### 10.3 Sau Compact — Cái gì MẤT, cái gì CÒN?

```
┌─────────────────────────────────────────────────────────┐
│                    BỊ XÓA HOÀN TOÀN                      │
├─────────────────────────────────────────────────────────┤
│ ❌ Toàn bộ message history gốc (user + assistant)       │
│ ❌ isMeta messages (system-reminders, skill content)     │
│ ❌ Tool call details (params gửi đi, results nhận về)   │
│ ❌ Thinking blocks (extended thinking)                   │
│ ❌ Code cụ thể, error messages chi tiết                  │
│    (trừ khi AI nhớ include trong summary)                │
│ ❌ Deferred tools list                                   │
│ ❌ Read file state (files đã đọc)                        │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│              ĐƯỢC GIỮ LẠI / RECONSTRUCT                  │
├─────────────────────────────────────────────────────────┤
│ ✅ System prompt         → gửi lại nguyên vẹn (block[2])│
│ ✅ CLAUDE.md content     → nằm trong system prompt       │
│ ✅ Tool definitions      → gửi lại nguyên vẹn           │
│ ✅ Skill listing         → re-inject vào messages mới    │
│ ✅ MCP tools             → re-inject                     │
│ ✅ Deferred tools list   → re-inject                     │
│ ✅ JSONL transcript path → include trong summary         │
└─────────────────────────────────────────────────────────┘
```

### 10.4 Messages SAU compact trông như thế nào?

```
TRƯỚC compact (20 messages, 150K tokens):
messages: [
  user, assistant, user, assistant, user(tool_result),
  assistant(tool_use), user(tool_result), assistant,
  user, assistant, ... × 20 messages
]

SAU compact (1 message, ~5-10K tokens):
messages: [
  {
    role: "user",
    content: "This session is being continued from a
              previous conversation that ran out of context.

              Summary:
              1. Primary Request: User wanted to...
              2. Key Technical Concepts: React, TypeScript...
              3. Files: src/app.ts (modified), ...
              ...

              If you need specific details from before
              compaction, read the full transcript at:
              ~/.claude/projects/.../session.jsonl

              Continue the conversation from where it left
              off without asking further questions."
  }
]

→ 150K tokens → 5-10K tokens (93-97% reduction!)
→ Nhưng MẤT chi tiết code, error messages cụ thể
→ AI có thể đọc JSONL để recover nếu cần
```

### 10.5 Partial Compact — Giữ messages gần nhất

```
Full compact: [msg₁ msg₂ ... msg₂₀] → [summary]
                    TẤT CẢ bị summarize

Partial compact (message selector):

  Điểm cắt ↓
[msg₁ msg₂ msg₃ | msg₄ msg₅ msg₆]
  ← summarize →   ← GIỮ NGUYÊN →

Kết quả: [summary, msg₄, msg₅, msg₆]

→ Giữ context gần nhất VERBATIM (nguyên văn)
→ Chỉ summarize phần cũ
→ Đảm bảo không cắt giữa tool_use/tool_result pair
→ Giữ ít nhất 10K tokens hoặc 5 text messages
```

### 10.6 Compact Boundary — Đánh dấu trong JSONL

```json
{
  "type": "system",
  "subtype": "compact_boundary",
  "content": "Conversation compacted",
  "compactMetadata": {
    "trigger": "auto" | "manual",
    "preTokens": 151000,
    "messagesSummarized": 20,
    "preCompactDiscoveredTools": ["mcp__jira__search"]
  }
}

→ Ghi vào JSONL để khi resume session biết compact đã xảy ra
→ preCompactDiscoveredTools: tools đã discover → re-inject sau compact
```

### 10.7 Hooks — Can thiệp trước/sau compact

```
PreCompact hook:  Chạy TRƯỚC compact
  → stdout = custom instructions thêm vào summary prompt
  → exit 2 = CHẶN compact (không cho compact)

PostCompact hook: Chạy SAU compact
  → Nhận summary text
  → stdout = hiển thị cho user

SessionStart hook: Chạy sau compact (trigger="compact")
  → Có thể inject thêm context cho session mới
```

**Evidence:**
- Source code analysis: `/tmp/node_modules/@anthropic-ai/claude-code/cli.js`
  - `mf6()` — full compact function
  - `Wqq()` — partial compact (message selector)
  - `Yx9` — full summary prompt template
  - `EmY()` — preserved message split logic
  - `Ri6()` — compact boundary marker creation
- https://platform.claude.com/docs/en/build-with-claude/compaction
- https://code.claude.com/docs/en/hooks

---

## CORRECTIONS SUMMARY

| Ý gốc | Verdict | Correction |
|--------|---------|------------|
| Tool là cơ bản nhất | ĐÚNG | Tool Use là fundamental primitive |
| Tool → MCP → A2A → Skill (tuyến tính) | SAI MỘT PHẦN | Fan-out từ Tool, không phải chuỗi. Đều qua tool interface nhưng MCP Resources/Prompts có thể bypass |
| Context tăng dựa trên input và output | ĐÚNG | Snowball effect — gửi lại toàn bộ history |
| Cost tăng theo số lần gọi tool | CẦN CHÍNH XÁC | Cost tăng vì snowball + tool results trở thành permanent history |
| SubAgent tương tự Skill | SAI MỘT PHẦN | Khác biệt: context riêng vs inject vào main. SubAgent load full skill body, main chỉ load metadata |
| Skill 50 tokens × 10K = 500K | CON SỐ SAI | Tool schema 300-1500 tokens, skill name ~100 tokens |
| General + Skill Finder pattern | ĐÚNG | Chính xác là best practice được khuyến nghị |
| SubAgent chỉ 1 cấp | ĐÚNG | Task tool không available cho subagent. Cannot nest. |
