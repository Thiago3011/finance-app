import { useEffect, useState } from "react"
import {
  PieChart, Pie, Cell, Tooltip, Legend,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer
} from "recharts"
import {
  getTransactions, getSummary, createTransaction, deleteTransaction,
  getCategories, getCategorySummary, getMonthlySummary, getAccounts,
  createInstallment, markTransactionPaid, getInstallmentsSummary,
  getRecurring, createRecurring, updateRecurring, deleteRecurring
} from "./api/api"

// ─── helpers ─────────────────────────────────────────────────────────────
function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)
}
function fmtDate(d: string) {
  if (!d) return "-"
  const [y, m, day] = d.split("-")
  return `${day}/${m}/${y}`
}
const MONTHS_PT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"]
const COLORS = ["#7c6dfa","#fa6d8f","#6dfabc","#fad26d","#6db8fa","#fa8c6d","#c46dfa"]
const ICON_OPTIONS = ["💡","🌊","📱","🌐","🏠","🚗","💊","📺","🎮","🎵","☕","🏋️","📚","✈️","🐾","🛡️","💳","🔑","📄","🏦"]

const DEBT_TYPE_CONFIG: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  parcelamento: { label: "Parcelamento",  icon: "💳", color: "#7c6dfa", bg: "rgba(124,109,250,.12)" },
  financiamento:{ label: "Financiamento", icon: "🏦", color: "#fad26d", bg: "rgba(250,210,109,.12)" },
  emprestimo:   { label: "Empréstimo",    icon: "🤝", color: "#fa6d8f", bg: "rgba(250,109,143,.12)" },
}

// ─── CSS ─────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600&family=Bricolage+Grotesque:wght@700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#08080f;--s1:#0f0f1a;--s2:#17172a;--s3:#1f1f35;
  --b1:#ffffff0d;--b2:#ffffff1a;--b3:#ffffff28;
  --acc:#7c6dfa;--acc2:#fa6d8f;--acc3:#6dfabc;
  --text:#eeeef8;--muted:#5a5a72;--muted2:#8888a8;
  --green:#4ade80;--red:#f87171;--yellow:#fbbf24;--r:14px;
}
body{background:var(--bg);color:var(--text);font-family:'Plus Jakarta Sans',sans-serif;min-height:100vh}
.app{max-width:1280px;margin:0 auto;padding:28px 24px}

/* HEADER */
.hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:32px}
.logo{font-family:'Bricolage Grotesque',sans-serif;font-size:26px;font-weight:800;background:linear-gradient(130deg,var(--acc),var(--acc2) 60%,var(--acc3));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}

/* PERIOD NAV */
.period-nav{display:flex;align-items:center;gap:6px;background:var(--s2);border:1px solid var(--b2);border-radius:40px;padding:5px 8px}
.period-arrow{background:none;border:none;color:var(--muted2);cursor:pointer;font-size:18px;padding:4px 8px;border-radius:6px;transition:color .15s;line-height:1}
.period-arrow:hover{color:var(--text)}
.period-label{font-size:14px;font-weight:600;min-width:80px;text-align:center;color:var(--text)}
.view-toggle{display:flex;gap:2px;background:var(--s2);border:1px solid var(--b2);border-radius:8px;padding:3px}
.view-btn{background:none;border:none;color:var(--muted2);cursor:pointer;font-size:12px;font-weight:600;padding:5px 10px;border-radius:6px;transition:all .15s;font-family:'Plus Jakarta Sans',sans-serif}
.view-btn.active{background:var(--s3);color:var(--text)}

/* SUMMARY CARDS */
.sum-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:24px}
.sum-card{background:var(--s1);border:1px solid var(--b1);border-radius:var(--r);padding:22px 24px;position:relative;overflow:hidden;transition:border-color .2s,transform .2s}
.sum-card:hover{transform:translateY(-2px);border-color:var(--b2)}
.sum-card::after{content:'';position:absolute;top:0;left:0;right:0;height:2px;border-radius:2px 2px 0 0}
.sum-card.inc::after{background:var(--green)}.sum-card.exp::after{background:var(--red)}.sum-card.bal::after{background:linear-gradient(90deg,var(--acc),var(--acc2))}
.sc-label{font-size:11px;font-weight:600;color:var(--muted2);text-transform:uppercase;letter-spacing:.9px;margin-bottom:10px}
.sc-value{font-family:'Bricolage Grotesque',sans-serif;font-size:30px;font-weight:700;line-height:1;letter-spacing:-1px}
.sc-value.g{color:var(--green)}.sc-value.r{color:var(--red)}
.sc-sub{font-size:12px;color:var(--muted2);margin-top:6px}
.sc-icon{position:absolute;right:18px;top:18px;font-size:32px;opacity:.08}

/* GRIDS */
.grid2{display:grid;grid-template-columns:1fr 320px;gap:18px;margin-bottom:18px}
.grid2b{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:18px}

/* PANEL */
.panel{background:var(--s1);border:1px solid var(--b1);border-radius:var(--r);padding:22px}
.panel-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}
.panel-title{font-family:'Bricolage Grotesque',sans-serif;font-size:15px;font-weight:700}
.panel-sub{font-size:12px;color:var(--muted2);margin-top:2px}

