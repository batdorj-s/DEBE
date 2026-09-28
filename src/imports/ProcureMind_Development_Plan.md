# ProcureMind (Шилэн Хангамж AI): Бүрэн хөгжүүлэлтийн төлөвлөгөө

**Баг:** 10-р баг | **Формат:** Хакатоны 24 цагийн Sprint | **Хувилбар:** v2 (шинэчилсэн)

---

## 1. Төслийн товч танилцуулга

### 1.1 Асуудал
- Байгууллагын худалдан авалт гар аргаар явагддаг: үнэ харьцуулах, төсөв шалгах, зөвшөөрөл авах нь удаан, алдаатай.
- Нягтлан бодогч банкны хуулга болон И-баримтыг (НӨАТ) гараар тулгахад олон цаг зарцуулдаг.

### 1.2 Шийдэл
ProcureMind нь хоёр гол үнэ цэнийг нэг системд нэгтгэнэ:
1. **AI худалдан авалтын туслах:** Монгол текстээр хүсэлт авч, нийлүүлэгчийн каталогоос хамгийн хямд үнийг олж, төсөв шалгаад, зөвшөөрлийн карт гаргана.
2. **НӨАТ автомат тулгалт:** Банкны хуулга болон И-баримтыг олон шатлалт алгоритмаар тулгаж, өнгөөр тэмдэглэсэн Excel тайлан гаргана.

### 1.3 Амжилтын шалгуур (Definition of Done)
- [ ] Чатад "Маркетингт 10 кофе хэрэгтэй" гэж бичихэд 10 секундэд үнийн саналын карт гарна.
- [ ] Төсөв хүрэлцэхгүй бол агент татгалзаж шалтгаанаа тайлбарлана.
- [ ] "Зөвшөөрөх" товч дарахад захиалга `approved` төлөвт шилжинэ.
- [ ] Банкны хуулга + И-баримт upload хийхэд Excel (ногоон/шар/улаан) татагдана.
- [ ] Dashboard дээр 2 график (төсөв, тулгалтын амжилт) харагдана.
- [ ] Демо 3 минутад, үргэлжлүүлэн 10 удаа алдаагүй ажиллана.

---

## 2. Хамрах хүрээ (Scope)

| Түвшин | Агуулга |
|---|---|
| **MUST (заавал)** | Чат + 1 агент, 3 tool, төсөв шалгалт, зөвшөөрлийн карт, тулгалтын API, Excel export |
| **SHOULD (боломжтой бол)** | Dashboard (mock data), audit log, skeleton/animation |
| **COULD (цаг үлдвэл)** | MCP server, олон агент (Supervisor/Auditor), бодит И-баримт формат |
| **WON'T (хийхгүй)** | Бодит банкны API, нэвтрэлт/эрх, олон хэлний дэмжлэг |

---

## 3. Архитектур (хялбаршуулсан)

```
┌──────────────────────────────────────────────────────────┐
│ 1. UI: Next.js (Tailwind + shadcn/ui + Recharts)         │
│   [Chat + Approval Card] [Dashboard] [НӨАТ Тулгалт]      │
└──────┬─────────────────┬──────────────────┬──────────────┘
       │ POST /api/chat  │ GET /api/stats   │ POST /api/reconcile
       ▼                 ▼                  ▼
┌─────────────────────────────┐   ┌──────────────────────────┐
│ 2a. Agent Service           │   │ 2b. Finance API          │
│ (Node/TS + LangGraph)       │   │ (FastAPI + Python)       │
│ Agent nodes:                │   │ - Statement parser       │
│  understand → search →      │   │ - E-Barimt parser        │
│  budget check → quote       │   │ - Matching engine        │
│ Tools:                      │   │   (RapidFuzz)            │
│  search_supplier_products   │   │ - Excel exporter         │
│  check_budget               │   └────────────┬─────────────┘
│  create_order               │                │
└──────────────┬──────────────┘                │
               ▼                               ▼
┌──────────────────────────────────────────────────────────┐
│ 3. DATA: PostgreSQL (Supabase) нэг бааз                  │
│  suppliers, products, budgets, orders (state jsonb),     │
│  audit_logs, bank_transactions, ebarimt, match_results   │
└──────────────────────────────────────────────────────────┘
```

**Гол шийдвэрүүд**
- **Нэг бааз (PostgreSQL/Supabase).** Агентын state-ийг `orders.state` (jsonb) баганад хадгална. Хоёр бааз тохируулах цагийг хэмнэнэ.
- **Эхлээд 1 агент + 3 tool.** UI дээр "Procurement / Finance / Auditor" гэж нэг graph-ийн node-уудыг нэрлэж харуулж болно.
- **MCP нь optional.** Эхлээд энгийн function tool. Цаг үлдвэл `search_supplier_products`-ийг MCP server болгон боож "MCP ашигласан" гэж харуулна.

