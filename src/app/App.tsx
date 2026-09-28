import { useState, useRef, useEffect } from "react";
import {
  MessageSquare,
  ShieldCheck,
  LayoutDashboard,
  ClipboardList,
  Send,
  Upload,
  Download,
  AlertTriangle,
  TrendingDown,
  Brain,
  ShoppingCart,
  Calculator,
  Loader2,
  Check,
  X,
  FileText,
  Bot,
  User,
  Bell,
  Settings,
  Activity,
  Zap,
  Shield,
  Search,
  Banknote,
} from "lucide-react";
import { buildNoatWorkbook } from "@/lib/noatWorkbook";
import { downloadBlob } from "@/lib/xlsx";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

// ── Types ─────────────────────────────────────────────────────────────────────
type Tab = "ask" | "noat" | "dashboard" | "audit";
type AgentStatus = "idle" | "processing" | "done";
type NOATStatus = "matched" | "partial" | "unmatched";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const fmt = (n: number) => `${n.toLocaleString()}₮`;

/** Budget usage color, keyed to the shared status-state tokens. */
const budgetColor = (usedPct: number) =>
  usedPct > 0.85
    ? "var(--state-unmatched)"
    : usedPct > 0.65
      ? "var(--state-partial)"
      : "var(--state-info)";

type UserRole = "viewer" | "analyst" | "admin";
const DEPT_DATA = [
  { id: 1, name: "IT хэлтэс",  budget: 2800000, spent: 500000 },
  { id: 2, name: "Маркетинг",  budget: 500000,  spent: 455000 },
  { id: 3, name: "Санхүү",     budget: 1200000, spent: 780000 },
];

// ── Mock Data ─────────────────────────────────────────────────────────────────
const BUDGET_DATA = [
  { dept: "IT", budget: 5500, actual: 3200 },
  { dept: "HR", budget: 2000, actual: 1800 },
  { dept: "Маркетинг", budget: 3000, actual: 2400 },
  { dept: "Санхүү", budget: 1500, actual: 900 },
  { dept: "Үйл.аж", budget: 4000, actual: 3600 },
];

const PRICE_COMPARISON = [
  { supplier: "ITStore Mongolia", paper: 65000, coffee: 42000, total: 107000, best: true },
  { supplier: "OfficeWorld МН", paper: 72000, coffee: 38000, total: 110000, best: false },
  { supplier: "MonSupply ХХК", paper: 59000, coffee: 48000, total: 107000, best: false },
];

const NOAT_RESULTS: {
  id: string; date: string; supplier: string; amount: number;
  ddtd: string | null; status: NOATStatus; score: number; tier: number;
}[] = [
  // Tier 1–2: exact / triple-verify matches (15 rows)
  { id: "TX001", date: "2025-01-20", supplier: "ITStore Mongolia",  amount: 107000, ddtd: "МТ-2025-001847", status: "matched",   score: 100, tier: 1 },
  { id: "TX002", date: "2025-01-19", supplier: "OfficeWorld МН",    amount: 245000, ddtd: "МТ-2025-001752", status: "matched",   score:  99, tier: 1 },
  { id: "TX003", date: "2025-01-18", supplier: "MonSupply ХХК",     amount: 320000, ddtd: "МТ-2025-001623", status: "matched",   score:  98, tier: 2 },
  { id: "TX004", date: "2025-01-17", supplier: "BuildMat ХХК",      amount: 456000, ddtd: "МТ-2025-001580", status: "matched",   score: 100, tier: 1 },
  { id: "TX005", date: "2025-01-16", supplier: "ITStore Mongolia",  amount:  89500, ddtd: "МТ-2025-001441", status: "matched",   score:  97, tier: 2 },
  { id: "TX006", date: "2025-01-15", supplier: "StationeryCo МН",   amount: 125000, ddtd: "МТ-2025-001380", status: "matched",   score:  99, tier: 1 },
  { id: "TX007", date: "2025-01-14", supplier: "PrinterHub МН",     amount:  78000, ddtd: "МТ-2025-001312", status: "matched",   score:  98, tier: 2 },
  { id: "TX008", date: "2025-01-13", supplier: "MonSupply ХХК",     amount: 195000, ddtd: "МТ-2025-001250", status: "matched",   score: 100, tier: 1 },
  { id: "TX009", date: "2025-01-12", supplier: "OfficeWorld МН",    amount: 342000, ddtd: "МТ-2025-001198", status: "matched",   score:  97, tier: 2 },
  { id: "TX010", date: "2025-01-11", supplier: "BuildMat ХХК",      amount:  67500, ddtd: "МТ-2025-001145", status: "matched",   score:  96, tier: 1 },
  { id: "TX011", date: "2025-01-10", supplier: "ITStore Mongolia",  amount: 288000, ddtd: "МТ-2025-001089", status: "matched",   score:  99, tier: 2 },
  { id: "TX012", date: "2025-01-09", supplier: "StationeryCo МН",   amount:  54000, ddtd: "МТ-2025-001034", status: "matched",   score:  98, tier: 1 },
  { id: "TX013", date: "2025-01-08", supplier: "PrinterHub МН",     amount: 182000, ddtd: "МТ-2025-000978", status: "matched",   score: 100, tier: 1 },
  { id: "TX014", date: "2025-01-07", supplier: "MonSupply ХХК",     amount: 415000, ddtd: "МТ-2025-000923", status: "matched",   score:  97, tier: 2 },
  { id: "TX015", date: "2025-01-06", supplier: "OfficeWorld МН",    amount:  93000, ddtd: "МТ-2025-000867", status: "matched",   score:  96, tier: 2 },
  // Tier 3: token_set_ratio ≥ 80 – typo / alternate name (6 rows)
  { id: "TX016", date: "2025-01-20", supplier: "IT Store MN",       amount: 155000, ddtd: "МТ-2025-001823", status: "matched",   score:  91, tier: 3 },
  { id: "TX017", date: "2025-01-19", supplier: "OficeWorld",        amount:  78500, ddtd: "МТ-2025-001769", status: "matched",   score:  87, tier: 3 },
  { id: "TX018", date: "2025-01-17", supplier: "Mon Supply",        amount: 234000, ddtd: "МТ-2025-001598", status: "matched",   score:  89, tier: 3 },
  { id: "TX019", date: "2025-01-15", supplier: "BuildMaterial",     amount: 112000, ddtd: "МТ-2025-001367", status: "matched",   score:  84, tier: 3 },
  { id: "TX020", date: "2025-01-13", supplier: "Stationery Co",     amount:  67000, ddtd: "МТ-2025-001231", status: "matched",   score:  88, tier: 3 },
  { id: "TX021", date: "2025-01-11", supplier: "PrinterHUB",        amount: 345000, ddtd: "МТ-2025-001102", status: "matched",   score:  82, tier: 3 },
  // Tier 4: dүн ±1% – amount tolerance (4 rows)
  { id: "TX022", date: "2025-01-18", supplier: "GlobalChem LLC",    amount:  89500, ddtd: null,              status: "partial",   score:  76, tier: 4 },
  { id: "TX023", date: "2025-01-16", supplier: "TechParts MN",      amount: 175500, ddtd: null,              status: "partial",   score:  73, tier: 4 },
  { id: "TX024", date: "2025-01-14", supplier: "GlobalChem LLC",    amount: 234800, ddtd: null,              status: "partial",   score:  78, tier: 4 },
  { id: "TX025", date: "2025-01-12", supplier: "TechParts MN",      amount:  67200, ddtd: null,              status: "partial",   score:  71, tier: 4 },
  // Tier 5: хэсэгчилсэн төлбөр – split payment (2 rows)
  { id: "TX026", date: "2025-01-10", supplier: "MonSupply ХХК",     amount: 150000, ddtd: null,              status: "partial",   score:  65, tier: 5 },
  { id: "TX027", date: "2025-01-08", supplier: "ITStore Mongolia",  amount:  85000, ddtd: null,              status: "partial",   score:  63, tier: 5 },
  // Tier 6: no match (3 rows)
  { id: "TX028", date: "2025-01-20", supplier: "UNKNOWN VENDOR",    amount: 156000, ddtd: null,              status: "unmatched", score:   0, tier: 6 },
  { id: "TX029", date: "2025-01-17", supplier: "Gazar Company",     amount:  88000, ddtd: null,              status: "unmatched", score:   0, tier: 6 },
  { id: "TX030", date: "2025-01-15", supplier: "Холбоо ХХК",        amount:  42000, ddtd: null,              status: "unmatched", score:   0, tier: 6 },
];

