# Context AI: Toàn bộ kiến thức về quản lý context window trong hệ sinh thái AI

**Tóm tắt quan trọng nhất:** Mọi tương tác của AI với thế giới bên ngoài đều đi qua một cơ chế duy nhất — **tool calling** (gọi hàm). MCP, Skills, sub-agents, và RAG đều là các lớp trừu tượng xây dựng trên nền tảng này. Hiểu rõ cách context window hoạt động — từ việc đếm token, tối ưu chi phí, đến scaling hàng nghìn skills — là kỹ năng cốt lõi của kỹ sư AI agentic trong giai đoạn 2025-2026. Bài nghiên cứu này đi từ khái niệm cơ bản đến kiến trúc enterprise, với mọi luận điểm đều có URL tham chiếu cụ thể.

---

## Phần 1: Tools — nền tảng duy nhất để AI truy cập dữ liệu bên ngoài

### Tool calling là primitive cơ bản nhất

AI model không bao giờ thực thi code trực tiếp. Thay vào đó, model xuất ra structured JSON thể hiện ý định gọi một tool, và **client application** mới là nơi thực thi. Chu trình hoạt động gồm 5 bước: (1) developer định nghĩa tool bằng JSON Schema, (2) model nhận tool definitions trong context, (3) model sinh ra JSON chỉ định tool cần gọi và tham số, (4) client thực thi hàm thực tế, (5) kết quả trả về cho model để sinh response cuối cùng.

Anthropic khẳng định rõ ràng: *"Tool access is one of the highest-leverage primitives you can give an agent. On benchmarks like LAB-Bench FigQA and SWE-bench, adding even simple tools produces outsized capability gains, often surpassing human expert baselines."* OpenAI cũng mô tả function calling là *"the foundation of agentic AI systems in 2025."* Đây không phải quan điểm chủ quan — cả MCP, Skills, và A2A đều được xây dựng **trên nền tảng** tool calling primitive này.

Định dạng tool definition của Anthropic:
```json
{
  "name": "get_weather",
  "description": "Get the current weather in a given location",
  "input_schema": {
    "type": "object",
    "properties": {
      "location": {"type": "string", "description": "City and state"}
    },
    "required": ["location"]
  }
}
```

OpenAI sử dụng cấu trúc tương tự nhưng wrap trong `{"type": "function", "function": {...}}`. Cả hai đều dùng JSON Schema làm chuẩn. Azure OpenAI giới hạn tool description tối đa **1.024 ký tự**.