---

## 4. Технологийн сонголт

| Хэсэг | Сонголт | Нөөц (fallback) |
|---|---|---|
| Frontend | Next.js (баг мэддэг хамгийн тогтвортой хувилбар), Tailwind, shadcn/ui, Recharts | Vite + React |
| Agent | LangGraph (TS) эсвэл энгийн tool-calling loop | Шууд LLM function calling |
| LLM | Gemini API (үндсэн) | Groq (нөөц), 2-3 API key |
| Finance API | FastAPI, pandas, openpyxl, RapidFuzz | - |
| DB | Supabase PostgreSQL | Локал Postgres (Docker) |
| Deploy | Локал + ngrok / Vercel | Screen recording |

---

## 5. Өгөгдлийн загвар

```sql
CREATE TABLE departments (id serial PRIMARY KEY, name text);
CREATE TABLE budgets (
  id serial PRIMARY KEY, department_id int REFERENCES departments(id),
  category text, total numeric, spent numeric DEFAULT 0
);
CREATE TABLE suppliers (id serial PRIMARY KEY, name text, reg_no text);
CREATE TABLE products (
  id serial PRIMARY KEY, supplier_id int REFERENCES suppliers(id),
  name text, category text, unit text, price numeric, stock int
);
CREATE TABLE orders (
  id serial PRIMARY KEY, department_id int, product_id int, qty int,
  total numeric, status text,  -- draft | waiting_for_approval | approved | rejected
  state jsonb, created_at timestamptz DEFAULT now()
);
CREATE TABLE audit_logs (
  id serial PRIMARY KEY, actor text, action text, payload jsonb,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE bank_transactions (
  id serial PRIMARY KEY, tx_date date, amount numeric,
  description text, counterparty text
);
CREATE TABLE ebarimt (
  id serial PRIMARY KEY, ddtd text, issue_date date,
  amount numeric, seller_name text, seller_reg text
);
CREATE TABLE match_results (
  id serial PRIMARY KEY, bank_tx_id int, ebarimt_id int,
  tier int, score numeric, status text  -- matched | review | unmatched
);
```

**Seed өгөгдөл:** 3 нийлүүлэгч, 8-10 бараа (кофе, цаас А4, үзэг, тонер...), 3 хэлтэс (Маркетинг, IT, Санхүү) тус бүрд төсөв. Нэг хэлтсийн төсвийг зориуд бага байлгаж "төсөв хүрэхгүй" кэйсийг харуулна.

---

## 6. API гэрээ (Contract): 1-р цагт тохирно

### POST `/api/chat`
```json
// Request
{ "session_id": "abc", "message": "Маркетингт 10 кофе хэрэгтэй", "department_id": 1 }

// Response
{
  "reply": "Хамгийн хямд санал олдлоо.",
  "card": {
    "type": "quote",
    "order_id": 42,
    "items": [{ "product": "Кофе 3in1", "supplier": "ITStore", "qty": 10, "unit_price": 9500, "total": 95000 }],
    "budget": { "remaining_before": 400000, "remaining_after": 305000, "ok": true },
    "actions": ["approve", "reject"]
  },
  "steps": ["Хүсэлт ойлгов", "Каталог хайв", "Төсөв шалгав"]
}
```

### POST `/api/orders/{id}/approve`
```json
{ "status": "approved" }
```

### POST `/api/reconcile` (multipart: `statement`, `ebarimt`)
```json
{
  "summary": { "total": 30, "matched": 22, "review": 5, "unmatched": 3 },
  "rows": [{ "bank_tx_id": 1, "ebarimt_id": 7, "tier": 2, "score": 96, "status": "matched" }],
  "excel_url": "/api/reconcile/download/xyz.xlsx"
}
```

### GET `/api/stats`
```json
{ "budget_by_dept": [{ "dept": "Маркетинг", "total": 500000, "spent": 195000 }],
  "reconcile": { "matched": 22, "review": 5, "unmatched": 3 } }
```

**Frontend нь эхэндээ эдгээр JSON-г mock хэлбэрээр буцаадаг stub-тай ажиллаж эхэлнэ.**

---

## 7. Агентын дизайн

### 7.1 Урсгал (graph)
```
[Parse request] → [search_supplier_products] → [check_budget]
      → (ok?) → [create_order: waiting_for_approval] → [Quote card]
      → (not ok) → [Reject with explanation + suggest alternatives]
```