/* INPUTS */
input,select{background:var(--s2);border:1px solid var(--b2);border-radius:10px;color:var(--text);font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;padding:9px 13px;outline:none;transition:border-color .2s;width:100%}
input:focus,select:focus{border-color:var(--acc)}
input::placeholder{color:var(--muted)}
select option{background:var(--s2)}
.form-row{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px}
.form-row>*{flex:1;min-width:110px}

/* BUTTONS */
.btn{border:none;border-radius:10px;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;font-weight:600;padding:9px 18px;transition:all .2s;white-space:nowrap}
.btn-p{background:var(--acc);color:#fff}.btn-p:hover{background:#6a5ce8;transform:translateY(-1px)}
.btn-s{background:var(--s2);color:var(--text);border:1px solid var(--b2)}.btn-s:hover{border-color:var(--acc)}
.btn-del{background:none;border:none;cursor:pointer;color:var(--muted);font-size:15px;padding:4px 7px;border-radius:6px;transition:all .15s}.btn-del:hover{color:var(--red);background:rgba(248,113,113,.1)}
.btn-edit{background:none;border:none;cursor:pointer;color:var(--muted);font-size:14px;padding:4px 7px;border-radius:6px;transition:all .15s}.btn-edit:hover{color:var(--acc);background:rgba(124,109,250,.1)}

/* DEBT TYPE SELECTOR */
.debt-type-btns{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}
.debt-type-btn{display:flex;align-items:center;gap:6px;background:var(--s2);border:1px solid var(--b2);border-radius:10px;color:var(--muted2);cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;font-weight:500;padding:9px 16px;transition:all .2s;flex:1;justify-content:center}
.debt-type-btn:hover{border-color:var(--b3);color:var(--text)}
.debt-type-btn.sel-parcelamento{background:rgba(124,109,250,.15);border-color:#7c6dfa;color:#b0a8ff}
.debt-type-btn.sel-financiamento{background:rgba(250,210,109,.15);border-color:#fad26d;color:#fad26d}
.debt-type-btn.sel-emprestimo{background:rgba(250,109,143,.15);border-color:#fa6d8f;color:#fa6d8f}

/* TOGGLE / COLLAPSE */
.toggle-btn{display:inline-flex;align-items:center;gap:7px;background:var(--s2);border:1px solid var(--b2);border-radius:10px;color:var(--muted2);cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;font-weight:500;padding:9px 16px;margin-bottom:10px;transition:all .2s}
.toggle-btn.on{background:rgba(124,109,250,.12);border-color:var(--acc);color:var(--acc)}
.toggle-btn:hover{border-color:var(--acc);color:var(--text)}
.collapse-box{background:var(--s2);border:1px solid var(--b2);border-radius:var(--r);margin-bottom:12px}
.collapse-box.on{border-color:rgba(124,109,250,.4)}
.collapse-body{padding:18px;display:flex;flex-wrap:wrap;gap:8px}
.hint{width:100%;background:rgba(124,109,250,.1);border:1px solid rgba(124,109,250,.2);border-radius:8px;color:#b0a8ff;font-size:12px;padding:9px 13px}

/* TABS */
.tab-bar{display:flex;gap:3px;background:var(--s2);border-radius:10px;padding:3px;width:fit-content;margin-bottom:16px}
.tab{background:none;border:none;border-radius:8px;color:var(--muted2);cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;font-weight:500;padding:7px 16px;transition:all .18s}
.tab.on{background:var(--s1);color:var(--text);box-shadow:0 2px 6px rgba(0,0,0,.3)}

/* TABLE */
.tbl-wrap{overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:13px}
th{text-align:left;padding:9px 13px;font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.8px;border-bottom:1px solid var(--b1)}
td{padding:11px 13px;border-bottom:1px solid var(--b1);vertical-align:middle}
tr:last-child td{border-bottom:none}
tr:hover td{background:rgba(255,255,255,.015)}
tr.paid-row{background:rgba(74,222,128,.03)}

/* BADGES */
.badge{display:inline-flex;align-items:center;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:600;white-space:nowrap}
.b-exp{background:rgba(248,113,113,.12);color:var(--red)}
.b-inc{background:rgba(74,222,128,.12);color:var(--green)}
.b-inst{background:rgba(124,109,250,.12);color:var(--acc);font-size:10px}
.b-paid{background:rgba(74,222,128,.1);color:var(--green);font-size:10px}
.b-over{background:rgba(248,113,113,.1);color:var(--red);font-size:10px}
.b-up{background:rgba(74,222,128,.1);color:var(--green);font-size:10px}
.badge-count{background:var(--s2);border:1px solid var(--b2);border-radius:20px;color:var(--muted2);font-size:11px;padding:2px 9px}
.paid-btn{background:none;border:none;cursor:pointer;font-size:17px;padding:2px 5px;border-radius:6px;transition:background .15s}
.paid-btn:hover{background:var(--b2)}

/* DEBT TABS (parcelamento/financiamento/emprestimo filter) */
.debt-filter{display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap}
.debt-filter-btn{display:flex;align-items:center;gap:5px;background:var(--s2);border:1px solid var(--b2);border-radius:8px;color:var(--muted2);cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;font-size:12px;padding:5px 12px;transition:all .18s}
.debt-filter-btn.active{color:var(--text);border-color:var(--b3)}
.debt-filter-btn.active-parcelamento{background:rgba(124,109,250,.15);border-color:#7c6dfa;color:#b0a8ff}
.debt-filter-btn.active-financiamento{background:rgba(250,210,109,.15);border-color:#fad26d;color:#fad26d}
.debt-filter-btn.active-emprestimo{background:rgba(250,109,143,.15);border-color:#fa6d8f;color:#fa6d8f}

/* INSTALLMENT CARDS */
.inst-list{display:flex;flex-direction:column;gap:12px;max-height:520px;overflow-y:auto;padding-right:2px}
.inst-card{background:var(--s1);border:1px solid var(--b2);border-radius:12px;padding:15px;transition:border-color .2s}
.inst-card:hover{border-color:var(--b3)}
.inst-card.done{opacity:.45}
.inst-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px}
.inst-name{font-weight:600;font-size:14px;margin-bottom:4px}
.inst-sub{font-size:11px;color:var(--muted2)}
.inst-right{text-align:right}
.inst-rem{font-family:'Bricolage Grotesque',sans-serif;font-size:19px;font-weight:700;line-height:1}
.inst-paid-amt{font-size:11px;color:var(--muted2);margin-top:2px}
.prog-wrap{background:var(--b1);border-radius:99px;height:5px;margin-bottom:8px;overflow:hidden}
.prog-fill{height:100%;border-radius:99px;transition:width .4s}
.inst-bot{display:flex;justify-content:space-between;align-items:center}
.inst-count{font-size:11px;color:var(--muted2)}
.inst-next{font-size:11px;background:rgba(251,191,36,.1);color:var(--yellow);border-radius:5px;padding:2px 7px}
.inst-done{font-size:11px;background:rgba(74,222,128,.1);color:var(--green);border-radius:5px;padding:2px 7px}
.debt-row{display:flex;gap:12px;margin-bottom:16px}
.debt-chip{background:var(--s2);border:1px solid var(--b2);border-radius:10px;padding:10px 14px;flex:1}
.debt-chip-label{font-size:10px;font-weight:700;color:var(--muted2);text-transform:uppercase;letter-spacing:.7px;margin-bottom:4px}
.debt-chip-val{font-family:'Bricolage Grotesque',sans-serif;font-size:18px;font-weight:700}

/* CONTAS FIXAS */
.rec-summary{display:flex;gap:10px;margin-bottom:16px}
.rec-chip{background:var(--s2);border:1px solid var(--b2);border-radius:10px;padding:10px 14px;flex:1;text-align:center}
.rec-chip-val{font-family:'Bricolage Grotesque',sans-serif;font-size:20px;font-weight:700;color:var(--red)}
.rec-chip-label{font-size:10px;font-weight:700;color:var(--muted2);text-transform:uppercase;letter-spacing:.7px;margin-top:3px}
.rec-list{display:flex;flex-direction:column;gap:8px}
.rec-item{display:flex;align-items:center;justify-content:space-between;background:var(--s2);border:1px solid var(--b2);border-radius:10px;padding:12px 14px;transition:border-color .2s}
.rec-item:hover{border-color:var(--b3)}
.rec-item.inactive{opacity:.4}
.rec-left{display:flex;align-items:center;gap:11px}
.rec-ico{width:36px;height:36px;border-radius:9px;background:rgba(124,109,250,.12);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
.rec-name{font-size:13px;font-weight:600}
.rec-day{font-size:11px;color:var(--muted2);margin-top:1px}
.rec-right{display:flex;align-items:center;gap:8px}
.rec-amt{font-family:'Bricolage Grotesque',sans-serif;font-size:16px;font-weight:700;color:var(--red)}
.rec-actions{display:flex;gap:2px;opacity:0;transition:opacity .15s}
.rec-item:hover .rec-actions{opacity:1}

/* MODAL */
.modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center;z-index:100;padding:20px}
.modal{background:var(--s1);border:1px solid var(--b2);border-radius:var(--r);padding:28px;width:100%;max-width:440px;max-height:90vh;overflow-y:auto}
.modal-title{font-family:'Bricolage Grotesque',sans-serif;font-size:18px;font-weight:700;margin-bottom:20px}
.modal-footer{display:flex;gap:10px;justify-content:flex-end;margin-top:20px}
.field-label{font-size:11px;font-weight:700;color:var(--muted2);text-transform:uppercase;letter-spacing:.7px;margin-bottom:6px;display:block}
.icon-grid{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
.icon-opt{background:var(--s2);border:1px solid var(--b2);border-radius:8px;cursor:pointer;font-size:18px;padding:7px 10px;transition:all .15s;line-height:1}
.icon-opt:hover{border-color:var(--acc)}
.icon-opt.sel{border-color:var(--acc);background:rgba(124,109,250,.15)}

@media(max-width:900px){.sum-grid{grid-template-columns:1fr 1fr}.grid2,.grid2b{grid-template-columns:1fr}}
@media(max-width:560px){.sum-grid{grid-template-columns:1fr}}
`

// ─── RECURRING MODAL ─────────────────────────────────────────────────────
interface RecurringItem {
  id: number; name: string; amount: number; due_day: number
  icon: string; active: boolean; category_id?: number; status?: string
}

function RecurringModal({ initial, categories, onSave, onClose }: {
  initial?: RecurringItem | null
  categories: any[]
  onSave: (data: any) => void
  onClose: () => void
}) {
  const [name, setName] = useState(initial?.name ?? "")
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "")
  const [dueDay, setDueDay] = useState(initial ? String(initial.due_day) : "")
  const [icon, setIcon] = useState(initial?.icon ?? "📄")
  const [categoryId, setCategoryId] = useState(initial?.category_id ? String(initial.category_id) : "")
  const [active, setActive] = useState(initial?.active ?? true)

  function handleSave(e: any) {
    e.preventDefault()
    if (!name || !amount || !dueDay) { alert("Preencha nome, valor e dia"); return }
    onSave({ name, amount: Number(amount), due_day: Number(dueDay), icon, category_id: categoryId ? Number(categoryId) : null, active })
  }

  return (
    <div className="modal-bg" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <div className="modal-title">{initial ? "Editar conta fixa" : "Nova conta fixa"}</div>
        <form onSubmit={handleSave}>
          <div style={{ marginBottom: 16 }}>
            <span className="field-label">Ícone</span>
            <div className="icon-grid">
              {ICON_OPTIONS.map(ic => (
                <button key={ic} type="button" className={`icon-opt ${icon === ic ? "sel" : ""}`} onClick={() => setIcon(ic)}>{ic}</button>
              ))}
            </div>
          </div>
          <div className="form-row" style={{ marginBottom: 12 }}>
            <div style={{ flex: 2, minWidth: 160 }}>
              <span className="field-label">Nome</span>
              <input placeholder="Ex: Luz, Netflix, Academia" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div style={{ flex: 1, minWidth: 90 }}>
              <span className="field-label">Valor</span>
              <input type="number" placeholder="0,00" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
          </div>
          <div className="form-row" style={{ marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <span className="field-label">Dia de vencimento</span>
              <input type="number" min="1" max="31" placeholder="Ex: 10" value={dueDay} onChange={e => setDueDay(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <span className="field-label">Categoria</span>
              <select value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                <option value="">Sem categoria</option>
                {categories.filter(c => c.type === "expense").map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input type="checkbox" id="active-chk" checked={active} onChange={e => setActive(e.target.checked)} style={{ width: "auto", cursor: "pointer" }} />
            <label htmlFor="active-chk" style={{ fontSize: 13, color: "var(--muted2)", cursor: "pointer" }}>Conta ativa</label>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-s" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-p">Salvar</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const now = new Date()
  const [viewMode, setViewMode] = useState<"month" | "year">("month")
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const [expenses, setExpenses] = useState<any[]>([])
  const [income, setIncome] = useState<any[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [categories, setCategories] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [categorySummary, setCategorySummary] = useState<any[]>([])
  const [monthlyData, setMonthlyData] = useState<any[]>([])
  const [installmentsSummary, setInstallmentsSummary] = useState<any[]>([])
  const [recurring, setRecurring] = useState<RecurringItem[]>([])
  const [recurringTotal, setRecurringTotal] = useState(0)

  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [type, setType] = useState("expense")
  const [categoryId, setCategoryId] = useState("")
  const [accountId, setAccountId] = useState("")
  const [date, setDate] = useState(now.toISOString().slice(0, 10))

  const [showInstallment, setShowInstallment] = useState(false)
  const [debtType, setDebtType] = useState("parcelamento")
  const [installment, setInstallment] = useState({
    description: "", total_amount: "", total_installments: "",
    start_date: now.toISOString().slice(0, 10)
  })
  const [installCategoryId, setInstallCategoryId] = useState("")
  const [installAccountId, setInstallAccountId] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const [activeTab, setActiveTab] = useState<"expense" | "income">("expense")
  const [debtFilter, setDebtFilter] = useState<string>("todos")

  const [showRecurringModal, setShowRecurringModal] = useState(false)
  const [editingRecurring, setEditingRecurring] = useState<RecurringItem | null>(null)

  const filters = viewMode === "month" ? { year, month } : { year }

  useEffect(() => { loadAll() }, [year, month, viewMode])

  async function loadAll() {
    const [exp, inc, s, c, cs, ms, a, is_, rec] = await Promise.all([
      getTransactions("expense", filters),
      getTransactions("income", filters),
      getSummary(filters),
      getCategories(),
      getCategorySummary(filters),
      getMonthlySummary(viewMode === "year" ? year : undefined),
      getAccounts(),
      getInstallmentsSummary(),
      getRecurring()
    ])
    setExpenses(exp); setIncome(inc); setSummary(s)
    setCategories(c); setCategorySummary(cs); setMonthlyData(ms)
    setAccounts(a); setInstallmentsSummary(is_)
    const today = now.getDate()
    const enriched = rec.map((r: RecurringItem) => ({ ...r, status: r.due_day >= today ? "upcoming" : "overdue" }))
    setRecurring(enriched)
    setRecurringTotal(enriched.filter((r: RecurringItem) => r.active).reduce((a: number, r: RecurringItem) => a + r.amount, 0))
  }

  function prevPeriod() {
    if (viewMode === "month") { if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1) }
    else setYear(y => y - 1)
  }
  function nextPeriod() {
    if (viewMode === "month") { if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1) }
    else setYear(y => y + 1)
  }

  const periodLabel = viewMode === "month" ? `${MONTHS_PT[month - 1]} ${year}` : `${year}`

  async function handleSubmit(e: any) {
    e.preventDefault()
    if (!description || !amount || !categoryId || !accountId) { alert("Preencha todos os campos!"); return }
    await createTransaction({ description, amount: parseFloat(amount), type, category_id: Number(categoryId), account_id: Number(accountId), date })
    setDescription(""); setAmount(""); setType("expense"); setCategoryId(""); setAccountId("")
    loadAll()
  }

  async function handleInstallmentSubmit(e: any) {
    e.preventDefault()
    if (submitting) return
    if (!installment.description || !installment.total_amount || !installment.total_installments || !installCategoryId || !installAccountId) {
      alert("Preencha todos os campos!"); return
    }
    setSubmitting(true)
    try {
      await createInstallment({
        description: installment.description,
        total_amount: Number(installment.total_amount),
        total_installments: Number(installment.total_installments),
        start_date: installment.start_date,
        category_id: Number(installCategoryId),
        account_id: Number(installAccountId),
        debt_type: debtType
      })
      setInstallment({ description: "", total_amount: "", total_installments: "", start_date: now.toISOString().slice(0, 10) })
      setInstallCategoryId(""); setInstallAccountId(""); setShowInstallment(false); loadAll()
    } finally { setSubmitting(false) }
  }

  async function handleSaveRecurring(data: any) {
    if (editingRecurring) await updateRecurring(editingRecurring.id, data)
    else await createRecurring(data)
    setShowRecurringModal(false); setEditingRecurring(null); loadAll()
  }

  async function handleDeleteRecurring(id: number) {
    if (!confirm("Remover esta conta fixa?")) return
    await deleteRecurring(id); loadAll()
  }

  function getCatName(id: number) { return categories.find(c => c.id === id)?.name ?? "-" }

  // Dívidas filtradas por tipo
  const filteredInst = debtFilter === "todos"
    ? installmentsSummary
    : installmentsSummary.filter(i => i.debt_type === debtFilter)

  const totalDebt = filteredInst.reduce((a, i) => a + i.total_remaining, 0)
  const totalMonthlyInst = filteredInst.filter(i => i.pending_installments > 0).reduce((a, i) => a + i.value_per_installment, 0)
  const activeInst = filteredInst.filter(i => i.pending_installments > 0)
  const doneInst = filteredInst.filter(i => i.pending_installments === 0)

  // Contagem por tipo para os filtros
  const countByType = (dt: string) => installmentsSummary.filter(i => i.debt_type === dt && i.pending_installments > 0).length

  const today = now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })

  return (
    <>
      <style>{CSS}</style>
      <div className="app">

        {/* HEADER */}
        <div className="hdr">
          <div className="logo">finance.</div>
          <div style={{ fontSize: 12, color: "var(--muted2)" }}>{today}</div>
        </div>

        {/* PERIOD NAV */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
          <div className="period-nav">
            <button className="period-arrow" onClick={prevPeriod}>‹</button>
            <span className="period-label">{periodLabel}</span>
            <button className="period-arrow" onClick={nextPeriod}>›</button>
          </div>
          <div className="view-toggle">
            <button className={`view-btn ${viewMode === "month" ? "active" : ""}`} onClick={() => setViewMode("month")}>Mensal</button>
            <button className={`view-btn ${viewMode === "year" ? "active" : ""}`} onClick={() => setViewMode("year")}>Anual</button>
          </div>
          {viewMode === "year" && (
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {MONTHS_PT.map((m, i) => (
                <button key={i} style={{ background: "var(--s2)", border: "1px solid var(--b2)", borderRadius: 8, color: "var(--muted2)", cursor: "pointer", fontSize: 11, fontFamily: "'Plus Jakarta Sans',sans-serif", padding: "4px 10px", transition: "all .15s" }}
                  onClick={() => { setViewMode("month"); setMonth(i + 1) }}>{m}</button>
              ))}
            </div>
          )}
        </div>

        {/* SUMMARY CARDS */}
        {summary && (
          <div className="sum-grid">
            <div className="sum-card inc">
              <div className="sc-label">Receitas</div>
              <div className="sc-value g">{fmt(summary.total_income)}</div>
              <div className="sc-sub">{periodLabel}</div>
              <div className="sc-icon">↑</div>
            </div>
            <div className="sum-card exp">
              <div className="sc-label">Despesas pagas</div>
              <div className="sc-value r">{fmt(summary.total_expense)}</div>
              <div className="sc-sub">parcelas pendentes não incluídas</div>
              <div className="sc-icon">↓</div>
            </div>
            <div className="sum-card bal">
              <div className="sc-label">Saldo real</div>
              <div className={`sc-value ${summary.balance >= 0 ? "g" : "r"}`}>{fmt(summary.balance)}</div>
              <div className="sc-sub">{summary.balance >= 0 ? "no positivo 👍" : "no negativo ⚠️"}</div>
              <div className="sc-icon">◎</div>
            </div>
          </div>
        )}

        {/* FORMS + PIZZA */}
        <div className="grid2">
          <div>
            {/* NOVA TRANSAÇÃO */}
            <div className="panel" style={{ marginBottom: 14 }}>
              <div className="panel-hdr"><div className="panel-title">Nova transação</div></div>
              <form onSubmit={handleSubmit}>
                <div className="form-row">
                  <input style={{ flex: 2, minWidth: 140 }} type="text" placeholder="Descrição" value={description} onChange={e => setDescription(e.target.value)} />
                  <input style={{ flex: 1, minWidth: 90 }} type="number" placeholder="Valor" value={amount} onChange={e => setAmount(e.target.value)} />
                </div>
                <div className="form-row">
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} />
                  <select value={type} onChange={e => { setType(e.target.value); setCategoryId("") }}>
                    <option value="expense">Despesa</option>
                    <option value="income">Receita</option>
                  </select>
                  <select value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                    <option value="">Categoria</option>
                    {categories.filter(c => c.type === type).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <select value={accountId} onChange={e => setAccountId(e.target.value)}>
                    <option value="">Conta</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                  <button type="submit" className="btn btn-p">+ Adicionar</button>
                </div>
              </form>
            </div>

            {/* PARCELAMENTO / FINANCIAMENTO / EMPRÉSTIMO */}
            <button className={`toggle-btn ${showInstallment ? "on" : ""}`} onClick={() => setShowInstallment(!showInstallment)}>
              💳 Nova dívida {showInstallment ? "▲" : "▼"}
            </button>

            {showInstallment && (
              <div className={`collapse-box ${showInstallment ? "on" : ""}`}>
                <div className="collapse-body">
                  {/* SELETOR DE TIPO */}
                  <div style={{ width: "100%" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted2)", textTransform: "uppercase", letterSpacing: ".7px", marginBottom: 8 }}>Tipo</div>
                    <div className="debt-type-btns">
                      {Object.entries(DEBT_TYPE_CONFIG).map(([key, cfg]) => (
                        <button
                          key={key}
                          type="button"
                          className={`debt-type-btn ${debtType === key ? `sel-${key}` : ""}`}
                          onClick={() => setDebtType(key)}
                        >
                          <span>{cfg.icon}</span>
                          <span>{cfg.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <form onSubmit={handleInstallmentSubmit} style={{ width: "100%", display: "flex", flexWrap: "wrap", gap: 8 }}>
                    <input style={{ flex: 2, minWidth: 140 }} placeholder="Descrição" value={installment.description} onChange={e => setInstallment({ ...installment, description: e.target.value })} />
                    <input style={{ flex: 1 }} type="number" placeholder="Valor total" value={installment.total_amount} onChange={e => setInstallment({ ...installment, total_amount: e.target.value })} />
                    <input style={{ flex: 1, minWidth: 80 }} type="number" placeholder="Parcelas" min="1" value={installment.total_installments} onChange={e => setInstallment({ ...installment, total_installments: e.target.value })} />
                    <input type="date" value={installment.start_date} onChange={e => setInstallment({ ...installment, start_date: e.target.value })} />
                    <select value={installCategoryId} onChange={e => setInstallCategoryId(e.target.value)}>
                      <option value="">Categoria</option>
                      {categories.filter(c => c.type === "expense").map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <select value={installAccountId} onChange={e => setInstallAccountId(e.target.value)}>
                      <option value="">Conta</option>
                      {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    {installment.total_amount && installment.total_installments && Number(installment.total_installments) > 0 && (
                      <div className="hint">
                        {DEBT_TYPE_CONFIG[debtType].icon} {DEBT_TYPE_CONFIG[debtType].label} · {fmt(Number(installment.total_amount) / Number(installment.total_installments))}/mês · Só impacta o saldo quando marcado como pago
                      </div>
                    )}
                    <button type="submit" disabled={submitting} className="btn btn-p" style={{ opacity: submitting ? .6 : 1 }}>
                      {submitting ? "Criando..." : `✅ Criar ${DEBT_TYPE_CONFIG[debtType].label}`}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>

          {/* PIZZA */}
          <div className="panel">
            <div className="panel-hdr">
              <div>
                <div className="panel-title">Por categoria</div>
                <div className="panel-sub">{periodLabel}</div>
              </div>
            </div>
            {categorySummary.length > 0 ? (
              <PieChart width={270} height={270}>
                <Pie data={categorySummary} dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={105} innerRadius={52}>
                  {categorySummary.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => fmt(v)} contentStyle={{ background: "#0f0f1a", border: "1px solid #ffffff15", borderRadius: 10, fontSize: 12 }} />
                <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            ) : (
              <div style={{ color: "var(--muted2)", fontSize: 13, textAlign: "center", paddingTop: 50 }}>Sem dados para {periodLabel}.</div>
            )}
          </div>
        </div>

        {/* GRÁFICO */}
        <div className="panel" style={{ marginBottom: 18 }}>
          <div className="panel-hdr">
            <div>
              <div className="panel-title">Evolução</div>
              <div className="panel-sub">{viewMode === "year" ? `Todos os meses de ${year}` : periodLabel}</div>
            </div>
          </div>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="gi" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4ade80" stopOpacity={.25} /><stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="ge" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f87171" stopOpacity={.25} /><stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff07" />
                <XAxis dataKey="month" tick={{ fill: "#5a5a72", fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={v => { const [, m] = v.split("-"); return MONTHS_PT[parseInt(m) - 1] ?? v }} />
                <YAxis tick={{ fill: "#5a5a72", fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => fmt(v)} contentStyle={{ background: "#0f0f1a", border: "1px solid #ffffff15", borderRadius: 10, fontSize: 12 }} />
                <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="income" name="Receita" stroke="#4ade80" fill="url(#gi)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="expense" name="Despesa" stroke="#f87171" fill="url(#ge)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ color: "var(--muted2)", fontSize: 13, textAlign: "center", padding: 40 }}>Sem dados para o período.</div>
          )}
        </div>

        {/* DÍVIDAS + CONTAS FIXAS */}
        <div className="grid2b">

          {/* DÍVIDAS */}
          <div className="panel">
            <div className="panel-hdr">
              <div>
                <div className="panel-title">Minhas dívidas</div>
                <div className="panel-sub">parcelamentos, financiamentos e empréstimos</div>
              </div>
              {activeInst.length > 0 && <span className="badge-count">{activeInst.length} ativo{activeInst.length > 1 ? "s" : ""}</span>}
            </div>

            {/* FILTRO POR TIPO */}
            <div className="debt-filter">
              {[
                { key: "todos", icon: "📋", label: "Todos" },
                { key: "parcelamento", icon: "💳", label: "Parcelamentos" },
                { key: "financiamento", icon: "🏦", label: "Financiamentos" },
                { key: "emprestimo", icon: "🤝", label: "Empréstimos" },
              ].map(f => {
                const count = f.key === "todos"
                  ? installmentsSummary.filter(i => i.pending_installments > 0).length
                  : countByType(f.key)
                return (
                  <button key={f.key}
                    className={`debt-filter-btn ${debtFilter === f.key ? (f.key === "todos" ? "active" : `active-${f.key}`) : ""}`}
                    onClick={() => setDebtFilter(f.key)}>
                    {f.icon} {f.label} {count > 0 && <span style={{ background: "var(--b2)", borderRadius: 10, padding: "1px 6px", fontSize: 10 }}>{count}</span>}
                  </button>
                )
              })}
            </div>

            {filteredInst.length > 0 && (
              <div className="debt-row">
                <div className="debt-chip">
                  <div className="debt-chip-label">Total em aberto</div>
                  <div className="debt-chip-val" style={{ color: "var(--red)" }}>{fmt(totalDebt)}</div>
                </div>
                <div className="debt-chip">
                  <div className="debt-chip-label">Compromisso mensal</div>
                  <div className="debt-chip-val" style={{ color: "var(--yellow)" }}>{fmt(totalMonthlyInst)}</div>
                </div>
              </div>
            )}

            {filteredInst.length === 0 ? (
              <div style={{ color: "var(--muted2)", fontSize: 13, textAlign: "center", padding: "28px 0" }}>
                {debtFilter === "todos" ? "Nenhuma dívida cadastrada." : `Nenhum ${DEBT_TYPE_CONFIG[debtFilter]?.label.toLowerCase() ?? debtFilter} cadastrado.`}
              </div>
            ) : (
              <div className="inst-list">
                {activeInst.map(inst => {
                  const cfg = DEBT_TYPE_CONFIG[inst.debt_type] ?? DEBT_TYPE_CONFIG.parcelamento
                  return (
                    <div key={inst.id} className="inst-card">
                      <div className="inst-top">
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                            <span style={{ background: cfg.bg, color: cfg.color, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>
                              {cfg.icon} {cfg.label}
                            </span>
                          </div>
                          <div className="inst-name">{inst.description}</div>
                          <div className="inst-sub">{fmt(inst.value_per_installment)}/mês</div>
                        </div>
                        <div className="inst-right">
                          <div className="inst-rem" style={{ color: cfg.color }}>{fmt(inst.total_remaining)}</div>
                          <div className="inst-paid-amt">pago: {fmt(inst.total_paid)}</div>
                        </div>
                      </div>
                      <div className="prog-wrap">
                        <div className="prog-fill" style={{ width: `${inst.progress_percent}%`, background: `linear-gradient(90deg, ${cfg.color}, ${cfg.color}aa)` }} />
                      </div>
                      <div className="inst-bot">
                        <div className="inst-count">{inst.paid_installments}/{inst.total_installments} · {inst.progress_percent}%</div>
                        {inst.next_due_date && <div className="inst-next">📅 {fmtDate(inst.next_due_date)}</div>}
                      </div>
                    </div>
                  )
                })}
                {doneInst.map(inst => {
                  const cfg = DEBT_TYPE_CONFIG[inst.debt_type] ?? DEBT_TYPE_CONFIG.parcelamento
                  return (
                    <div key={inst.id} className="inst-card done">
                      <div className="inst-top">
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                            <span style={{ background: cfg.bg, color: cfg.color, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>
                              {cfg.icon} {cfg.label}
                            </span>
                          </div>
                          <div className="inst-name">{inst.description}</div>
                          <div className="inst-sub">{inst.total_installments} parcelas</div>
                        </div>
                        <div className="inst-right">
                          <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 18, fontWeight: 700, color: "var(--green)" }}>{fmt(inst.total_paid)}</div>
                        </div>
                      </div>
                      <div className="prog-wrap">
                        <div className="prog-fill" style={{ width: "100%", background: "var(--green)" }} />
                      </div>
                      <div className="inst-bot">
                        <div className="inst-count">100% pago</div>
                        <div className="inst-done">✅ Quitado</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* CONTAS FIXAS */}
          <div className="panel">
            <div className="panel-hdr">
              <div>
                <div className="panel-title">Contas fixas</div>
                <div className="panel-sub">recorrências mensais</div>
              </div>
              <button className="btn btn-p" style={{ padding: "7px 14px", fontSize: 12 }}
                onClick={() => { setEditingRecurring(null); setShowRecurringModal(true) }}>
                + Nova
              </button>
            </div>

            {recurring.length > 0 && (
              <div className="rec-summary">
                <div className="rec-chip">
                  <div className="rec-chip-val">{fmt(recurringTotal)}</div>
                  <div className="rec-chip-label">Total mensal</div>
                </div>
                <div className="rec-chip">
                  <div className="rec-chip-val" style={{ color: "var(--muted2)", fontSize: 18 }}>{recurring.filter(r => r.active).length}</div>
                  <div className="rec-chip-label">Contas ativas</div>
                </div>
              </div>
            )}

            {recurring.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "32px 0", color: "var(--muted2)", fontSize: 13, textAlign: "center" }}>
                <div style={{ fontSize: 36, opacity: .3 }}>🧾</div>
                <div>Nenhuma conta fixa cadastrada.</div>
                <div style={{ fontSize: 11, color: "var(--muted)", maxWidth: 200, lineHeight: 1.5 }}>Adicione luz, água, internet, assinaturas e outras recorrências mensais.</div>
              </div>
            ) : (
              <div className="rec-list">
                {recurring.map(item => (
                  <div key={item.id} className={`rec-item ${!item.active ? "inactive" : ""}`}>
                    <div className="rec-left">
                      <div className="rec-ico">{item.icon}</div>
                      <div>
                        <div className="rec-name">{item.name}</div>
                        <div className="rec-day">
                          dia {item.due_day}
                          {item.active && (
                            <span style={{ marginLeft: 6 }}>
                              {item.status === "overdue"
                                ? <span className="badge b-over">venceu</span>
                                : <span className="badge b-up">a vencer</span>}
                            </span>
                          )}
                          {!item.active && <span style={{ marginLeft: 6, fontSize: 10, color: "var(--muted)" }}>inativa</span>}
                        </div>
                      </div>
                    </div>
                    <div className="rec-right">
                      <div className="rec-amt">{fmt(item.amount)}</div>
                      <div className="rec-actions">
                        <button className="btn-edit" onClick={() => { setEditingRecurring(item); setShowRecurringModal(true) }}>✏️</button>
                        <button className="btn-del" onClick={() => handleDeleteRecurring(item.id)}>🗑</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* TRANSAÇÕES */}
        <div className="panel">
          <div className="panel-hdr">
            <div className="tab-bar">
              <button className={`tab ${activeTab === "expense" ? "on" : ""}`} onClick={() => setActiveTab("expense")}>Despesas</button>
              <button className={`tab ${activeTab === "income" ? "on" : ""}`} onClick={() => setActiveTab("income")}>Receitas</button>
            </div>
            <span className="badge-count">{activeTab === "expense" ? expenses.length : income.length} registros · {periodLabel}</span>
          </div>
          <div className="tbl-wrap">
            {activeTab === "expense" && (
              expenses.length === 0
                ? <div style={{ color: "var(--muted2)", fontSize: 13, textAlign: "center", padding: "28px 0" }}>Nenhuma despesa em {periodLabel}.</div>
                : (
                  <table>
                    <thead><tr><th>Descrição</th><th>Categoria</th><th>Data</th><th>Valor</th><th>Status</th><th></th></tr></thead>
                    <tbody>
                      {expenses.map(t => (
                        <tr key={t.id} className={t.paid && t.installment_id ? "paid-row" : ""}>
                          <td>
                            <div style={{ fontWeight: 500 }}>{t.description}</div>
                            {t.installment_id && <span className="badge b-inst" style={{ marginTop: 2 }}>parcelado</span>}
                          </td>
                          <td style={{ color: "var(--muted2)" }}>{getCatName(t.category_id)}</td>
                          <td style={{ color: "var(--muted2)" }}>{fmtDate(t.date)}</td>
                          <td><span className="badge b-exp">{fmt(t.amount)}</span></td>
                          <td>
                            {t.installment_id
                              ? <button className="paid-btn" title={t.paid ? "Marcar pendente" : "Marcar pago"}
                                  onClick={async () => { await markTransactionPaid(t.id, !t.paid); loadAll() }}>
                                  {t.paid ? "✅" : "⏳"}
                                </button>
                              : <span className="badge b-paid">✓ pago</span>
                            }
                          </td>
                          <td><button className="btn-del" onClick={() => { deleteTransaction(t.id); loadAll() }}>🗑</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
            )}
            {activeTab === "income" && (
              income.length === 0
                ? <div style={{ color: "var(--muted2)", fontSize: 13, textAlign: "center", padding: "28px 0" }}>Nenhuma receita em {periodLabel}.</div>
                : (
                  <table>
                    <thead><tr><th>Descrição</th><th>Categoria</th><th>Data</th><th>Valor</th><th></th></tr></thead>
                    <tbody>
                      {income.map(t => (
                        <tr key={t.id}>
                          <td style={{ fontWeight: 500 }}>{t.description}</td>
                          <td style={{ color: "var(--muted2)" }}>{getCatName(t.category_id)}</td>
                          <td style={{ color: "var(--muted2)" }}>{fmtDate(t.date)}</td>
                          <td><span className="badge b-inc">{fmt(t.amount)}</span></td>
                          <td><button className="btn-del" onClick={() => { deleteTransaction(t.id); loadAll() }}>🗑</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
            )}
          </div>
        </div>

      </div>

      {/* MODAL CONTAS FIXAS */}
      {showRecurringModal && (
        <RecurringModal
          initial={editingRecurring}
          categories={categories}
          onSave={handleSaveRecurring}
          onClose={() => { setShowRecurringModal(false); setEditingRecurring(null) }}
        />
      )}
    </>
  )
}