/**
 * Single source of truth for every transaction count shown in the UI and in
 * the exported workbook. Derived from NOAT_RESULTS so the stats bar, the
 * donut, the KPI card and the audit log can never drift apart.
 */
const NOAT_SUMMARY = (() => {
  const total = NOAT_RESULTS.length;
  const count = (status: NOATStatus) => NOAT_RESULTS.filter((r) => r.status === status).length;
  const matched = count("matched");
  const partial = count("partial");
  const unmatched = count("unmatched");
  const pct = (n: number) => (total === 0 ? 0 : (n / total) * 100);
  return {
    total,
    matched,
    partial,
    unmatched,
    matchedPct: pct(matched),
    partialPct: pct(partial),
    unmatchedPct: pct(unmatched),
  };
})();

const VAT_PIE_DATA = [
  { name: "Тулгарсан", value: NOAT_SUMMARY.matched, color: "var(--state-matched)" },
  { name: "Хэсэгчлэн", value: NOAT_SUMMARY.partial, color: "var(--state-partial)" },
  { name: "Тулгараагүй", value: NOAT_SUMMARY.unmatched, color: "var(--state-unmatched)" },
];

const fmtPct = (value: number) => `${value.toFixed(1)}%`;

const NOAT_STEPS = [
  { step: 1, name: "ДДТД Exact Match", code: "exact_match(дугаар)" },
  { step: 2, name: "Регистр + Огноо + Дүн", code: "triple_verify()" },
  { step: 3, name: "±5₮ / ±1 Өдөр Tolerance", code: "tolerance_check(5, 1)" },
  { step: 4, name: "1:N Нэгтгэл", code: "aggregate_1N()" },
  { step: 5, name: "AI Fuzzy Match", code: "rapidfuzz(threshold=0.85)" },
  { step: 6, name: "Classification + Balance", code: "balance_gate(дансны үлдэгдэл)" },
];