### 7.2 Tools
| Tool | Оролт | Гаралт |
|---|---|---|
| `search_supplier_products` | `query`, `category?` | Үнээр эрэмбэлсэн жагсаалт |
| `check_budget` | `department_id`, `category`, `amount` | `ok`, `remaining` |
| `create_order` | `department_id`, `product_id`, `qty` | `order_id`, status |

Бүх tool дуудлага `audit_logs`-д бичигдэнэ (харагдахуйц Auditor функц).

### 7.3 Prompt зарчим
- System prompt: "Чи Монгол хэлээр ажилладаг худалдан авалтын туслах. Заавал tool ашигла, үнийг өөрөө бүү зохио."
- Few-shot 5-6 жишээ: "10 хайрцаг А4 цаас", "5 кофе, 2 үзэг", "хамгийн хямд тонер".
- Гаралтыг structured JSON schema-аар баталгаажуул (тоо хэмжээ, барааны нэр).

---

## 8. НӨАТ тулгалтын алгоритм (6 шатлал)

Гүйлгээ бүрийг дээрээс доош шатлалаар шалгаж, эхэлж таарсан шатанд зогсоно.

| Шат | Дүрэм | Статус | Өнгө |
|---|---|---|---|
| 1 | ДДТД гүйлгээний утганд яг байна + дүн яг таарна | Matched | Ногоон |
| 2 | Дүн яг таарна + огноо ±1 хоног + нэр fuzzy ≥ 85 | Matched | Ногоон |
| 3 | Гүйлгээний утга ↔ борлуулагчийн нэр `token_set_ratio` ≥ 80 + дүн яг таарна | Matched | Ногоон |
| 4 | Дүн ±1% + огноо ±3 хоног + нэр fuzzy ≥ 70 | Review | Шар |
| 5 | Нэг ДДТД-д олон гүйлгээ (хэсэгчилсэн төлбөр) нийлбэр таарна | Review | Шар |
| 6 | Юу ч таарсангүй | Unmatched | Улаан |

**Хэрэгжүүлэлтийн санаа**
```python
from rapidfuzz import fuzz

def match(tx, receipts):
    for r in receipts:
        if r.ddtd in tx.description and tx.amount == r.amount:
            return r, 1, 100
    # 2..5 шатууд дараалан...
    return None, 6, 0
```

**Тест өгөгдөл:** 30 гүйлгээ бэлд.
- 15 ойлгомжтой (шат 1-2)
- 6 нэр буруу бичигдсэн (шат 3)
- 4 дүн бага зэрэг зөрсөн (шат 4)
- 2 хэсэгчилсэн төлбөр (шат 5)
- 3 огт таарахгүй (шат 6)

**Excel:** 3 sheet (Тулгасан, Хянах, Тулгагдаагүй) + нийт дүнгийн summary. Мөр бүр статусынхаа өнгөөр будагдана (openpyxl `PatternFill`).

---

## 9. 24 цагийн хуваарь (buffer-тэй)

| Цаг | Үе шат | Hacker 1 (AI) | Hacker 2 (Backend) | Hacker 3 (Frontend/Pitch) |
|---|---|---|---|---|
| 0-3 | Setup | Repo, LLM key-үүд, Монгол prompt тест | Supabase, схем, seed | Next.js skeleton, mock chat, API contract-ийг батлах |
| 3-9 | AI Core | Agent graph, 3 tool, төлөв хадгалах | `/api/orders`, `/api/stats`, тулгалтын parser | Chat UI, Quote card, Approve товч |
| 9-15 | Тулгалт | Audit log, алдааны боловсруулалт | 6 шатлалт алгоритм, Excel export | Upload UI, үр дүнгийн хүснэгт |
| 15-18 | Интеграци | Frontend-тэй холбох | Frontend-тэй холбох | Dashboard (Recharts), skeleton, animation |
| **18** | **FEATURE FREEZE** | | | |
| 18-21 | Тест | E2E тест, prompt засвар | Bug fix, гүйцэтгэл | Pitch скрипт, слайд |
| 21-23 | Демо бэлтгэл | Fallback (mock mode) | Backup бичлэг | 3 минутын сургуулилт (таймертай) |
| 23-24 | Buffer | Зөвхөн эцсийн шалгалт, шинэ код бичихгүй | | |

**Дүрэм:** Аль нэг үе шат 1.5 цагаас илүү хоцорвол scope-оос COULD зүйлийг хас.

---

## 10. Багийн үүрэг

**Hacker 1: AI & Agent Engineer**
- LangGraph, tool-ууд, prompt, Монгол хэлний чанар.
- Үр дүн: агент хамгийн хямд үнийг зөв олж, төсвийг зөв шалгана.