*(Nguồn: https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/overview, https://platform.openai.com/docs/guides/function-calling, https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/function-calling)*

### Từ tool calling đến MCP — giải quyết bài toán N×M

Trước MCP, mỗi ứng dụng AI cần viết connector riêng cho từng tool — 10 ứng dụng × 100 tool = tiềm năng **1.000 custom integrations**. Đây là "bài toán N×M" kinh điển. MCP (Model Context Protocol) giải quyết bằng cách chuẩn hóa: implement client 1 lần + implement server 1 lần = mọi thứ hoạt động cùng nhau.

**Timeline phát triển:**

- **Tháng 6/2023:** OpenAI ra mắt function calling và ChatGPT plugins — mỗi plugin cần connector riêng
- **25/11/2024:** Anthropic open-source MCP với SDK cho Python và TypeScript. Khởi nguồn từ developer David Soria Parra khi frustrate với việc copy code giữa Claude Desktop và IDE
- **26/3/2025:** Sam Altman (OpenAI) tuyên bố hỗ trợ MCP đầy đủ
- **4/2025:** Google DeepMind xác nhận MCP support trong Gemini
- **5/2025:** Microsoft Build công bố Windows 11 là "agentic OS" với native MCP support
- **11/2025:** Spec update lớn (version 2025-11-25) với async operations, server identity, official registry
- **12/2025:** Anthropic tặng MCP cho **Agentic AI Foundation (AAIF)** thuộc Linux Foundation, đồng sáng lập bởi Anthropic, Block, và OpenAI

MCP cung cấp những gì tool calling thuần không có: **standardized tool discovery**, **transport chuẩn** (STDIO cho local, Streamable HTTP cho remote), **OAuth 2.1 authorization**, **resource sharing** (không chỉ tools mà còn prompts và resources), **stateful sessions** với JSON-RPC 2.0, và **ecosystem cộng đồng** hàng nghìn server tái sử dụng được. Kiến trúc MCP gồm 3 vai trò: **Hosts** (ứng dụng LLM), **Clients** (connector trong host), và **Servers** (cung cấp context). MCP được thiết kế lấy cảm hứng từ **Language Server Protocol (LSP)** — chuẩn đã thống nhất hỗ trợ ngôn ngữ lập trình trên các IDE.

Tính đến cuối 2025, hệ sinh thái MCP đạt **5.800+ servers**, **300+ clients**, **97 triệu+ lượt tải SDK/tháng**, được adopt bởi OpenAI, Google, Microsoft, AWS, Bloomberg, Cloudflare, Salesforce và hàng trăm tổ chức khác.

*(Nguồn: https://modelcontextprotocol.io/specification/2025-11-25, https://en.wikipedia.org/wiki/Model_Context_Protocol, https://www.pento.ai/blog/a-year-of-mcp-2025-review, https://cloud.google.com/discover/what-is-model-context-protocol)*

### A2A: Khi agent cần nói chuyện với agent

Nếu MCP kết nối **agent với tool**, thì A2A (Agent-to-Agent Protocol) của Google kết nối **agent với agent**. Ra mắt tháng 4/2025, hiện thuộc Linux Foundation, A2A cho phép các agent giao tiếp, ủy thác task, và cộng tác đa bước — bất kể framework hay vendor nào.

Khác biệt cốt lõi: trong MCP, agent gọi tool và nhận kết quả. Trong A2A, agent giao tiếp **như agent** — có thể hội thoại qua lại, thương lượng, và hoạt động opaque (không lộ internal memory hay logic). Google khẳng định rõ: *"A2A complements Anthropic's MCP."* Khuyến nghị chính thức: **dùng MCP cho tools, dùng A2A cho agents.**

A2A có khái niệm **AgentCard** — "danh thiếp số" của agent tại `/.well-known/agent-card.json`, chứa name, description, capabilities, authentication, và **skills**. Mỗi A2A **AgentSkill** gồm id, name, description, tags, examples, inputModes, outputModes. Ví dụ thực tế: agent quản lý kho hàng dùng MCP để query database sản phẩm → khi phát hiện hết hàng, dùng A2A giao tiếp với agent nhà cung cấp để đặt hàng.

*(Nguồn: https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability/, https://a2a-protocol.org/latest/, https://github.com/a2aproject/A2A)*

### Skills: Lớp trừu tượng giữa tools và domain expertise

Skills là concept đặc biệt quan trọng — chúng **hoạt động THÔNG QUA tools** chứ không thay thế tools. Anthropic ra mắt Agent Skills ngày 16/10/2025 với thiết kế **progressive disclosure** — đây là innovation pattern cốt lõi:

1. **Khi khởi động:** Chỉ load metadata (name + description) — khoảng **100 tokens/skill**
2. **Khi cần:** Load toàn bộ SKILL.md body — thường dưới 5K tokens
3. **Khi thực thi:** Scripts chạy trong VM, code không enter context — chỉ output được capture

Skills yêu cầu `code-execution-2025-08-25` beta header và hoạt động trong môi trường VM với filesystem access. Tối đa **8 skills/API request**. Pre-built skills gồm: PowerPoint, Excel, Word, PDF. Custom skills do developer tạo.

**Để "phát minh khái niệm mới như Skills"**, cần pattern sau: (1) Xác định constraint — tools tốn tokens upfront, (2) Áp dụng progressive disclosure — load metadata trước, content sau, (3) Đóng gói domain expertise — bundle instructions + code + resources, (4) Leverage primitives có sẵn — Skills chạy THÔNG QUA code execution tool, (5) Tạo open standard — Anthropic công bố format công khai tại agentskills.io.

*(Nguồn: https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview, https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills, https://github.com/anthropics/skills, https://code.claude.com/docs/en/skills)*

### Kiến trúc phân tầng tổng thể

```
Layer 4: A2A          → Agent giao tiếp với Agent
Layer 3: Skills       → Domain expertise đóng gói (progressive disclosure)
Layer 2: MCP          → Chuẩn kết nối tool/resource (giải bài toán N×M)
Layer 1: Tool Calling → Primitive cơ bản (model sinh JSON → client thực thi)
Layer 0: LLM          → Language model
```

Mỗi lớp xây trên lớp bên dưới. Cả ba protocol (Tools, MCP, A2A) đều thuộc quản trị mở — MCP và A2A dưới Linux Foundation.

---

## Phần 2: Cách đếm token và tính chi phí trong một session

### Input tokens vs output tokens

API của Claude là **stateless** — không nhớ gì giữa các lần gọi. Mỗi API call phải gửi **toàn bộ lịch sử hội thoại**. Đây là điều quan trọng nhất cần hiểu:

- **Input tokens:** Mọi thứ gửi ĐẾN model — system prompt, toàn bộ conversation history, tool definitions, hình ảnh, PDF, và tin nhắn hiện tại
- **Output tokens:** Mọi thứ model SINH RA — text response, tool_use requests, và extended thinking tokens

Mỗi API response trả về object `usage` gồm: `input_tokens`, `output_tokens`, `cache_creation_input_tokens`, và `cache_read_input_tokens`. Anthropic cung cấp **token counting API miễn phí** tại `POST /v1/messages/count_tokens`.

*(Nguồn: https://platform.claude.com/docs/en/about-claude/pricing, https://platform.claude.com/docs/en/build-with-claude/token-counting)*

### Context tăng trưởng theo mô hình tích lũy

Đây là bài toán "expanding context" — vì API stateless, mỗi lần gọi phải gửi lại toàn bộ lịch sử:

| Lượt | Input tokens tích lũy | Output tokens mới | Tổng tokens bị tính phí |
|------|----------------------|-------------------|------------------------|
| 1 | 600 (system + msg1) | 300 | 900 |
| 2 | 1,200 (sys + msg1 + resp1 + msg2) | 300 | 1,500 |
| 3 | 1,800 | 300 | 2,100 |
| 4 | 2,400 | 300 | 2,700 |
| 5 | 3,000 | 300 | 3,300 |
| **Tổng** | **9,000 input** | **1,500 output** | **10,500** |

Nếu mỗi lượt independent, tổng input chỉ 3,000 tokens. Việc gửi lại tích lũy khiến bạn trả **gấp 3 lần** cho input tokens qua 5 lượt. Một bài phân tích thực tế: *"Run a coding agent for 50 turns with a 10,000-token system prompt, and you've silently paid for 500,000 tokens of the same instructions you already sent on turn one."*

*(Nguồn: https://platform.claude.com/docs/en/build-with-claude/context-windows, https://medium.com/ai-software-engineer/anthropic-just-fixed-the-biggest-hidden-cost-in-ai-agents-using-automatic-prompt-caching-9d47c95903c5)*

### Tools ảnh hưởng token count như thế nào

Khi sử dụng `tools` parameter, nhiều nguồn token được cộng thêm:

- **Tool use system prompt tự động inject:** Claude 4.x thêm **346 tokens** (auto/none mode) hoặc **313 tokens** (any/tool mode). Claude Opus 3 thêm tới **530 tokens**
- **Tool definitions:** Mỗi tool definition tốn tokens tùy độ phức tạp. Ví dụ cụ thể: message "Hello, Claude" với system prompt = **14 input tokens**. Cùng message đó nhưng thêm 1 tool `get_weather` = **403 input tokens** — thêm ~389 tokens chỉ từ 1 tool
- **Các tool tích hợp:** Bash tool = 245 tokens, Text editor = 700 tokens, Computer use = 735 tokens + 466-499 tokens system prompt overhead

**Dữ liệu thực tế gây shock:** Một setup 5 MCP servers với 58 tools tốn khoảng **55,000 tokens** trước khi hội thoại bắt đầu. Jira MCP server riêng dùng **~17,000 tokens**. Anthropic đã ghi nhận tool definitions tốn **134,000 tokens** trước khi tối ưu. Một developer báo cáo 7+ MCP servers chiếm **82,000 tokens (41% của 200K context)** ngay khi khởi động session.

Mỗi tool call tạo thêm ít nhất 1 API call: (1) model sinh `tool_use` request → (2) client thực thi → (3) model nhận lại toàn bộ context cũ + tool_use block + tool_result. **Đó là lý do chi phí tăng sau mỗi tool call** — context window liên tục phình ra.

*(Nguồn: https://platform.claude.com/docs/en/about-claude/pricing#tool-use-pricing, https://www.anthropic.com/engineering/advanced-tool-use, https://scottspence.com/posts/optimising-mcp-server-context-usage-in-claude-code)*

### Sub-agents và token: tách biệt nhưng vẫn tốn

Mỗi sub-agent trong Claude Code có **context window riêng biệt hoàn toàn** — chạy như một instance Claude độc lập. Điều này nghĩa là sub-agent không làm phình context của parent, nhưng **tốn token riêng**. Agent teams sử dụng khoảng **7 lần nhiều tokens hơn** sessions thường khi teammates chạy trong plan mode. Claude Code trung bình tốn **~$6/developer/ngày**, dưới $12/ngày cho 90% users, tương đương **~$100-200/developer/tháng** với Sonnet 4.6.

*(Nguồn: https://code.claude.com/docs/en/costs, https://dev.to/onlineeric/claude-code-sub-agents-burn-out-your-tokens-4cd8)*

### Bảng giá và công thức tính chi phí

Công thức cho mỗi API call:
```
Cost = (input_tokens × input_price) + (output_tokens × output_price)
     + (cache_write_tokens × cache_write_price) + (cache_read_tokens × cache_hit_price)
```

Bảng giá hiện tại (per 1M tokens):

| Model | Input | Output | Cache Write (5m) | Cache Hit |
|-------|-------|--------|------------------|-----------|
| **Claude Opus 4.6** | $5 | $25 | $6.25 | $0.50 |
| **Claude Sonnet 4.6** | $3 | $15 | $3.75 | $0.30 |
| **Claude Haiku 4.5** | $1 | $5 | $1.25 | $0.10 |
| Claude Haiku 3.5 | $0.80 | $4 | $1 | $0.08 |

Các modifier quan trọng: **Long context (>200K input):** 2× input, 1.5× output. **Batch API:** giảm 50%. **Fast mode (Opus 4.6):** 6× giá thường. Các modifier **cộng dồn** với nhau.

**Prompt caching là game-changer:** Cache read chỉ tốn **10% giá input** — giảm 90% chi phí cho phần context lặp lại. Một developer giảm chi phí hàng tháng từ $720 xuống $72 bằng caching 81,262 tokens metadata. Anthropic hỗ trợ cả explicit caching (đặt breakpoints) và automatic caching. Minimum cacheable: 1,024 tokens (4,096 cho Haiku 4.5), tối đa 4 breakpoints/request.

*(Nguồn: https://platform.claude.com/docs/en/about-claude/pricing, https://www.anthropic.com/news/prompt-caching, https://medium.com/@labeveryday/prompt-caching-is-a-must-how-i-went-from-spending-720-to-72-monthly-on-api-costs-3086f3635d63)*

---

## Phần 3: Chiến lược tối ưu context — nghệ thuật "context engineering"

### Những gì load mặc định vào context của Claude Code

Khi bắt đầu session Claude Code, context window chứa các thành phần sau:

| Thành phần | Mô tả | Token ước tính |
|------------|--------|---------------|
| System Prompt | Hướng dẫn và hành vi cốt lõi | ~3,100 (1.5%) |
| System Tools | Bash, Read, Edit, Write, Grep, Glob, LS, WebSearch, v.v. | ~12,400 (6.2%) |
| MCP Tools | Tất cả tool definitions từ MCP servers đã kết nối | 5K–82K+ (biến thiên) |
| CLAUDE.md files | Memory files và project context | ~300+ |
| Custom Agents | Mô tả các sub-agent tùy chỉnh | ~500+ |
| Reserved | Autocompact + output tokens | ~45K (22.5%) |

**Hệ thống CLAUDE.md** load tự động theo hierarchy: `~/.claude/CLAUDE.md` (user level, mọi project) → `./CLAUDE.md` (project root) → `CLAUDE.local.md` (cá nhân, untracked). Claude quét đệ quy nhiều thư mục và merge tất cả. CLAUDE.md trở thành phần của system prompt — **mọi hội thoại đều bắt đầu với context này đã load sẵn**.

Lệnh `/context` trong Claude Code cho breakdown chi tiết token usage, ví dụ: System Prompt 8,234 tokens (4.2%), Conversation History 89,450 tokens (45.8%), Tool Results 52,180 tokens (26.7%).

*(Nguồn: https://code.claude.com/docs/en/how-claude-code-works, https://claude.com/blog/using-claude-md-files, https://claudelog.com/faqs/what-is-context-command-in-claude-code/)*

### Chiến lược 1: "Inject đủ tools, không phải tất cả"

Đây là chiến lược có bằng chứng rõ ràng nhất. Anthropic khuyến nghị: *"Too many tools or overlapping tools can also distract agents from pursuing efficient strategies. We recommend building a few thoughtful tools targeting specific high-impact workflows."* Dữ liệu benchmark cho thấy models hoạt động tốt hơn với 9 APIs so với 12 APIs — **số lượng tools tăng thì accuracy giảm**.

Bằng chứng thực tế ấn tượng: Composio benchmark cho thấy accuracy dao động từ **~33%** (không tối ưu) đến **~74%** (tối ưu tool description). OpenAI hard limit 128 tools/agent, nhưng performance degradation có thể bắt đầu sớm hơn nhiều — ngưỡng khuyến nghị là **10+ tools thì bắt đầu rủi ro**.

Giải pháp đã ship trong Claude Code: **MCP Tool Search** (v2.1.7+) — kích hoạt tự động khi MCP tool definitions vượt **10% context window**. Thay vì load tất cả, hệ thống xây search index nhẹ và fetch tools **on-demand**. Kết quả: giảm từ ~72,000 tokens xuống ~8,700 tokens — **giảm 85-95%**. Hỗ trợ 2 phương thức tìm kiếm: regex mode (Claude tạo regex patterns) và BM25 mode (natural language semantic matching).

Các best practices cụ thể: tối ưu tool signatures (giảm parameters thừa, tên ngắn), cache tool definitions, dùng hierarchical tool selection, namespace tools theo service/resource, và consolidate tools (thay vì `list_users` + `list_events` + `create_event`, build 1 tool `schedule_event`).

*(Nguồn: https://www.anthropic.com/engineering/writing-tools-for-agents, https://achan2013.medium.com/how-tool-complexity-impacts-ai-agents-selection-accuracy-a3b6280ddce5, https://code.claude.com/docs/en/mcp, https://scottspence.com/posts/optimising-mcp-server-context-usage-in-claude-code)*

### Chiến lược 2: "Luôn delegate, giữ context chính sạch"

Sub-agents là cơ chế mạnh nhất để quản lý context. Mỗi sub-agent có **context window riêng biệt hoàn toàn** — intermediate tool calls và results ở trong sub-agent; chỉ **final message** trả về parent. Anthropic mô tả: *"A research-assistant subagent can explore dozens of files without any of that content accumulating in the main conversation. The parent receives a concise summary, not every file the subagent read."*

Claude Code có 3 loại sub-agent built-in: **Explore** (read-only, nhanh, cho search/analyze), **Plan** (complex planning, architecture), và **General-purpose** (full capabilities, explore + modify + reason). Sub-agents được định nghĩa tùy chỉnh trong `.claude/agents/` với YAML frontmatter chứa name, description, tools, model, skills.

**Giới hạn quan trọng: sub-agents chỉ delegate 1 level deep.** Sub-agents KHÔNG có access đến Task/Agent tool — không thể spawn sub-agents khác. Đây là architectural limitation được xác nhận. Workaround qua `claude -p` trong Bash tool không được khuyến nghị vì thiếu context sharing và inconsistent behavior.

Thông tin truyền vào sub-agent: **duy nhất kênh truyền** từ parent là prompt string của Agent tool. Parent phải include file paths, error messages, hay decisions trực tiếp trong prompt. Sub-agent trả về final message verbatim, parent có thể summarize.

*(Nguồn: https://code.claude.com/docs/en/sub-agents, https://platform.claude.com/docs/en/agent-sdk/subagents, https://github.com/anthropics/claude-code/issues/4182, https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)*

### Sub-agents hoạt động giống Skills ở nhiều điểm

Cả skills và sub-agents đều: (1) **đóng gói capabilities** invocable on demand, (2) **giúp quản lý context** qua isolation — skills dùng lazy loading, sub-agents dùng separate context, (3) **định nghĩa bằng markdown** với metadata mô tả, (4) **routing dựa trên description** — Claude match task với capability, (5) **giảm context bloat**, (6) **tái sử dụng** across sessions.

Khác biệt cốt lõi: skills hoạt động **trong** context chính (load on-demand), sub-agents có **context riêng**. Skills phù hợp cho single, well-defined capability. Sub-agents phù hợp cho complex, multi-step isolated workflows. **Hybrid pattern** mạnh nhất: skills inject VÀO sub-agents qua field `skills` — skill cung cấp expertise, sub-agent cung cấp context boundary.

*(Nguồn: https://towardsdatascience.com/claude-skills-and-subagents-escaping-the-prompt-engineering-hamster-wheel/, https://www.youngleaders.tech/p/claude-skills-commands-subagents-plugins)*

---

## Phần 4: So sánh cách load skills/plugins trên các nền tảng

### Claude Code: Progressive disclosure 3 tầng

Claude Code sử dụng hệ thống skills dựa trên filesystem. Skills là thư mục trong `.claude/skills/` chứa file `SKILL.md` với YAML frontmatter (name, description) và optional scripts/resources. Phát hiện tại startup bằng quét: `~/.claude/skills/`, `.claude/skills/`, plugins, built-in, và `--add-dir`.

**Progressive disclosure 3 tầng** là thiết kế then chốt:

- **Tầng 1 (startup, ~100 tokens/skill):** Chỉ YAML frontmatter — name + description. Cực kỳ hiệu quả token — hàng chục skills chỉ tốn vài trăm tokens
- **Tầng 2 (on-demand, <5K tokens):** Khi Claude xác định skill relevant, đọc toàn bộ SKILL.md từ filesystem qua bash
- **Tầng 3 (execution, unlimited):** Scripts chạy mà code không enter context — chỉ output. Reference files load chọn lọc

Invocation: qua `/skill-name` slash commands hoặc tự động bởi LLM reasoning. Không dùng algorithmic routing — LLM đọc danh sách `<available_skills>` và quyết định. Setting `disable-model-invocation: true` giữ skills hoàn toàn ngoài context cho đến khi user trigger thủ công. Skill descriptions có budget **2% context window** (fallback: 16,000 ký tự).

*(Nguồn: https://code.claude.com/docs/en/skills, https://mikhail.io/2025/10/claude-code-skills/, https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)*

### ChatGPT: Custom GPTs + tool_search (GPT-5.4)

ChatGPT đã trải qua evolution: Plugins (deprecated 9/4/2024) → Custom GPTs (từ cuối 2023) → GPT Actions → tool_search.

Custom GPTs bundle 3 nguồn context: (1) **System Instructions** (always loaded, max ~8,000 chars), (2) **Knowledge Files** (tối đa 20 files, dùng RAG-like retrieval), (3) **Actions** (OpenAPI 3.1.0 schemas, max 300 chars/endpoint description, 700 chars/parameter, payload dưới 100,000 chars).

**tool_search** trong API (GPT-5.4+) mang progressive disclosure đến OpenAI: `defer_loading: true` khiến model chỉ thấy name + description ban đầu. Full parameter schemas load khi cần. **Namespaces** nhóm related tools dưới 1 description. Tuy nhiên, Custom GPTs cho end-user **không** được hưởng tool_search — chỉ API developers.

*(Nguồn: https://developers.openai.com/api/docs/guides/tools-tool-search/, https://platform.openai.com/docs/actions/introduction, https://help.openai.com/en/articles/8554397-creating-a-gpt)*

### GitHub Copilot: Context đa tầng + semantic search

Copilot có 4 loại context: (1) **Editor Context** (file đang mở, vị trí cursor — always loaded, highest priority), (2) **Semantic Context** (vector embeddings qua remote/local index, tìm files relevant nhất), (3) **Custom Instructions** (`.github/copilot-instructions.md` global, `*.instructions.md` với `applyTo` patterns), (4) **Explicit Context** (`@file` references, `#codebase`, pasted content).

Auto-compaction kích hoạt tại **95% token limit** — nén history không blocking user. Token windows: 16K-128K tokens tùy model. Từ tháng 1/2026, Copilot CLI thêm custom agents (`.github/agents/*.agent.md`), Agent Skills, MCP integration, và Copilot Spaces cho project-specific context.

*(Nguồn: https://learn.microsoft.com/en-us/visualstudio/ide/copilot-context-overview, https://github.blog/changelog/2026-01-14-github-copilot-cli-enhanced-agents-context-management-and-new-ways-to-install/)*

### Bảng so sánh cross-platform

| Tiêu chí | Claude Code | ChatGPT | GitHub Copilot |
|-----------|------------|---------|----------------|
| Format chính | SKILL.md (Markdown + YAML) | OpenAPI schema + Instructions | .instructions.md + .agent.md |
| Lazy loading | Có — 3 tầng progressive disclosure | API only (tool_search, GPT-5.4+) | Partial — theo file pattern |
| Token overhead/skill | ~100 tokens/skill (metadata) | Full schema upfront (trừ khi deferred) | Instructions loaded khi pattern match |
| External APIs | MCP servers | GPT Actions (OpenAPI) + MCP | MCP servers + Extensions |
| User invocation | `/slash-commands` | Natural language only | `/` commands + `@` references |

**Claude Code hiệu quả token nhất** nhờ progressive disclosure. GitHub Copilot moderate nhờ semantic search và auto-compaction. ChatGPT ít hiệu quả nhất mặc định (load upfront), trừ khi dùng API tool_search.

Xu hướng hội tụ rõ rệt: cả 3 nền tảng đang converge về **deferred/lazy loading**, **MCP là universal protocol**, **markdown-based instruction files**, **sub-agent architectures**, và **auto-compaction**. SKILL.md format đang lan rộng thành cross-platform standard — OpenCode, Goose, và các agent khác đã adopt.

*(Nguồn: https://github.com/anthropics/skills, https://developers.redhat.com/articles/2026/03/10/agent-skills-explore-security-threats-and-controls)*

---

## Phần 5: Scaling lên 10.000+ skills — bài toán enterprise

### Bài toán số học không thể tránh

Phép tính đơn giản: **50 tokens/skill × 10,000 skills = 500,000 tokens** — gấp 2.5 lần context window 200K. Nhưng thực tế còn tệ hơn: dữ liệu thực cho thấy mỗi tool definition tốn **400-500 tokens**, nghĩa là 50 tools đã chiếm 20,000-25,000 tokens. GitHub MCP server (91 tools) tốn **~46,000 tokens**. Một developer report: 135 tools từ MCP_DOCKER tốn **125,964 tokens**.

Hậu quả không chỉ là hết context: (1) **chậm** — model phải đọc/xử lý mọi tool description, (2) **nhầm lẫn** — tool selection accuracy giảm, parameter hallucination tăng, (3) **đắt** — nhiều input tokens hơn = chi phí cao hơn. Các client hiện tại đã đặt giới hạn: Cursor cap 40 MCP tools, GitHub Copilot cap 128 MCP tools.

*(Nguồn: https://achan2013.medium.com/how-many-tools-functions-can-an-ai-agent-has-21e0a82b7847, https://github.com/orgs/modelcontextprotocol/discussions/532, https://www.atcyrus.com/stories/mcp-tool-search-claude-code-context-pollution-guide)*

### Pattern 1: Kiến trúc 3 lớp tool (Base + Toolkits + Tasks)

Một kỹ sư Samsung quản lý 35+ tools bằng 3 lớp: **Base Tools** (13 tools general, luôn ON), **Toolkits** (8 packs nhóm theo domain, load dynamic), **Tasks** (single tools kích hoạt per-request). "What's the weather?" chỉ load weather task. "Commit my code" chỉ load git tasks. Tiết kiệm tokens và cải thiện accuracy đáng kể.

*(Nguồn: https://dev.to/kim_namhyun_e7535f3dc4c69/designing-a-tool-architecture-for-ai-agents-base-tools-toolkits-and-dynamic-routing-fdo)*

### Pattern 2: General Skills + Skill Finder (meta-tool discovery)

Đây là pattern mạnh nhất cho scale lớn. Thay vì load tất cả skills, agent có 1 meta-tool `find_skill` để tìm và load skills on-demand.

**MCP Tool Search** của Anthropic (ship 14/1/2026) là implementation canonical: khi tool descriptions vượt 10K tokens, hệ thống defer loading và inject Tool Search tool. Claude search bằng keywords, chỉ **3-5 tools relevant (~3K tokens)** được load per query. Benchmark: **Opus 4 accuracy tăng từ 49% → 74%**, **Opus 4.5 từ 79.5% → 88.1%** khi dùng Tool Search.

**MCP Gateway & Registry** cung cấp `intelligent_tool_finder` — meta-tool dùng FAISS indexing và sentence transformers cho semantic matching. Workflow: (1) Discover: `intelligent_tool_finder("current time timezone")`, (2) nhận details về tool trên MCP server, (3) Invoke: `invoke_mcp_tool(registry_url, server_name, tool_name, args)`.

Một MCP Enhancement Proposal đề xuất **Hierarchical Tool Management**: methods `tools/categories` (list categories) và `tools/discover` (query by category/search), giảm từ 50+ active tools xuống 10-15 loaded tại 1 thời điểm, backward compatible 100% với MCP 1.0.

*(Nguồn: https://www.atcyrus.com/stories/mcp-tool-search-claude-code-context-pollution-guide, https://agentic-community.github.io/mcp-gateway-registry/dynamic-tool-discovery/, https://github.com/orgs/modelcontextprotocol/discussions/532)*

### Pattern 3: Tag/scope-based filtering theo team/department

Cho enterprise với nhiều phòng ban, lọc tools theo user roles/permissions/scope. Ví dụ: user thuộc team Payroll chỉ thấy 50 skills liên quan payroll thay vì 10,000 skills toàn công ty. Implementation: centralized tool registry với metadata tags (department, role, permission level) → khi session bắt đầu, query registry với user context → chỉ load tools matching scope.

Spring AI đang thảo luận pattern này: filter tools dựa trên OAuth grants — nếu user không có permission group B, disable toolB hoàn toàn thay vì để agent gọi rồi fail. Tiết kiệm tokens VÀ tránh error.

*(Nguồn: https://github.com/spring-projects/spring-ai/issues/4401, https://sparkco.ai/blog/enterprise-guide-to-dynamic-tool-loading-agents)*

### Pattern 4: Semantic search pre-filter

Dùng sentence-transformers embed tất cả tool descriptions vào vector DB. Khi user query đến, fast/cheap model tìm 3-5 tools relevant nhất qua semantic search, chỉ pass những tools đó cho main LLM. Scale đến hàng trăm tools mà context vẫn lean. Đây là approach được Paragon và nhiều framework khuyến nghị.

*(Nguồn: https://www.useparagon.com/learn/optimizing-tool-performance-and-scalability-for-your-ai-agent/, https://medium.com/@ashwindevelops/your-ai-agent-has-too-many-tools-a-simple-guide-to-making-it-smart-fast-and-reliable-f148f58834ab)*

### Tổng hợp: Pattern nào cho scale nào

| Pattern | Cách hoạt động | Scale phù hợp |
|---------|---------------|---------------|
| Semantic tool filtering | Embed descriptions, retrieve top-K | 100s tools |
| 3-layer architecture | Base + toolkits + tasks | 30-50 tools |
| MCP Tool Search | Lazy loading với BM25/regex | 50-200+ tools |
| Skill Finder meta-tool | Agent có `find_skill` search registry | 1,000s tools |
| Multi-agent orchestration | Specialized agents, mỗi agent có tool set riêng | 10K+ tools (distributed) |
| Centralized MCP Registry | Gateway route đến tools đúng per agent | Enterprise scale |

---

## Phần 6: Dynamic sub-agent loading — giữ context chính sạch khi cần nhiều agents

### Bài toán tương tự skills

Giống như không thể load 10K skills, cũng không thể define hàng trăm sub-agent types trong context. Giải pháp: **dynamic agent loading** theo cùng patterns đã dùng cho tools.

Claude Code đã hỗ trợ: custom agents trong `.claude/agents/` với YAML frontmatter (name, description, tools, model, skills, permissionMode). Chỉ **description** load vào context — agent body load khi cần. `--init` flag cho phép load context khác nhau per session: `claude --init "/blog"` load blog-specific agents.

*(Nguồn: https://code.claude.com/docs/en/sub-agents, https://claudefa.st/blog/guide/mechanics/claude-code-session-context)*

### Kiến trúc orchestration tiên tiến (2025-2026)

**Microsoft Multi-agent Reference Architecture** định nghĩa: **Agent Registry Pattern** — agents đăng ký với descriptors (capabilities, tags, embeddings), registry hỗ trợ runtime resolution. **Handoff Orchestration** — delegation động khi optimal agent chưa biết trước. **Concurrent Orchestration** — chọn agents từ registry dựa trên task requirements.

**AWS Arbiter Pattern** mang đến khái niệm mạnh: **Semantic Capability Matching** — reason về loại agent NÊN tồn tại, dù chưa có. **Delegated Agent Creation** — nếu không tìm thấy agent phù hợp, Fabricator agent **tự động tạo agent mới** on demand. Biến static orchestration thành adaptive coordination.

**Alibaba Configuration-Driven Architecture** dùng AI Registry (Prompt Center, MCP Registry, Sub Agent Registry) cho complete decoupling. A2A protocol cho inter-agent communication bằng logical names. Agent Capability Directory — tất cả agents đã đăng ký browsable như "app store".

*(Nguồn: https://microsoft.github.io/multi-agent-reference-architecture/docs/reference-architecture/Patterns.html, https://aws.amazon.com/blogs/devops/multi-agent-collaboration-with-strands/, https://www.alibabacloud.com/blog/configuration-driven-dynamic-agent-architecture-network-achieving-efficient-orchestration-dynamic-updates-and-intelligent-governance_602564)*

---

## Phần 7: Knowledge base, RAG, và context window

### Knowledge base nhỏ vs lớn: hai chiến lược khác nhau

Nếu knowledge base dưới **~200,000 tokens (~500 trang)**, Anthropic khuyến nghị **load toàn bộ** vào prompt kết hợp prompt caching. Đây là cách đơn giản và chính xác nhất. Claude projects tự động chuyển sang RAG mode khi knowledge vượt context window, mở rộng capacity lên **gấp 10 lần**.

Cho knowledge base lớn hơn, **RAG** là bắt buộc: chunk documents → embed thành vectors → lưu vector DB → retrieve relevant chunks khi query → inject vào prompt. Chỉ một phần nhỏ knowledge base chiếm context window tại bất kỳ thời điểm nào, nhưng chất lượng phụ thuộc hoàn toàn vào retrieval accuracy.

*(Nguồn: https://support.claude.com/en/articles/11473015-retrieval-augmented-generation-rag-for-projects, https://www.anthropic.com/news/contextual-retrieval)*

### Contextual Retrieval: cải tiến RAG từ Anthropic

RAG truyền thống phá hỏng context khi chunking. Ví dụ: chunk "The company's revenue grew by 3% over the previous quarter" — không biết công ty nào, quarter nào. **Contextual Retrieval** (phát hành 19/9/2024) fix bằng cách prepend context giải thích vào mỗi chunk trước khi embedding:

*Contextualized:* "This chunk is from an SEC filing on ACME corp's performance in Q2 2023; the previous quarter's revenue was $314 million. The company's revenue grew by 3% over the previous quarter."

Kết quả benchmark ấn tượng: Contextual Embeddings giảm **35% retrieval failure**. Kết hợp Contextual BM25 giảm **49%**. Thêm reranking giảm **67%**. Chi phí one-time contextualization chỉ **$1.02/triệu document tokens** nhờ prompt caching.

Anthropic test 5, 10, và 20 chunks inject vào context: **20 chunks** performant nhất — nhiều chunks hơn tăng xác suất include thông tin relevant, nhưng có giới hạn thực tế vì quá nhiều thông tin có thể "distracting" cho model.

*(Nguồn: https://www.anthropic.com/news/contextual-retrieval)*

### Chunking strategies ảnh hưởng trực tiếp đến context

Nghiên cứu NVIDIA cho guidance cụ thể: **factoid queries** (tên, ngày, số liệu): 256-512 tokens optimal. **Analytical queries** (giải thích, so sánh): 1,024+ tokens cần thiết. **Page-level chunking** cho performance nhất quán nhất. Điểm khởi đầu chung: recursive character text splitting ở 200-400 tokens với minimal overlap.

Các kỹ thuật tiên tiến: **Semantic chunking** (dùng embeddings phát hiện topic boundaries — recall cao hơn nhưng đắt hơn), **LLM-based chunking** (LLM quyết định điểm chia — mạnh nhất nhưng tốn nhất), **Late chunking** (chạy toàn bộ document qua transformer trước, rồi áp chunk boundaries sau — cải thiện retrieval), **Agentic chunking** (AI agents chọn strategy động per section), **Hierarchical chunking** (parent-child cho multi-granularity retrieval).

*(Nguồn: https://developer.nvidia.com/blog/finding-the-best-chunking-strategy-for-accurate-ai-responses/, https://www.datacamp.com/blog/chunking-strategies)*

### Dynamic knowledge loading trong production

Pattern production-ready: kết hợp prompt caching + RAG + scope filtering. Tool definitions (static) → cache. Knowledge chunks (dynamic per query) → RAG retrieve top-K. User permissions → scope filter cả tools lẫn knowledge. Context compaction (beta cho Opus 4.6) → tự động summarize older context khi approaching limits. Context awareness (Sonnet 4.6/4.5, Haiku 4.5) → models track remaining token budget qua `<budget:token_budget>` tags, cập nhật sau mỗi tool call.

*(Nguồn: https://platform.claude.com/docs/en/build-with-claude/context-windows, https://platform.claude.com/docs/en/build-with-claude/compaction)*

---

## Kết luận: Từ primitive đến hệ thống — những insight then chốt

Context engineering — không phải prompt engineering — đang trở thành discipline cốt lõi năm 2026. Andrej Karpathy định nghĩa: *"The delicate art and science of filling the context window with just the right information for the next step."* Survey LangChain cuối 2025 cho thấy **57% respondents đã có agents trong production**, với context management at scale là thách thức hàng đầu.

Ba nguyên tắc vàng nổi lên từ nghiên cứu này. **Thứ nhất, progressive disclosure là design pattern phổ quát** — từ Claude Code skills (metadata → SKILL.md → resources) đến OpenAI tool_search (name → schema) đến MCP Tool Search (index → full definitions). Mọi platform thành công đều converge về load ít trước, load thêm khi cần. **Thứ hai, isolation là chiến lược context management hiệu quả nhất** — sub-agents với context riêng, RAG retrieve chỉ chunks relevant, scope-based filtering theo team. Không gì bảo vệ main context tốt bằng không cho data vào đó. **Thứ ba, token economics quyết định kiến trúc** — prompt caching giảm 90% chi phí, tool search giảm 85% context consumption, sub-agents prevent context bloat. Hiểu cách tokens được đếm và tính phí là prerequisite cho mọi quyết định thiết kế.

Điều chưa được giải quyết hoàn toàn: delegation chỉ 1 level deep trong Claude Code là hạn chế thực sự cho enterprise workflows phức tạp. MCP hierarchical tool management vẫn là proposal. Cross-platform skill interoperability đang ở giai đoạn sơ khai dù SKILL.md đang lan rộng. Đây là những vấn đề mở cho community tiếp tục phát triển.