const AUDIT_LOG = [
  { id: 1, time: "14:32", date: "2025-01-20", user: "Б. Мөнхбаяр", action: "Худалдан авалт баталгаажуулав", detail: "ITStore · 107,000₮", type: "approval" as const },
  { id: 2, time: "14:28", date: "2025-01-20", user: "Procurement Agent", action: "Үнийн харьцуулалт дуусав", detail: "3 нийлүүлэгч · ITStore хамгийн хямд", type: "agent" as const },
  { id: 3, time: "14:27", date: "2025-01-20", user: "Finance Agent", action: "Төсөв баталгаажсан", detail: "IT · 2,300,000₮ үлдэгдэл", type: "agent" as const },
  { id: 4, time: "14:26", date: "2025-01-20", user: "Б. Мөнхбаяр", action: "Хүсэлт илгээлээ", detail: "5 хайрцаг цаас · 2 уут кофе", type: "request" as const },
  { id: 5, time: "11:15", date: "2025-01-19", user: "Auditor Agent", action: "НӨАТ тулгалт дуусав", detail: `${NOAT_SUMMARY.total} гүйлгээний ${NOAT_SUMMARY.matched} тулгарсан (${fmtPct(NOAT_SUMMARY.matchedPct)})`, type: "audit" as const },
  { id: 6, time: "10:45", date: "2025-01-19", user: "Д. Оюунцэцэг", action: "Excel тайлан татав", detail: `${NOAT_SUMMARY.total} гүйлгээ · analyst роль`, type: "export" as const },
  { id: 7, time: "16:20", date: "2025-01-18", user: "Auditor Agent", action: "Эрсдэлийн анхааруулга", detail: "Кофений үнэ +12% өслөө", type: "risk" as const },
  { id: 8, time: "09:00", date: "2025-01-18", user: "Б. Мөнхбаяр", action: "Системд нэвтэрлээ", detail: "admin роль · JWT · 192.168.1.42", type: "login" as const },
];

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("ask");
  const [deptId, setDeptId] = useState(1);
  const [userRole, setUserRole] = useState<UserRole>("admin");

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  const dept = DEPT_DATA.find((d) => d.id === deptId) ?? DEPT_DATA[0];

  return (
    <div className="flex h-screen bg-background overflow-hidden font-display">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} userRole={userRole} onRoleChange={setUserRole} />
      <div className="flex-1 overflow-hidden flex flex-col min-w-0">
        <Topbar dept={dept} deptId={deptId} onDeptChange={setDeptId} />
        <main className="flex-1 overflow-hidden">
          {activeTab === "ask" && <AskAITab onNavigate={setActiveTab} dept={dept} userRole={userRole} />}
          {activeTab === "noat" && <NOATTab />}
          {activeTab === "dashboard" && <DashboardTab />}
          {activeTab === "audit" && <AuditLogTab userRole={userRole} />}
        </main>
      </div>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function Sidebar({ activeTab, onTabChange, userRole, onRoleChange }: { activeTab: Tab; onTabChange: (t: Tab) => void; userRole: UserRole; onRoleChange: (r: UserRole) => void }) {
  const nav = [
    { id: "ask" as Tab, label: "Хүсэлт", sub: "AI Худалдан авалт", icon: <MessageSquare size={14} /> },
    { id: "noat" as Tab, label: "НӨАТ Тулгалт", sub: "Автомат тулгалт", icon: <ShieldCheck size={14} /> },
    { id: "dashboard" as Tab, label: "Хяналтын самбар", sub: "Удирдлагын самбар", icon: <LayoutDashboard size={14} /> },
    { id: "audit" as Tab, label: "Аудит лог", sub: "Audit Log", icon: <ClipboardList size={14} /> },
  ];

  return (
    <div className="w-52 h-full bg-card border-r border-border flex flex-col shrink-0">
      <div className="px-4 py-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Brain size={13} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-foreground tracking-tight font-display">
              ProcureMind
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="text-2xs text-muted-foreground font-mono">v1.0.0</div>
              <span className="text-2xs px-1 py-0 rounded bg-accent-amber-fill/15 border border-accent-amber-fill/30 text-accent-amber-text font-mono">DEMO</span>
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {nav.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-start gap-2.5 ${
              activeTab === item.id
                ? "bg-primary/10 border border-primary/25 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <span className="mt-0.5 shrink-0">{item.icon}</span>
            <div>
              <div className="text-xs font-semibold leading-tight">{item.label}</div>
              <div className="text-2xs text-muted-foreground/70 mt-0.5 font-mono">
                {item.sub}
              </div>
            </div>
          </button>
        ))}
      </nav>

      <div className="p-3 border-t border-border space-y-3">
        {/* Failover chain — only actual LLMs used */}
        <div className="rounded-lg bg-secondary/60 p-2.5 border border-border">
          <div className="text-2xs text-muted-foreground mb-2 font-mono">
            LLM FAILOVER
          </div>
          <div className="space-y-1.5">
            {[
              { name: "Groq", active: true, note: "үндсэн" },
              { name: "Gemini", active: false, note: "нөөц" },
            ].map((llm) => (
              <div key={llm.name} className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${llm.active ? "bg-state-matched-fill-soft animate-pulse" : "bg-border"}`} />
                <span
                  className={`text-2xs ${llm.active ? "text-state-matched-text" : "text-muted-foreground"} font-mono`}

                >
                  {llm.name}
                </span>
                <span className="text-2xs text-muted-foreground/50 ml-auto font-mono">{llm.note}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Role toggle */}
        <div className="rounded-lg bg-secondary/60 p-2.5 border border-border">
          <div className="text-2xs text-muted-foreground mb-1.5 font-mono">ЭРХ</div>
          <div className="flex gap-1">
            {(["viewer", "analyst", "admin"] as UserRole[]).map((r) => (
              <button
                key={r}
                onClick={() => onRoleChange(r)}
                className={`flex-1 text-2xs py-1 rounded border transition-colors ${
                  userRole === r
                    ? "border-primary/40 text-primary bg-primary/10"
                    : "border-border text-muted-foreground hover:text-foreground"
                } font-mono`}

              >
                {r === "viewer" ? "харах" : r === "analyst" ? "шинжлэх" : "admin"}
              </button>
            ))}
          </div>
        </div>

        {/* User row */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <User size={11} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-foreground truncate">Б. Мөнхбаяр</div>
            <div className="text-2xs text-muted-foreground font-mono">
              {userRole === "viewer" ? "харагч" : userRole === "analyst" ? "аналист" : "admin"}
            </div>
          </div>
          <div className="w-1.5 h-1.5 rounded-full bg-state-matched-fill-soft shrink-0" />
        </div>
      </div>
    </div>
  );
}

// ── Topbar ────────────────────────────────────────────────────────────────────
function Topbar({ dept, deptId, onDeptChange }: { dept: typeof DEPT_DATA[0]; deptId: number; onDeptChange: (id: number) => void }) {
  const [open, setOpen] = useState(false);
  const remaining = dept.budget - dept.spent;
  const usedPct = dept.spent / dept.budget;
  const barColor = budgetColor(usedPct);

  return (
    <div className="h-11 border-b border-border bg-card/60 backdrop-blur flex items-center justify-between px-5 shrink-0 relative">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-state-matched-fill-soft animate-pulse" />
          <span className="text-xs text-muted-foreground font-mono">
            Онлайн
          </span>
        </div>
        <div className="h-3 w-px bg-border" />
        <span className="text-xs text-muted-foreground font-mono">
          LangGraph · MCP · PostgreSQL · Groq
        </span>
      </div>

      {/* Department switcher */}
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-3 rounded-lg border px-3 py-2 transition-all"
          style={{
            borderColor: open ? "rgba(59,130,246,0.4)" : "rgba(255,255,255,0.08)",
            background: open ? "rgba(59,130,246,0.07)" : "rgba(255,255,255,0.04)",
          }}
        >
          <div className="text-left">
            <div className="text-xs font-semibold text-white leading-tight font-display">
              {dept.name}
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <div className="w-20 h-[3px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${usedPct * 100}%`, background: barColor }} />
              </div>
              <span className="text-2xs tabular-nums font-mono" style={{ color: barColor }}>
                {fmt(remaining)}
              </span>
            </div>
          </div>
          <X size={9} className={`transition-transform duration-200 shrink-0 ${open ? "rotate-0" : "rotate-45"}`} style={{ color: "rgba(255,255,255,0.35)" }} />
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-1 w-64 rounded-xl border border-border bg-card shadow-xl z-50 overflow-hidden">
            {DEPT_DATA.map((d) => {
              const r = d.budget - d.spent;
              const pct = d.spent / d.budget;
              const col = budgetColor(pct);
              return (
                <button
                  key={d.id}
                  onClick={() => { onDeptChange(d.id); setOpen(false); }}
                  className={`w-full px-4 py-3 text-left hover:bg-secondary/50 transition-colors border-b border-border/50 last:border-0 ${d.id === deptId ? "bg-primary/5" : ""}`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-foreground font-display">{d.name}</span>
                    <span className="text-2xs font-mono" style={{ color: col }}>{fmt(r)}</span>
                  </div>
                  <div className="w-full h-1 rounded-full bg-border overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct * 100}%`, background: col }} />
                  </div>
                  <div className="flex justify-between mt-1 text-2xs text-muted-foreground font-mono">
                    <span>{fmt(d.spent)} зарцуулсан</span>
                    <span>{fmt(d.budget)} нийт</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Bell size={13} className="text-muted-foreground cursor-pointer hover:text-foreground transition-colors" />
        <Settings size={13} className="text-muted-foreground cursor-pointer hover:text-foreground transition-colors" />
      </div>
    </div>
  );
}

type DemoMode = "happy" | "budget_exceeded" | "custom";

const DEMO_PRESETS: { label: string; text: string; mode: DemoMode; icon: string }[] = [
  { label: "10 кофе хэрэгтэй", text: "Маркетингт 10 ширхэг кофе хэрэгтэй байна", mode: "happy", icon: "☕" },
  { label: "Төсөв хэтэрсэн", text: "Маркетингт 5 хайрцаг тонер хэрэгтэй", mode: "budget_exceeded", icon: "🚫" },
  { label: "5 хайрцаг цаас", text: "IT хэлтэст 5 хайрцаг A4 цаас авах хэрэгтэй", mode: "happy", icon: "📄" },
];

// ── Ask AI Tab ────────────────────────────────────────────────────────────────
function AskAITab({ onNavigate, dept, userRole }: { onNavigate: (t: Tab) => void; dept: typeof DEPT_DATA[0]; userRole: UserRole }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "0",
      role: "assistant",
      content: "Сайн байна уу! Хангамжийн хүсэлтээ Монголоор бичнэ үү. Цаас, кофе, ахуйн хэрэгслийг хамгийн хямд үнээр олж өгнө. Төсвийг хянана, санхүүгийн эрсдэлийг бодно.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [demoMode, setDemoMode] = useState<DemoMode>("custom");
  const [agents, setAgents] = useState<Record<string, AgentStatus>>({
    supervisor: "idle",
    procurement: "idle",
    finance: "idle",
    auditor: "idle",
  });
  const [agentOutputs, setAgentOutputs] = useState<Record<string, string>>({
    supervisor: "",
    procurement: "",
    finance: "",
    auditor: "",
  });
  const [showApproval, setShowApproval] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [workflowDone, setWorkflowDone] = useState(false);
  const [toolCalls, setToolCalls] = useState<Record<string, string[]>>({ supervisor: [], procurement: [], finance: [], auditor: [] });
  const [agentTimes, setAgentTimes] = useState<Record<string, string>>({ supervisor: "", procurement: "", finance: "", auditor: "" });
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, showApproval, isRunning]);

  const runWorkflow = async (mode: DemoMode) => {
    setIsRunning(true);
    setShowApproval(false);
    setWorkflowDone(false);
    setAgents({ supervisor: "idle", procurement: "idle", finance: "idle", auditor: "idle" });
    setAgentOutputs({ supervisor: "", procurement: "", finance: "", auditor: "" });
    setToolCalls({ supervisor: [], procurement: [], finance: [], auditor: [] });
    setAgentTimes({ supervisor: "", procurement: "", finance: "", auditor: "" });

    const isBudgetExceeded = mode === "budget_exceeded";
    const deptName = dept.name;
    const remaining = dept.budget - dept.spent;

    setAgents((p) => ({ ...p, supervisor: "processing" }));
    await sleep(1300);
    setAgents((p) => ({ ...p, supervisor: "done", procurement: "processing" }));
    setAgentOutputs((p) => ({ ...p, supervisor: isBudgetExceeded ? `Тонер хайлт · ${deptName}` : `Хүсэлт шинжилсэн · 2 барааны зөвлөмж` }));
    setToolCalls((p) => ({ ...p, supervisor: [`parse_intent("${isBudgetExceeded ? "тонер" : "кофе, цаас"}") → ok`] }));
    setAgentTimes((p) => ({ ...p, supervisor: "1.3с" }));

    await sleep(1800);
    setAgents((p) => ({ ...p, procurement: "done", finance: "processing" }));
    setAgentOutputs((p) => ({ ...p, procurement: isBudgetExceeded ? "OfficeWorld тонер 95,000₮ · хамгийн хямд" : "ITStore 107,000₮ · хамгийн хямд" }));
    setToolCalls((p) => ({
      ...p,
      procurement: [
        `search_supplier_products(query="${isBudgetExceeded ? "тонер" : "кофе"}", category="хэрэглэл") → ${isBudgetExceeded ? "2" : "3"} үр дүн`,
        `compare_prices([${isBudgetExceeded ? "OfficeWorld, PrinterHub" : "ITStore, OfficeWorld, MonSupply"}])`,
      ],
    }));
    setAgentTimes((p) => ({ ...p, procurement: "1.8с" }));

    await sleep(1200);
    setAgents((p) => ({ ...p, finance: "done", auditor: "processing" }));
    setAgentOutputs((p) => ({
      ...p,
      finance: isBudgetExceeded
        ? `${deptName} · 45,000₮ ДУТАГДАЖ БАЙНА`
        : `${deptName} · ${fmt(remaining)} үлдэгдэл · OK ✓`,
    }));
    setToolCalls((p) => ({
      ...p,
      finance: [
        `check_budget(dept="${deptName}", amt=${isBudgetExceeded ? 95000 : 107000}) → ${isBudgetExceeded ? "REJECTED" : "OK"}`,
        ...(isBudgetExceeded ? [] : [`create_order(product=42, qty=10) → order_id: 8`]),
      ],
    }));
    setAgentTimes((p) => ({ ...p, finance: "1.2с" }));

    await sleep(1000);
    setAgents((p) => ({ ...p, auditor: "done" }));
    setAgentOutputs((p) => ({
      ...p,
      auditor: isBudgetExceeded ? "Төсөв давалт бүртгэгдлээ · Санхүүд мэдэгдэнэ" : "Эрсдэл: 2/10 БАГА · Кофений үнэ +12%",
    }));
    setToolCalls((p) => ({ ...p, auditor: [`log_audit(action="${isBudgetExceeded ? "budget_exceeded" : "order_created"}", dept="${deptName}")`] }));
    setAgentTimes((p) => ({ ...p, auditor: "1.0с" }));

    if (isBudgetExceeded) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: "Маркетингийн тонерийн хуваарьт 45,000₮ дутагдаж байна. Одоогийн үлдэгдэл: 50,000₮ — тонер нэг ширхэгт 95,000₮.\n\n💡 Хямд хувилбар: PrinterHub тонер 48,000₮ (хуваарийн хүрэлцэнэ). Энэ хувилбараар орлуулах уу?",
          timestamp: new Date(),
        },
      ]);
    } else {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: "Агент шүүлт дуусав. ITStore-ийн 107,000₮ багц хамгийн оновчтой байна. Доорх мэдээллийг шалгаад баталгаажуулна уу.",
          timestamp: new Date(),
        },
      ]);
      setShowApproval(true);
    }

    setWorkflowDone(true);
    setIsRunning(false);
  };

  const handleSend = async (overrideText?: string, overrideMode?: DemoMode) => {
    const text = overrideText ?? input;
    const mode = overrideMode ?? demoMode;
    if (!text.trim() || isRunning) return;
    setInput("");
    setDemoMode(mode);
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role: "user", content: text, timestamp: new Date() },
    ]);
    await sleep(400);
    await runWorkflow(mode);
  };

  const handleApprove = async () => {
    setShowApproval(false);
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: "assistant",
        content: "✓ Баталгаажлаа. Sandbox гүйлгээ амжилттай хийгдлээ. НӨАТ тулгалт автоматаар эхлэх болно.",
        timestamp: new Date(),
      },
    ]);
    await sleep(1200);
    onNavigate("noat");
  };

  const handleReject = () => {
    setShowApproval(false);
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: "assistant",
        content: "Хүсэлт цуцлагдлаа. Өөр нийлүүлэгч сонгох эсвэл хэрэгцээгээ дахин оруулна уу.",
        timestamp: new Date(),
      },
    ]);
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Chat */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-border">
        <div ref={chatRef} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Empty state — large demo cards */}
          {messages.length === 1 && !isRunning && (
            <div className="flex flex-col items-center justify-center h-full pb-8 space-y-4">
              <div className="text-center mb-2">
                <div className="text-sm font-semibold text-foreground font-display">Хүсэлтээ сонгон эхлүүлнэ үү</div>
                <div className="text-xs text-muted-foreground mt-1 font-mono">Жишээ сценари эсвэл Монголоор бичнэ үү</div>
              </div>
              <div className="grid grid-cols-1 gap-2.5 w-full max-w-sm">
                {DEMO_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => handleSend(preset.text, preset.mode)}
                    className={`flex items-start gap-3 text-left px-4 py-3.5 rounded-xl border transition-all hover:scale-[1.01] ${
                      preset.mode === "budget_exceeded"
                        ? "border-state-unmatched-fill/25 bg-state-unmatched-fill/5 hover:bg-state-unmatched-fill/10 hover:border-state-unmatched-fill/40"
                        : "border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/35"
                    }`}
                  >
                    <span className="text-xl shrink-0 mt-0.5">{preset.icon}</span>
                    <div>
                      <div className={`text-xs font-semibold ${preset.mode === "budget_exceeded" ? "text-state-unmatched-text" : "text-primary"}`}>
                        {preset.label}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{preset.text}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <ChatBubble key={msg.id} message={msg} />
          ))}

          {isRunning && (
            <div className="flex items-center gap-2 text-muted-foreground pl-1">
              <Loader2 size={11} className="animate-spin text-primary" />
              <span className="text-xs font-mono">
                Агентууд боловсруулж байна...
              </span>
            </div>
          )}

          {showApproval && <ApprovalCard onApprove={handleApprove} onReject={handleReject} />}
        </div>

        <div className="border-t border-border p-4 space-y-2.5">
          {/* Demo preset chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-2xs text-muted-foreground uppercase tracking-widest shrink-0 font-mono">Демо:</span>
            {DEMO_PRESETS.map((preset) => (
              <button
                key={preset.mode + preset.label}
                onClick={() => handleSend(preset.text, preset.mode)}
                disabled={isRunning}
                className={`flex items-center gap-1 text-2xs px-2 py-1 rounded-lg border transition-colors disabled:opacity-40 ${
                  preset.mode === "budget_exceeded"
                    ? "border-state-unmatched-fill/30 text-state-unmatched-text bg-state-unmatched-fill/5 hover:bg-state-unmatched-fill/10"
                    : "border-primary/30 text-primary bg-primary/5 hover:bg-primary/10"
                } font-mono`}

              >
                <span>{preset.icon}</span>
                {preset.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 border border-border bg-background focus-within:border-primary/50 transition-colors">
            <Zap size={12} className="text-primary shrink-0" />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Монголоор хүсэлтээ бичнэ үү… (ж.нь: 5 хайрцаг цаас авъя)"
              className="flex-1 bg-transparent text-sm text-white placeholder:text-[rgba(255,255,255,0.28)] outline-none"
              disabled={isRunning}
            />
            <button
              title="Файл хавсаргах"
              className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors shrink-0"
              onClick={() => {}}
            >
              <Download size={12} className="rotate-180" />
            </button>
            <button
              onClick={() => handleSend()}
              disabled={isRunning || !input.trim()}
              className="p-1.5 rounded-lg bg-primary text-white disabled:opacity-40 transition-opacity hover:opacity-85 shrink-0"
            >
              <Send size={12} />
            </button>
          </div>
          <p className="text-2xs text-muted-foreground text-center font-mono">
            Human-in-the-Loop · Автомат гүйлгээ хийгдэхгүй
          </p>
        </div>
      </div>

      {/* Agent Panel */}
      <div className="w-72 shrink-0 overflow-y-auto p-4 space-y-2.5">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={11} className="text-primary" />
          <span className="text-2xs text-muted-foreground uppercase tracking-widest font-display">
            Multi-Agent Workflow
          </span>
        </div>

        <AgentCard icon={<Brain size={13} />} name="Supervisor Agent" meta="Groq · Монгол яриа" status={agents.supervisor} output={agentOutputs.supervisor} calls={toolCalls.supervisor} elapsed={agentTimes.supervisor} />
        <AgentCard icon={<ShoppingCart size={13} />} name="Procurement Agent" meta="MCP · Нийлүүлэгч хайлт" status={agents.procurement} output={agentOutputs.procurement} calls={toolCalls.procurement} elapsed={agentTimes.procurement} />
        <AgentCard icon={<Calculator size={13} />} name="Finance Agent" meta="PostgreSQL · Төсөв шалгах" status={agents.finance} output={agentOutputs.finance} calls={toolCalls.finance} elapsed={agentTimes.finance} />
        <AgentCard icon={<Shield size={13} />} name="Auditor Agent" meta="Gemini · Эрсдэл тооцох" status={agents.auditor} output={agentOutputs.auditor} calls={toolCalls.auditor} elapsed={agentTimes.auditor} />

        {workflowDone && (
          <div className="rounded-xl border border-border bg-card/50 p-3 mt-2">
            <div className="text-2xs text-muted-foreground mb-2 uppercase tracking-wider font-mono">
              Үнийн харьцуулалт
            </div>
            <div className="space-y-1.5">
              {PRICE_COMPARISON.map((row, i) => (
                <div key={i} className={`flex items-center justify-between text-xs ${row.best ? "text-state-matched-text" : "text-muted-foreground"}`}>
                  <span className="truncate max-w-[140px] flex items-center gap-1">
                    {row.best && <span>★</span>}
                    {row.supplier}
                  </span>
                  <span className="font-mono">{fmt(row.total)}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 pt-2 border-t border-border text-2xs text-state-matched-text/70 font-mono">
              Хэмнэлт: 3,000₮ · OfficeWorld-с
            </div>
          </div>
        )}

        <div className="rounded-xl border border-border bg-card/30 p-3 mt-1">
          <div className="text-2xs text-muted-foreground mb-2 uppercase tracking-wider font-mono">
            RBAC
          </div>
          <div className="space-y-1">
            {[
              { role: "viewer", desc: "Унших зөвшөөрөл" },
              { role: "analyst", desc: "Excel экспорт" },
              { role: "admin", desc: "Батлах / цуцлах" },
            ].map((r) => (
              <div key={r.role} className="flex items-center gap-2">
                <span
                  className={`text-2xs px-1.5 py-0.5 rounded border ${r.role === "admin" ? "border-primary/40 text-primary bg-primary/10" : "border-border text-muted-foreground"} font-mono`}

                >
                  {r.role}
                </span>
                <span className="text-2xs text-muted-foreground">{r.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : ""}`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isUser ? "bg-primary/20" : "bg-accent/15"}`}>
        {isUser ? <User size={10} className="text-primary" /> : <Bot size={10} className="text-accent" />}
      </div>
      <div className={`max-w-[78%] flex flex-col ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
            isUser ? "bg-primary text-white rounded-tr-sm" : "bg-card border border-border text-foreground rounded-tl-sm"
          }`}
        >
          {message.content}
        </div>
        <span className="text-2xs text-muted-foreground mt-1 px-1 font-mono">
          {message.timestamp.toLocaleTimeString("mn-MN", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}

function AgentCard({ icon, name, meta, status, output, calls, elapsed }: {
  icon: React.ReactNode; name: string; meta: string;
  status: AgentStatus; output: string; calls: string[]; elapsed: string;
}) {
  return (
    <div
      className={`rounded-xl border p-3 transition-all duration-300 ${
        status === "processing" ? "border-primary/40 bg-primary/5" : status === "done" ? "border-state-matched-fill/30 bg-state-matched-fill/5" : "border-border bg-card/30"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`shrink-0 ${status === "processing" ? "text-primary" : status === "done" ? "text-state-matched-text" : "text-muted-foreground"}`}>
            {status === "processing" ? <span className="relative flex"><span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-40" style={{ background: "currentColor" }} />{icon}</span> : icon}
          </span>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-foreground truncate">{name}</div>
            <div className="text-2xs text-muted-foreground font-mono">{meta}</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {elapsed && <span className="text-2xs text-muted-foreground font-mono">{elapsed}</span>}
          <AgentBadge status={status} />
        </div>
      </div>
      {/* Tool call log */}
      {calls.length > 0 && (
        <div className="mt-2 space-y-0.5">
          {calls.map((call, i) => (
            <div key={i} className="text-2xs text-state-info-text-bright/70 bg-state-info-fill/5 rounded px-2 py-1 border border-state-info-fill/10 font-mono truncate">
              ⟶ {call}
            </div>
          ))}
        </div>
      )}
      {output && (
        <div className={`mt-1.5 text-2xs rounded-lg px-2 py-1.5 border ${status === "done" && !output.includes("ДУТАГДАЖ") ? "text-state-matched-text/80 bg-state-matched-fill/5 border-state-matched-fill/10" : output.includes("ДУТАГДАЖ") ? "text-state-unmatched-text/80 bg-state-unmatched-fill/5 border-state-unmatched-fill/10" : "text-primary/80 bg-primary/5 border-primary/10"} font-mono`}>
          {output}
        </div>
      )}
    </div>
  );
}

function AgentBadge({ status }: { status: AgentStatus }) {
  if (status === "idle")
    return <span className="text-2xs text-muted-foreground px-1.5 py-0.5 border border-border rounded font-mono">БЭЛЭН</span>;
  if (status === "processing")
    return (
      <span className="flex items-center gap-1 text-2xs text-primary px-1.5 py-0.5 border border-primary/30 rounded bg-primary/10 font-mono">
        <Loader2 size={8} className="animate-spin" />АЖИЛЛАЖ
      </span>
    );
  return (
    <span className="flex items-center gap-1 text-2xs text-state-matched-text px-1.5 py-0.5 border border-state-matched-fill/30 rounded bg-state-matched-fill/10 font-mono">
      <Check size={8} />ДУУСАВ
    </span>
  );
}

const APPROVAL_ITEMS = [
  { name: "Цаас A4", unit: "хайрцаг", qty: 5, unitPrice: 13000, total: 65000 },
  { name: "Кофе Nescafé 3in1", unit: "уут", qty: 2, unitPrice: 21000, total: 42000 },
];
const APPROVAL_BUDGET = { remaining: 2300000, orderTotal: 107000 };

function ApprovalCard({ onApprove, onReject }: { onApprove: () => void; onReject: () => void }) {
  const afterRemaining = APPROVAL_BUDGET.remaining - APPROVAL_BUDGET.orderTotal;
  const usageBefore = 1 - APPROVAL_BUDGET.remaining / 2800000;
  const usageAfter = 1 - afterRemaining / 2800000;

  return (
    <div className="rounded-2xl border border-primary/30 bg-card overflow-hidden">
      <div className="px-4 py-3 bg-primary/10 border-b border-primary/20 flex items-center gap-2">
        <Shield size={12} className="text-primary shrink-0" />
        <span className="text-xs font-semibold text-primary uppercase tracking-wide font-display">
          Баталгаажуулалт шаардлагатай
        </span>
        <span className="ml-auto text-2xs text-muted-foreground shrink-0 font-mono">
          Human-in-the-Loop
        </span>
      </div>

      <div className="p-4 space-y-3">
        {/* Items table */}
        <table className="w-full">
          <caption className="sr-only">Худалдан авалтын барааны жагсаалт</caption>
          <thead>
            <tr className="border-b border-border">
              {["Барааны нэр", "Тоо", "Нэгж үнэ", "Нийт"].map((h) => (
                <th key={h} scope="col" className="text-left pb-1.5 text-2xs text-muted-foreground uppercase tracking-wider font-mono">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {APPROVAL_ITEMS.map((item, i) => (
              <tr key={i} className="border-b border-border/40">
                <td className="py-2 text-xs text-foreground">{item.name}</td>
                <td className="py-2 text-xs text-muted-foreground font-mono">{item.qty} {item.unit}</td>
                <td className="py-2 text-xs text-muted-foreground font-mono">{fmt(item.unitPrice)}</td>
                <td className="py-2 text-xs text-foreground text-right font-mono">{fmt(item.total)}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={3} className="pt-2 text-xs font-bold text-foreground">Нийт дүн</td>
              <td className="pt-2 text-sm font-bold text-primary text-right font-mono">
                {fmt(APPROVAL_BUDGET.orderTotal)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Budget before / after */}
        <div className="rounded-lg bg-secondary/60 border border-border p-3 space-y-2">
          <div className="flex justify-between text-2xs text-muted-foreground font-mono">
            <span>Төсвийн үлдэгдэл</span>
            <span className="text-state-matched-text">OK ✓</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-2xs font-mono">
              <span className="text-muted-foreground w-14 shrink-0">Өмнө</span>
              <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-primary/40 rounded-full" style={{ width: `${usageBefore * 100}%` }} />
              </div>
              <span className="text-foreground w-20 text-right shrink-0">{fmt(APPROVAL_BUDGET.remaining)}</span>
            </div>
            <div className="flex items-center gap-2 text-2xs font-mono">
              <span className="text-muted-foreground w-14 shrink-0">Дараа</span>
              <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${usageAfter * 100}%` }} />
              </div>
              <span className="text-primary w-20 text-right shrink-0">{fmt(afterRemaining)}</span>
            </div>
          </div>
        </div>

        {/* Supplier + Risk */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-secondary p-2">
            <div className="text-2xs text-muted-foreground font-mono">Нийлүүлэгч</div>
            <div className="text-xs font-semibold text-foreground mt-0.5">ITStore Mongolia</div>
            <div className="text-2xs text-muted-foreground mt-0.5 font-mono">★ Хамгийн хямд · 3 дэлгүүрээс</div>
          </div>
          <div className="rounded-lg bg-secondary p-2">
            <div className="text-2xs text-muted-foreground font-mono">Эрсдэлийн оноо</div>
            <div className="text-xs font-semibold text-foreground mt-0.5">2 / 10 — БАГА</div>
            <div className="text-2xs text-state-matched-text/80 mt-0.5 font-mono">Аюулгүй гүйлгээ</div>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={onApprove} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-state-matched-fill-strong hover:bg-state-matched-fill text-white text-xs font-bold transition-colors">
            <Check size={12} />ЗӨВШӨӨРӨХ
          </button>
          <button onClick={onReject} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-state-unmatched-fill-strong/80 hover:bg-state-unmatched-fill-strong text-white text-xs font-bold transition-colors">
            <X size={12} />ТАТГАЛЗАХ
          </button>
        </div>
      </div>
    </div>
  );
}

// ── НӨАТ Tab ──────────────────────────────────────────────────────────────────
function NOATTab() {
  const [uploaded, setUploaded] = useState<{ bank: string | null; vat: string | null }>({ bank: null, vat: null });
  const [running, setRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [done, setDone] = useState(false);

  const handleExport = () => {
    const blob = buildNoatWorkbook(NOAT_RESULTS, NOAT_SUMMARY);
    downloadBlob(blob, "ProcureMind-NOAT-taylan.xlsx");
  };

  const handleRun = async () => {
    if (!uploaded.bank || !uploaded.vat || running) return;
    setRunning(true);
    setDone(false);
    for (let i = 0; i < NOAT_STEPS.length; i++) {
      setCurrentStep(i);
      await sleep(950);
    }
    setRunning(false);
    setDone(true);
    setCurrentStep(NOAT_STEPS.length);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-6 space-y-5">
        <div>
          <h1 className="text-xl font-bold text-foreground font-display">
            НӨАТ Автомат Тулгалт
          </h1>
          <p className="text-xs text-muted-foreground mt-1 font-mono">
            6-Шатлалт алгоритм · RapidFuzz · PostgreSQL · openpyxl
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <UploadCard label="Банкны хуулга" sub="Bank statement · .xlsx / .csv" icon={<Banknote size={15} />} kind="bank" fileName={uploaded.bank} onUpload={(f) => setUploaded((p) => ({ ...p, bank: f }))} />
            <UploadCard label="НӨАТ баримт" sub="Нэхэмжлэх · .pdf / .xml" icon={<FileText size={15} />} kind="vat" fileName={uploaded.vat} onUpload={(f) => setUploaded((p) => ({ ...p, vat: f }))} />

            <button
              onClick={handleRun}
              disabled={!uploaded.bank || !uploaded.vat || running}
              className="w-full py-2.5 rounded-xl bg-primary text-white text-xs font-semibold disabled:opacity-40 transition-opacity hover:opacity-85 flex items-center justify-center gap-2"
            >
              {running ? <><Loader2 size={13} className="animate-spin" />Боловсруулж байна...</> : <><Zap size={13} />Тулгалт эхлүүлэх</>}
            </button>

            <div className="rounded-xl border border-border bg-card/30 p-3 space-y-1.5">
              <div className="text-2xs text-muted-foreground uppercase tracking-wider font-mono">Тулгалтын тохиргоо</div>
              {[
                { label: "НӨАТ хувь", value: "10%" },
                { label: "Tolerance", value: "±5₮ / ±1 өдөр" },
                { label: "Fuzzy threshold", value: "≥0.85" },
                { label: "Хугацаа", value: "~45 секунд" },
              ].map((row) => (
                <div key={row.label} className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="text-foreground font-mono">{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            <div className="text-2xs text-muted-foreground uppercase tracking-wider mb-3 font-mono">
              6-Шатлалт Алгоритм
            </div>
            {NOAT_STEPS.map((step, i) => {
              const stepDone = currentStep > i;
              const stepActive = currentStep === i && running;
              return (
                <div
                  key={i}
                  className={`flex items-start gap-3 p-2.5 rounded-lg transition-all duration-300 ${
                    stepActive ? "bg-primary/10 border border-primary/25" : stepDone ? "bg-state-matched-fill/5 border border-state-matched-fill/15" : "border border-transparent opacity-45"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 border text-2xs font-bold transition-colors ${
                      stepActive ? "border-primary text-primary" : stepDone ? "border-state-matched-fill bg-state-matched-fill/20 text-state-matched-text" : "border-border text-muted-foreground"
                    }`}
                  >
                    {stepDone ? <Check size={9} /> : step.step}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={`text-xs font-semibold ${stepActive ? "text-primary" : stepDone ? "text-state-matched-text" : "text-foreground"}`}>{step.name}</div>
                    <div className="text-2xs text-muted-foreground mt-0.5 font-mono">{step.code}</div>
                  </div>
                  {stepActive && <Loader2 size={11} className="animate-spin text-primary shrink-0 mt-1" />}
                </div>
              );
            })}
          </div>
        </div>

        {done && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3">
              <MiniStat label="Нийт гүйлгээ" value={String(NOAT_SUMMARY.total)} color="blue" />
              <MiniStat label="Тулгарсан" value={String(NOAT_SUMMARY.matched)} sub={fmtPct(NOAT_SUMMARY.matchedPct)} color="green" />
              <MiniStat label="Хэсэгчлэн" value={String(NOAT_SUMMARY.partial)} sub={fmtPct(NOAT_SUMMARY.partialPct)} color="yellow" />
              <MiniStat label="Тулгараагүй" value={String(NOAT_SUMMARY.unmatched)} sub={fmtPct(NOAT_SUMMARY.unmatchedPct)} color="red" />
            </div>

            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="text-sm font-semibold text-foreground font-display">Тулгалтын дэлгэрэнгүй · {NOAT_SUMMARY.total} гүйлгээ</span>
                <button
                  onClick={handleExport}
                  className="flex items-center gap-1.5 text-xs font-semibold text-white bg-state-matched-fill-strong hover:bg-state-matched-fill transition-colors px-3 py-1.5 rounded-lg"
                >
                  <Download size={11} />Excel татах (.xlsx)
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <caption className="sr-only">НӨАТ тулгалтын гүйлгээн дэлгэрэнгүй</caption>
                  <thead>
                    <tr className="border-b border-border bg-secondary/40">
                      {["ID", "Огноо", "Нийлүүлэгч", "Дүн", "ДДТД", "Шат", "Оноо", "Төлөв"].map((h) => (
                        <th key={h} scope="col" className="text-left px-3 py-2.5 text-2xs text-muted-foreground uppercase tracking-wider font-mono">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {NOAT_RESULTS.map((row, i) => (
                      <tr
                        key={row.id}
                        className={`border-b border-border/40 hover:bg-secondary/30 transition-colors ${
                          row.status === "matched" ? "hover:bg-state-matched-fill/5" : row.status === "partial" ? "hover:bg-state-partial-fill/5" : "hover:bg-state-unmatched-fill/5"
                        }`}
                      >
                        <td className="px-3 py-2.5 text-2xs text-muted-foreground font-mono">{row.id}</td>
                        <td className="px-3 py-2.5 text-2xs font-mono">{row.date}</td>
                        <td className="px-3 py-2.5 text-xs text-foreground max-w-[140px] truncate">{row.supplier}</td>
                        <td className="px-3 py-2.5 text-xs font-mono">{fmt(row.amount)}</td>
                        <td className="px-3 py-2.5 text-2xs text-muted-foreground max-w-[120px] truncate font-mono">{row.ddtd ?? "—"}</td>
                        <td className="px-3 py-2.5">
                          <span className="text-2xs px-1 py-0.5 rounded bg-secondary border border-border text-muted-foreground font-mono">
                            {row.tier}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <div className="h-1.5 w-12 rounded-full bg-secondary overflow-hidden">
                              <div
                                className={`h-full rounded-full ${row.status === "matched" ? "bg-state-matched-fill" : row.status === "partial" ? "bg-state-partial-fill" : "bg-state-unmatched-fill"}`}
                                style={{ width: `${row.score}%` }}
                              />
                            </div>
                            <span className="text-2xs text-muted-foreground font-mono">{row.score}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`text-2xs px-1.5 py-0.5 rounded border ${
                              row.status === "matched"
                                ? "border-state-matched-fill/30 text-state-matched-text bg-state-matched-fill/10"
                                : row.status === "partial"
                                ? "border-state-partial-fill/30 text-state-partial-text bg-state-partial-fill/10"
                                : "border-state-unmatched-fill/30 text-state-unmatched-text bg-state-unmatched-fill/10"
                            } font-mono`}

                          >
                            {row.status === "matched" ? "ТУЛГАРСАН" : row.status === "partial" ? "ХЭСЭГЧЛЭН" : "ТУЛГАРААГҮЙ"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

type UploadKind = "bank" | "vat";

const ACCEPTED_EXTENSIONS: Record<UploadKind, string[]> = {
  bank: ["xlsx", "csv"],
  vat: ["pdf", "xml"],
};

function UploadCard({
  label,
  sub,
  icon,
  kind,
  fileName,
  onUpload,
}: {
  label: string;
  sub: string;
  icon: React.ReactNode;
  kind: UploadKind;
  fileName: string | null;
  onUpload: (fileName: string | null) => void;
}) {
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const uploaded = Boolean(fileName);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size === 0) {
      setError("Хоосон файл байна. Тэжээлтэй файл сонгоно уу.");
      onUpload(null);
      return;
    }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ACCEPTED_EXTENSIONS[kind].includes(ext)) {
      setError(`Зөвхөн ${ACCEPTED_EXTENSIONS[kind].map((e) => `.${e}`).join(" / ")} формат зөвшөөрөгдөнө.`);
      onUpload(null);
      return;
    }

    setError("");
    onUpload(file.name);
  };

  const handleClear = () => {
    setError("");
    onUpload(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const errorId = `${kind}-upload-error`;

  return (
    <div
      className={`rounded-xl border-2 border-dashed p-4 transition-all focus-within:ring-2 focus-within:ring-primary/60 focus-within:ring-offset-1 focus-within:ring-offset-background ${
        error
          ? "border-state-unmatched-fill/50 bg-state-unmatched-fill/5"
          : uploaded
            ? "border-state-matched-fill/40 bg-state-matched-fill/5"
            : "border-border hover:border-primary/40 hover:bg-primary/5"
      }`}
    >
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          accept={ACCEPTED_EXTENSIONS[kind].map((e) => `.${e}`).join(",")}
          onChange={handleChange}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={error ? true : undefined}
        />
        <span className={uploaded && !error ? "text-state-matched-text" : "text-muted-foreground"}>{icon}</span>
        <span className="flex-1 min-w-0">
          <span className="block text-xs font-semibold text-foreground">{label}</span>
          <span className="block text-2xs text-muted-foreground font-mono">{sub}</span>
        </span>
        {uploaded && !error ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              handleClear();
            }}
            title="Файл хасах"
            aria-label={`${label} файлыг хасах`}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={14} />
          </button>
        ) : (
          <Upload size={14} className="text-muted-foreground shrink-0" />
        )}
      </label>

      {error ? (
        <p id={errorId} role="alert" className="mt-2 text-2xs text-state-unmatched-text">
          {error}
        </p>
      ) : uploaded ? (
        <p className="mt-2 text-2xs text-state-matched-text/80 font-mono truncate">
          ✓ {fileName}
        </p>
      ) : null}
    </div>
  );
}

function MiniStat({ label, value, sub, color }: { label: string; value: string; sub?: string; color: "blue" | "green" | "yellow" | "red" }) {
  const cfg = {
    blue: "text-state-info-text border-state-info-fill/20 bg-state-info-fill/5",
    green: "text-state-matched-text border-state-matched-fill/20 bg-state-matched-fill/5",
    yellow: "text-state-partial-text border-state-partial-fill/20 bg-state-partial-fill/5",
    red: "text-state-unmatched-text border-state-unmatched-fill/20 bg-state-unmatched-fill/5",
  };
  return (
    <div className={`rounded-xl border p-3 ${cfg[color]}`}>
      <div className="text-2xs text-muted-foreground uppercase font-mono">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${cfg[color].split(" ")[0]} font-display`}>{value}</div>
      {sub && <div className="text-2xs text-muted-foreground font-mono">{sub}</div>}
    </div>
  );
}

// Grouped bar chart via Recharts. Colours are pinned in the config so
// ChartStyle emits --color-budget / --color-actual scoped to the chart id.
const BUDGET_CHART_CONFIG = {
  budget: { label: "Хуваарь", color: "rgba(139, 92, 246, 0.30)" },
  actual: { label: "Зарцуулалт", color: "var(--primary)" },
} satisfies ChartConfig;

function BudgetBars({ data }: { data: { dept: string; budget: number; actual: number }[] }) {
  return (
    <ChartContainer config={BUDGET_CHART_CONFIG} className="h-[180px] w-full">
      <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }} barGap={2}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="dept"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
        />
        <YAxis hide />
        <ChartTooltip
          cursor={{ fill: "var(--muted)", opacity: 0.4 }}
          content={
            <ChartTooltipContent
              formatter={(value, name) => [
                `${Number(value).toLocaleString()}K₮`,
                BUDGET_CHART_CONFIG[name as keyof typeof BUDGET_CHART_CONFIG]?.label ?? name,
              ]}
            />
          }
        />
        <Bar dataKey="budget" fill="var(--color-budget)" radius={[3, 3, 0, 0]} maxBarSize={18} />
        <Bar dataKey="actual" fill="var(--color-actual)" radius={[3, 3, 0, 0]} maxBarSize={18} />
      </BarChart>
    </ChartContainer>
  );
}

const VAT_CHART_CONFIG = {
  Тулгарсан: { label: "Тулгарсан", color: "var(--state-matched)" },
  Хэсэгчлэн: { label: "Хэсэгчлэн", color: "var(--state-partial)" },
  Тулгараагүй: { label: "Тулгараагүй", color: "var(--state-unmatched)" },
} satisfies ChartConfig;

function SvgDonut({ data }: { data: { name: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <ChartContainer
      config={VAT_CHART_CONFIG}
      className="mx-auto aspect-square h-[130px] w-[130px]"
    >
      <PieChart>
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              nameKey="name"
              hideLabel={false}
              formatter={(value) => [`${value} · ${((value / total) * 100).toFixed(1)}%`, "Гүйлгээ"]}
            />
          }
        />
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={34}
          outerRadius={58}
          paddingAngle={2}
          strokeWidth={2}
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
      </PieChart>
    </ChartContainer>
  );
}

// ── Dashboard Tab ─────────────────────────────────────────────────────────────
function DashboardTab() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-6 space-y-5">
        <div>
          <h1 className="text-xl font-bold text-foreground font-display">
            Удирдлагын Хяналтын Самбар
          </h1>
          <p className="text-xs text-muted-foreground mt-1 font-mono">
            Зарцуулалтын ил тод байдал · CFO / Захирал хэрэглэгч
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <KPICard title="Нийт хэмнэлт" value="127,500₮" sub="+8.3% өмнөх сараас" icon={<TrendingDown size={15} />} trend="up" />
          <KPICard title="НӨАТ тулгалт" value={fmtPct(NOAT_SUMMARY.matchedPct)} sub={`${NOAT_SUMMARY.matched}/${NOAT_SUMMARY.total} гүйлгээ`} icon={<ShieldCheck size={15} />} trend="up" />
          <KPICard title="Идэвхтэй хүсэлт" value="3" sub="2 хүлээгдэж байна" icon={<Activity size={15} />} trend="neutral" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm font-semibold text-foreground font-display">Төсөв vs Бодит зарцуулалт</div>
                <div className="text-2xs text-muted-foreground mt-0.5 font-mono">мянган ₮</div>
              </div>
              <div className="flex items-center gap-3 text-2xs text-muted-foreground font-mono">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-primary/35 inline-block" />Хуваарилсан</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-primary inline-block" />Зарцуулалт</span>
              </div>
            </div>
            <BudgetBars data={BUDGET_DATA} />
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-sm font-semibold text-foreground mb-0.5 font-display">НӨАТ Тулгалт</div>
            <div className="text-2xs text-muted-foreground mb-3 font-mono">Энэ сар · {NOAT_SUMMARY.total} гүйлгээ</div>
            <div className="flex justify-center">
              <SvgDonut data={VAT_PIE_DATA} />
            </div>
            <div className="space-y-1.5 mt-1">
              {VAT_PIE_DATA.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-2xs font-mono">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full inline-block shrink-0" style={{ background: item.color }} />
                    {item.name}
                  </span>
                  <span className="text-foreground">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <span className="text-sm font-semibold text-foreground font-display">Сүүлийн худалдан авалтууд</span>
          </div>
          <table className="w-full">
            <caption className="sr-only">Худалдан авалтын түүх</caption>
            <thead>
              <tr className="border-b border-border bg-secondary/40">
                {["Огноо", "Хүсэлт", "Нийлүүлэгч", "Дүн", "Хэлтэс", "Хэмнэлт", "Төлөв"].map((h) => (
                  <th key={h} scope="col" className="text-left px-4 py-2.5 text-2xs text-muted-foreground uppercase tracking-wider font-mono">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { date: "2025-01-20", req: "5 цаас, 2 кофе", supplier: "ITStore", amount: 107000, dept: "IT", saved: 3000, status: "done" },
                { date: "2025-01-18", req: "3 принтер картридж", supplier: "OfficeWorld МН", amount: 245000, dept: "Маркетинг", saved: 12000, status: "done" },
                { date: "2025-01-15", req: "10 USB хадгалах", supplier: "TechParts MN", amount: 89000, dept: "IT", saved: 7500, status: "pending" },
              ].map((row, i) => (
                <tr key={i} className={`border-b border-border/50 hover:bg-secondary/30 transition-colors ${i % 2 === 1 ? "bg-secondary/10" : ""}`}>
                  <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{row.date}</td>
                  <td className="px-4 py-3 text-xs text-foreground">{row.req}</td>
                  <td className="px-4 py-3 text-xs text-foreground">{row.supplier}</td>
                  <td className="px-4 py-3 text-xs font-mono">{fmt(row.amount)}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{row.dept}</td>
                  <td className="px-4 py-3 text-xs text-state-matched-text font-mono">-{fmt(row.saved)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-2xs px-1.5 py-0.5 rounded border ${row.status === "done" ? "border-state-matched-fill/30 text-state-matched-text bg-state-matched-fill/10" : "border-state-partial-fill/30 text-state-partial-text bg-state-partial-fill/10"} font-mono`}>
                      {row.status === "done" ? "ДУУСАВ" : "ХҮЛЭЭГДЭЖ БУЙ"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KPICard({ title, value, sub, icon, trend }: { title: string; value: string; sub: string; icon: React.ReactNode; trend: "up" | "down" | "neutral" }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between">
        <div className="text-xs text-muted-foreground font-mono">{title}</div>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <div className="text-2xl font-bold text-foreground mt-2 font-display">{value}</div>
      <div className={`text-2xs mt-1 ${trend === "up" ? "text-state-matched-text" : trend === "down" ? "text-state-unmatched-text" : "text-muted-foreground"} font-mono`}>
        {sub}
      </div>
    </div>
  );
}

// ── Audit Log Tab ─────────────────────────────────────────────────────────────
const PENDING_APPROVALS = [
  { id: 101, time: "14:50", dept: "HR хэлтэс", item: "Офисын сандал × 4", amount: 320000, requestedBy: "Д. Оюунцэцэг" },
  { id: 102, time: "14:55", dept: "Санхүү", item: "Хэвлэгч картридж × 2", amount: 89000, requestedBy: "Б. Ганболд" },
];

function AuditLogTab({ userRole }: { userRole: UserRole }) {
  const [search, setSearch] = useState("");
  const [activeAuditTab, setActiveAuditTab] = useState<"log" | "pending">("log");

  const typeConfig = {
    approval: { icon: <Check size={9} />, cls: "text-state-matched-text border-state-matched-fill/30 bg-state-matched-fill/10", label: "БАТЛАЛ" },
    agent: { icon: <Bot size={9} />, cls: "text-state-info-text border-state-info-fill/30 bg-state-info-fill/10", label: "АГЕНТ" },
    request: { icon: <MessageSquare size={9} />, cls: "text-accent-purple-text border-accent-purple-fill/30 bg-accent-purple-fill/10", label: "ХҮСЭЛТ" },
    audit: { icon: <ShieldCheck size={9} />, cls: "text-accent-cyan-text border-accent-cyan-fill/30 bg-accent-cyan-fill/10", label: "АУДИТ" },
    export: { icon: <Download size={9} />, cls: "text-accent-orange-text border-accent-orange-fill/30 bg-accent-orange-fill/10", label: "ЭКСПОРТ" },
    risk: { icon: <AlertTriangle size={9} />, cls: "text-state-unmatched-text border-state-unmatched-fill/30 bg-state-unmatched-fill/10", label: "ЭРСДЭЛ" },
    login: { icon: <User size={9} />, cls: "text-accent-slate-text border-accent-slate-fill/30 bg-accent-slate-fill/10", label: "НЭВТРЭЛТ" },
  } as const;

  const filtered = AUDIT_LOG.filter(
    (e) => !search || e.action.toLowerCase().includes(search.toLowerCase()) || e.user.toLowerCase().includes(search.toLowerCase()) || e.detail.toLowerCase().includes(search.toLowerCase())
  );

  const dates = [...new Set(filtered.map((e) => e.date))];

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto p-6 space-y-5">
        <div>
          <h1 className="text-xl font-bold text-foreground font-display">Аудит Лог</h1>
          <p className="text-xs text-muted-foreground mt-1 font-mono">
            Бүх чухал үйлдлийн цаг хугацааны бичлэг · RBAC · SHA-256
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border border-border rounded-xl p-1 bg-card/40">
          {([["log", "Бүх лог"], ["pending", `Хүлээгдэж буй (${PENDING_APPROVALS.length})`]] as const).map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setActiveAuditTab(tab)}
              className={`flex-1 text-xs py-2 rounded-lg font-semibold transition-colors ${activeAuditTab === tab ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Pending approvals tab */}
        {activeAuditTab === "pending" && (
          <div className="space-y-3">
            {PENDING_APPROVALS.map((item) => (
              <div key={item.id} className="rounded-xl border border-state-partial-fill/20 bg-state-partial-fill/5 p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-semibold text-foreground">{item.item}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 font-mono">
                      {item.dept} · {item.requestedBy} · {item.time}
                    </div>
                  </div>
                  <div className="text-sm font-bold text-foreground shrink-0 font-mono">{fmt(item.amount)}</div>
                </div>
                {userRole === "admin" ? (
                  <div className="flex gap-2">
                    <button className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-state-matched-fill-strong hover:bg-state-matched-fill text-white text-xs font-bold transition-colors">
                      <Check size={11} />Зөвшөөрөх
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-state-unmatched-fill-strong/80 hover:bg-state-unmatched-fill-strong text-white text-xs font-bold transition-colors">
                      <X size={11} />Татгалзах
                    </button>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground font-mono">
                    Зөвхөн admin батлах боломжтой · Таны эрх: {userRole}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Audit log tab */}
        {activeAuditTab === "log" && (
          <>
            <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-3.5 py-2.5 focus-within:border-primary/40 transition-colors">
              <Search size={12} className="text-muted-foreground shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Хайх…"
                className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none font-mono"

              />
            </div>

            {dates.map((date) => {
              const events = filtered.filter((e) => e.date === date);
              return (
                <div key={date}>
                  <div className="text-2xs text-muted-foreground uppercase tracking-widest mb-2 px-1 font-mono">{date}</div>
                  <div className="space-y-2">
                    {events.map((event) => {
                      const cfg = typeConfig[event.type];
                      return (
                        <div key={event.id} className="flex gap-3 rounded-xl border border-border bg-card p-3.5 hover:border-primary/20 transition-colors">
                          <div className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${cfg.cls}`}>{cfg.icon}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-foreground">{event.action}</span>
                              <span className={`text-2xs px-1.5 py-0.5 rounded border ml-auto shrink-0 ${cfg.cls} font-mono`}>
                                {cfg.label}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">{event.detail}</div>
                            <div className="flex items-center gap-3 mt-1.5 text-2xs text-muted-foreground font-mono">
                              <span>{event.time}</span>
                              <span>·</span>
                              <span>{event.user}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {filtered.length === 0 && (
              <div className="text-center py-12 text-muted-foreground text-sm">Хайлтад тохирох үр дүн олдсонгүй</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