**Hacker 2: Data & Backend Engineer**
- Схем, seed, FastAPI, тулгалтын алгоритм, Excel.
- Үр дүн: 30 гүйлгээний тест дээр 6 шатыг зөв ажиллуулна.

**Hacker 3: Frontend & Pitch Lead**
- UI, Dashboard, UX, pitch.
- Үр дүн: цэвэрхэн дизайн, ямар ч үед spinner/loader харагдана, 3 минутын яриа бэлэн.

**Хамтарсан:** Бүгд өдөр тутам 2 цаг тутамд 5 минутын sync хийнэ. Git: `main` + богино branch, цаг тутамд commit.

---

## 11. Тест ба чанарын шалгалт

- [ ] Монгол 10 өөр хүсэлтээр агентыг шалгах (нэг/олон бараа, буруу бичиг, хэт том тоо).
- [ ] Төсөв хүрэхгүй кэйс 3 удаа.
- [ ] Тулгалт 30 гүйлгээ дээр, Excel-ийн өнгө зөв эсэх.
- [ ] Хоосон файл, буруу формат upload хийхэд ойлгомжтой алдаа гарах.
- [ ] Гар утасны hotspot дээр бүтэн урсгал.
- [ ] Бүтэн E2E урсгалыг 10 удаа алдаагүй.

---

## 12. Эрсдэл ба сэргийлэлт

| Эрсдэл | Магадлал | Сэргийлэлт |
|---|---|---|
| LLM rate limit / унах | Өндөр | 2-3 API key, Groq fallback, **mock mode** (урьдчилан бичсэн хариулт) |
| Wi-Fi тасрах | Өндөр | Hotspot, локал Postgres нөөц, screen recording |
| Монгол хэлний муу ойлголт | Дунд | Few-shot жишээ, structured output, хүсэлтийн загвар товчлуур |
| Алгоритм цагаа хэтрүүлэх | Дунд | Эхлээд шат 1-3, дараа нь 4-6 |
| Агент төвөгтэй болох | Дунд | Нэг агент + tool, олон агентыг зөвхөн UI дээр нэрлэх |
| Integration хоцрох | Өндөр | 1-р цагт API contract, frontend stub |

**Fail-safe (mock mode):** `.env`-д `DEMO_MODE=true` тохируулахад LLM дуудахгүйгээр урьдчилан бэлдсэн 3 хүсэлтэд хариулдаг болго. Демон үед интернет тасарсан ч системийг харуулж чадна.

---

## 13. 3 минутын демо скрипт

| Хугацаа | Агуулга |
|---|---|
| 0:00-0:30 | **Асуудал:** "Байгууллага худалдан авалтад хэдэн цаг, нягтлан тулгалтад хэдэн цаг зарцуулдаг вэ?" (бодит тоо бэлд) |
| 0:30-1:30 | **Демо 1:** Маркетингийн менежер "10 кофе хэрэгтэй" гэж бичнэ → агент хайж, төсөв шалгаж, карт гарна → "Зөвшөөрөх" дарна |
| 1:30-2:00 | **Демо 2:** Төсөв хүрэхгүй тохиолдол, агент татгалзаж, хямд хувилбар санал болгоно |
| 2:00-2:40 | **Демо 3:** Нягтлан банкны хуулга + И-баримт upload хийнэ → 30 гүйлгээ секундэд тулгагдаж, ногоон/шар/улаан Excel татагдана |
| 2:40-3:00 | **Дүгнэлт:** Dashboard, үнэ цэнэ (хэмнэсэн цаг), цаашдын алхам |

**Заавар:** Нэг "happy path" түүхийг төгс болго. Бичлэг заавал бэлд. Шүүгчийн асуултад бэлэн тоо хэрэгтэй.

---

## 14. Хакатоны дараах (Roadmap)

1. Бодит НӨАТ (ebarimt.mn) болон банкны хуулгын формат дэмжих.
2. Олон агент (Supervisor, Auditor) бүрэн хэрэгжүүлэх, MCP-ээр нийлүүлэгчийн каталог холбох.
3. Эрх, нэвтрэлт, олон байгууллага (multi-tenant).
4. Зөвшөөрлийн олон шатлал, и-мэйл/Slack мэдэгдэл.

---

## 15. Эхний 1 цагийн checklist

- [ ] GitHub repo үүсгэж 3 хүнд эрх өгөх
- [ ] Supabase төсөл, `.env` хуваалцах
- [ ] Gemini + Groq API key бэлдэх (2-3 акаунт)
- [ ] API contract (6-р хэсэг) батлах
- [ ] Монгол prompt-ыг 5 хүсэлтээр туршиж үзэх
- [ ] Hotspot тохируулж, багийн бүх гишүүн шалгах
