import { useEffect, useState } from "react"
import {
  PieChart, Pie, Cell, Tooltip, Legend,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer
} from "recharts"
import {
  getTransactions, getSummary, createTransaction, deleteTransaction,
  getCategories, getCategorySummary, getMonthlySummary, getAccounts,
  createInstallment, markTransactionPaid, getInstallmentsSummary
} from "./api/api"

// ─── helpers ────────────────────────────────────────────────────────────────
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

// ─── styles ─────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600&family=Bricolage+Grotesque:wght@700;800&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

:root{
  --bg:#08080f;
  --s1:#0f0f1a;
  --s2:#17172a;
  --s3:#1f1f35;
  --b1:#ffffff0d;
  --b2:#ffffff1a;
  --b3:#ffffff28;
  --acc:#7c6dfa;
  --acc2:#fa6d8f;
  --acc3:#6dfabc;
  --text:#eeeef8;
  --muted:#5a5a72;
  --muted2:#8888a8;
  --green:#4ade80;
  --red:#f87171;
  --yellow:#fbbf24;
  --r:14px;
}

body{background:var(--bg);color:var(--text);font-family:'Plus Jakarta Sans',sans-serif;min-height:100vh}
.app{max-width:1280px;margin:0 auto;padding:28px 24px}

/* HEADER */
.hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:32px}
.logo{font-family:'Bricolage Grotesque',sans-serif;font-size:26px;font-weight:800;background:linear-gradient(130deg,var(--acc),var(--acc2) 60%,var(--acc3));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.hdr-right{display:flex;align-items:center;gap:12px}

/* PERIOD NAV */
.period-nav{display:flex;align-items:center;gap:6px;background:var(--s2);border:1px solid var(--b2);border-radius:40px;padding:5px 8px}
.period-btn{background:none;border:none;color:var(--muted2);cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;font-weight:500;padding:5px 12px;border-radius:30px;transition:all .18s;white-space:nowrap}
.period-btn:hover{color:var(--text)}
.period-btn.active{background:var(--s3);color:var(--text);box-shadow:0 2px 8px rgba(0,0,0,.35)}
.period-arrow{background:none;border:none;color:var(--muted2);cursor:pointer;font-size:16px;padding:4px 6px;border-radius:6px;transition:color .15s}
.period-arrow:hover{color:var(--text)}
.period-label{font-size:14px;font-weight:600;min-width:80px;text-align:center;color:var(--text)}
.view-toggle{display:flex;gap:2px;background:var(--s2);border:1px solid var(--b2);border-radius:8px;padding:3px}
.view-btn{background:none;border:none;color:var(--muted2);cursor:pointer;font-size:12px;font-weight:600;padding:5px 10px;border-radius:6px;transition:all .15s;font-family:'Plus Jakarta Sans',sans-serif}
.view-btn.active{background:var(--s3);color:var(--text)}

/* SUMMARY CARDS */
.sum-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:24px}
.sum-card{background:var(--s1);border:1px solid var(--b1);border-radius:var(--r);padding:22px 24px;position:relative;overflow:hidden;transition:border-color .2s,transform .2s;cursor:default}
.sum-card:hover{transform:translateY(-2px);border-color:var(--b2)}
.sum-card::after{content:'';position:absolute;top:0;left:0;right:0;height:2px;border-radius:2px 2px 0 0}
.sum-card.inc::after{background:var(--green)}
.sum-card.exp::after{background:var(--red)}
.sum-card.bal::after{background:linear-gradient(90deg,var(--acc),var(--acc2))}
.sc-label{font-size:11px;font-weight:600;color:var(--muted2);text-transform:uppercase;letter-spacing:.9px;margin-bottom:10px}
.sc-value{font-family:'Bricolage Grotesque',sans-serif;font-size:30px;font-weight:700;line-height:1;letter-spacing:-1px}
.sc-value.g{color:var(--green)} .sc-value.r{color:var(--red)} .sc-value.w{color:var(--text)}
.sc-sub{font-size:12px;color:var(--muted2);margin-top:6px}
.sc-icon{position:absolute;right:18px;top:18px;font-size:32px;opacity:.08}

/* GRID LAYOUT */
.grid2{display:grid;grid-template-columns:1fr 320px;gap:18px;margin-bottom:18px}
.grid2b{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:18px}

/* PANEL */
.panel{background:var(--s1);border:1px solid var(--b1);border-radius:var(--r);padding:22px;transition:border-color .2s}
.panel-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}
.panel-title{font-family:'Bricolage Grotesque',sans-serif;font-size:15px;font-weight:700}
.panel-sub{font-size:12px;color:var(--muted2);margin-top:2px}

/* INPUTS */
input,select{background:var(--s2);border:1px solid var(--b2);border-radius:10px;color:var(--text);font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;padding:9px 13px;outline:none;transition:border-color .2s;width:100%}
input:focus,select:focus{border-color:var(--acc)}
input::placeholder{color:var(--muted)}
select option{background:var(--s2)}
.form-row{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px}
.form-row > *{flex:1;min-width:110px}

/* BUTTONS */
.btn{border:none;border-radius:10px;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;font-weight:600;padding:9px 18px;transition:all .2s;white-space:nowrap}
.btn-p{background:var(--acc);color:#fff} .btn-p:hover{background:#6a5ce8;transform:translateY(-1px)}
.btn-s{background:var(--s2);color:var(--text);border:1px solid var(--b2)} .btn-s:hover{border-color:var(--acc)}
.btn-ghost{background:none;border:1px solid var(--b2);color:var(--muted2);border-radius:8px;cursor:pointer;font-size:12px;font-weight:500;padding:5px 12px;font-family:'Plus Jakarta Sans',sans-serif;transition:all .15s} .btn-ghost:hover{border-color:var(--acc);color:var(--text)}
.btn-del{background:none;border:none;cursor:pointer;color:var(--muted);font-size:15px;padding:4px 7px;border-radius:6px;transition:all .15s} .btn-del:hover{color:var(--red);background:rgba(248,113,113,.1)}

/* COLLAPSIBLE TOGGLE */
.toggle-btn{display:inline-flex;align-items:center;gap:7px;background:var(--s2);border:1px solid var(--b2);border-radius:10px;color:var(--muted2);cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;font-weight:500;padding:9px 16px;margin-bottom:10px;transition:all .2s}
.toggle-btn.on{background:rgba(124,109,250,.12);border-color:var(--acc);color:var(--acc)}
.toggle-btn:hover{border-color:var(--acc);color:var(--text)}
.collapse-box{background:var(--s2);border:1px solid var(--b2);border-radius:var(--r);margin-bottom:12px;overflow:hidden}
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
.badge-count{background:var(--s2);border:1px solid var(--b2);border-radius:20px;color:var(--muted2);font-size:11px;padding:2px 9px}

/* PAID BUTTON */
.paid-btn{background:none;border:none;cursor:pointer;font-size:17px;padding:2px 5px;border-radius:6px;transition:background .15s}
.paid-btn:hover{background:var(--b2)}

/* INSTALLMENT CARDS */
.inst-list{display:flex;flex-direction:column;gap:12px}
.inst-card{background:var(--s2);border:1px solid var(--b2);border-radius:12px;padding:15px;transition:border-color .2s}
.inst-card:hover{border-color:var(--b3)}
.inst-card.done{opacity:.45}
.inst-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px}
.inst-name{font-weight:600;font-size:14px;margin-bottom:2px}
.inst-sub{font-size:11px;color:var(--muted2)}
.inst-right{text-align:right}
.inst-rem{font-family:'Bricolage Grotesque',sans-serif;font-size:19px;font-weight:700;color:var(--red);line-height:1}
.inst-paid-amt{font-size:11px;color:var(--muted2);margin-top:2px}
.prog-wrap{background:var(--b1);border-radius:99px;height:5px;margin-bottom:8px;overflow:hidden}
.prog-fill{height:100%;border-radius:99px;background:linear-gradient(90deg,var(--acc),var(--acc2));transition:width .4s}
.inst-bot{display:flex;justify-content:space-between;align-items:center}
.inst-count{font-size:11px;color:var(--muted2)}
.inst-next{font-size:11px;background:rgba(251,191,36,.1);color:var(--yellow);border-radius:5px;padding:2px 7px}
.inst-done{font-size:11px;background:rgba(74,222,128,.1);color:var(--green);border-radius:5px;padding:2px 7px}

/* DEBT SUMMARY ROW */
.debt-row{display:flex;gap:12px;margin-bottom:16px}
.debt-chip{background:var(--s2);border:1px solid var(--b2);border-radius:10px;padding:10px 14px;flex:1}
.debt-chip-label{font-size:10px;font-weight:700;color:var(--muted2);text-transform:uppercase;letter-spacing:.7px;margin-bottom:4px}
.debt-chip-val{font-family:'Bricolage Grotesque',sans-serif;font-size:18px;font-weight:700}

/* CONTAS FIXAS */
.fixed-list{display:flex;flex-direction:column;gap:10px}
.fixed-item{display:flex;align-items:center;justify-content:space-between;background:var(--s2);border:1px solid var(--b2);border-radius:10px;padding:13px 15px}
.fixed-left{display:flex;align-items:center;gap:11px}
.fixed-ico{width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0}
.fixed-name{font-size:13px;font-weight:600}
.fixed-day{font-size:11px;color:var(--muted2);margin-top:1px}
.fixed-amt{font-family:'Bricolage Grotesque',sans-serif;font-size:16px;font-weight:700;color:var(--red)}
.coming-soon{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:28px 0;color:var(--muted2);font-size:13px;text-align:center}
.coming-soon-icon{font-size:34px;opacity:.35}
.coming-soon-note{font-size:11px;color:var(--muted);max-width:200px;line-height:1.5}

@media(max-width:900px){
  .sum-grid{grid-template-columns:1fr 1fr}
  .grid2,.grid2b{grid-template-columns:1fr}
}
@media(max-width:560px){
  .sum-grid{grid-template-columns:1fr}
  .period-nav{flex-wrap:wrap;gap:4px}
}
`

// ─── MOCK contas fixas (até implementar) ────────────────────────────────────
const MOCK_FIXED = [
  { icon: "💡", name: "Luz", day: "todo dia 10", amount: 180, color: "#fad26d22" },
  { icon: "🌐", name: "Internet", day: "todo dia 5", amount: 120, color: "#6db8fa22" },
  { icon: "📱", name: "Celular", day: "todo dia 15", amount: 80, color: "#7c6dfa22" },
  { icon: "🏠", name: "Aluguel", day: "todo dia 1", amount: 1500, color: "#fa6d8f22" },
]

// ─── APP ─────────────────────────────────────────────────────────────────────
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

  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [type, setType] = useState("expense")
  const [categoryId, setCategoryId] = useState("")
  const [accountId, setAccountId] = useState("")
  const [date, setDate] = useState(now.toISOString().slice(0, 10))

  const [showInstallment, setShowInstallment] = useState(false)
  const [installment, setInstallment] = useState({
    description: "", total_amount: "", total_installments: "",
    start_date: now.toISOString().slice(0, 10)
  })
  const [installCategoryId, setInstallCategoryId] = useState("")
  const [installAccountId, setInstallAccountId] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const [activeTab, setActiveTab] = useState<"expense" | "income">("expense")

  // filtros derivados do viewMode
  const filters = viewMode === "month" ? { year, month } : { year }

  useEffect(() => { loadAll() }, [year, month, viewMode])

  async function loadAll() {
    const [exp, inc, s, c, cs, ms, a, is_] = await Promise.all([
      getTransactions("expense", filters),
      getTransactions("income", filters),
      getSummary(filters),
      getCategories(),
      getCategorySummary(filters),
      getMonthlySummary(viewMode === "year" ? year : undefined),
      getAccounts(),
      getInstallmentsSummary()
    ])
    setExpenses(exp); setIncome(inc); setSummary(s)
    setCategories(c); setCategorySummary(cs); setMonthlyData(ms)
    setAccounts(a); setInstallmentsSummary(is_)
  }

  function prevPeriod() {
    if (viewMode === "month") {
      if (month === 1) { setMonth(12); setYear(y => y - 1) }
      else setMonth(m => m - 1)
    } else setYear(y => y - 1)
  }

  function nextPeriod() {
    if (viewMode === "month") {
      if (month === 12) { setMonth(1); setYear(y => y + 1) }
      else setMonth(m => m + 1)
    } else setYear(y => y + 1)
  }

  const periodLabel = viewMode === "month"
    ? `${MONTHS_PT[month - 1]} ${year}`
    : `${year}`

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
        account_id: Number(installAccountId)
      })
      setInstallment({ description: "", total_amount: "", total_installments: "", start_date: now.toISOString().slice(0, 10) })
      setInstallCategoryId(""); setInstallAccountId("")
      setShowInstallment(false)
      loadAll()
    } finally { setSubmitting(false) }
  }

  function getCatName(id: number) { return categories.find(c => c.id === id)?.name ?? "-" }

  const totalDebt = installmentsSummary.reduce((a, i) => a + i.total_remaining, 0)
  const totalMonthlyInstallments = installmentsSummary
    .filter(i => i.pending_installments > 0)
    .reduce((a, i) => a + i.value_per_installment, 0)
  const activeInst = installmentsSummary.filter(i => i.pending_installments > 0)
  const doneInst = installmentsSummary.filter(i => i.pending_installments === 0)

  const chartData = viewMode === "year"
    ? monthlyData
    : monthlyData.filter(d => d.month.startsWith(`${year}-${String(month).padStart(2,"0")}`))

  const today = now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })

  return (
    <>
      <style>{CSS}</style>
      <div className="app">

        {/* HEADER */}
        <div className="hdr">
          <div className="logo">finance.</div>
          <div className="hdr-right">
            <div style={{ fontSize: 12, color: "var(--muted2)" }}>{today}</div>
          </div>
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
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {MONTHS_PT.map((m, i) => (
                <button
                  key={i}
                  className={`btn-ghost`}
                  style={{ padding: "4px 10px", fontSize: 11 }}
                  onClick={() => { setViewMode("month"); setMonth(i + 1) }}
                >
                  {m}
                </button>
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
              <div className="sc-sub">{viewMode === "month" ? periodLabel : `ano ${year}`}</div>
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

        {/* MAIN GRID: forms + pizza */}
        <div className="grid2">
          <div>
            {/* NOVA TRANSAÇÃO */}
            <div className="panel" style={{ marginBottom: 14 }}>
              <div className="panel-hdr">
                <div className="panel-title">Nova transação</div>
              </div>
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

            {/* PARCELAMENTO */}
            <button className={`toggle-btn ${showInstallment ? "on" : ""}`} onClick={() => setShowInstallment(!showInstallment)}>
              💳 Criar parcelamento {showInstallment ? "▲" : "▼"}
            </button>
            {showInstallment && (
              <div className={`collapse-box ${showInstallment ? "on" : ""}`}>
                <form onSubmit={handleInstallmentSubmit}>
                  <div className="collapse-body">
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
                        💡 {fmt(Number(installment.total_amount) / Number(installment.total_installments))}/mês · Só impacta o saldo quando marcado como pago
                      </div>
                    )}
                    <button type="submit" disabled={submitting} className="btn btn-p" style={{ opacity: submitting ? .6 : 1 }}>
                      {submitting ? "Criando..." : "✅ Confirmar"}
                    </button>
                  </div>
                </form>
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

        {/* GRÁFICO EVOLUÇÃO */}
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
                    <stop offset="5%" stopColor="#4ade80" stopOpacity={.25} />
                    <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="ge" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f87171" stopOpacity={.25} />
                    <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
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

          {/* PARCELAMENTOS */}
          <div className="panel">
            <div className="panel-hdr">
              <div>
                <div className="panel-title">Minhas dívidas</div>
                <div className="panel-sub">parcelamentos em aberto</div>
              </div>
              {activeInst.length > 0 && <span className="badge-count">{activeInst.length} ativo{activeInst.length > 1 ? "s" : ""}</span>}
            </div>

            {installmentsSummary.length > 0 && (
              <div className="debt-row">
                <div className="debt-chip">
                  <div className="debt-chip-label">Total em dívidas</div>
                  <div className="debt-chip-val" style={{ color: "var(--red)" }}>{fmt(totalDebt)}</div>
                </div>
                <div className="debt-chip">
                  <div className="debt-chip-label">Compromisso mensal</div>
                  <div className="debt-chip-val" style={{ color: "var(--yellow)" }}>{fmt(totalMonthlyInstallments)}</div>
                </div>
              </div>
            )}

            {installmentsSummary.length === 0 ? (
              <div style={{ color: "var(--muted2)", fontSize: 13, textAlign: "center", padding: "28px 0" }}>
                Nenhum parcelamento cadastrado.
              </div>
            ) : (
              <div className="inst-list">
                {activeInst.map(inst => (
                  <div key={inst.id} className="inst-card">
                    <div className="inst-top">
                      <div>
                        <div className="inst-name">{inst.description}</div>
                        <div className="inst-sub">{fmt(inst.value_per_installment)}/mês</div>
                      </div>
                      <div className="inst-right">
                        <div className="inst-rem">{fmt(inst.total_remaining)}</div>
                        <div className="inst-paid-amt">pago: {fmt(inst.total_paid)}</div>
                      </div>
                    </div>
                    <div className="prog-wrap">
                      <div className="prog-fill" style={{ width: `${inst.progress_percent}%` }} />
                    </div>
                    <div className="inst-bot">
                      <div className="inst-count">{inst.paid_installments}/{inst.total_installments} parcelas · {inst.progress_percent}%</div>
                      {inst.next_due_date && (
                        <div className="inst-next">📅 {fmtDate(inst.next_due_date)}</div>
                      )}
                    </div>
                  </div>
                ))}
                {doneInst.map(inst => (
                  <div key={inst.id} className="inst-card done">
                    <div className="inst-top">
                      <div>
                        <div className="inst-name">{inst.description}</div>
                        <div className="inst-sub">{inst.total_installments} parcelas</div>
                      </div>
                      <div className="inst-right">
                        <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 18, fontWeight: 700, color: "var(--green)" }}>{fmt(inst.total_paid)}</div>
                      </div>
                    </div>
                    <div className="prog-wrap">
                      <div className="prog-fill" style={{ width: "100%" }} />
                    </div>
                    <div className="inst-bot">
                      <div className="inst-count">100% pago</div>
                      <div className="inst-done">✅ Quitado</div>
                    </div>
                  </div>
                ))}
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
              <span className="badge-count" style={{ background: "rgba(251,191,36,.1)", color: "var(--yellow)", border: "1px solid rgba(251,191,36,.2)", fontSize: 10 }}>em breve</span>
            </div>

            <div className="fixed-list">
              {MOCK_FIXED.map((item, i) => (
                <div key={i} className="fixed-item" style={{ opacity: .55 }}>
                  <div className="fixed-left">
                    <div className="fixed-ico" style={{ background: item.color }}>{item.icon}</div>
                    <div>
                      <div className="fixed-name">{item.name}</div>
                      <div className="fixed-day">{item.day}</div>
                    </div>
                  </div>
                  <div className="fixed-amt">{fmt(item.amount)}</div>
                </div>
              ))}
            </div>

            <div className="coming-soon" style={{ marginTop: 16 }}>
              <div className="coming-soon-icon">🔧</div>
              <div>Funcionalidade em desenvolvimento</div>
              <div className="coming-soon-note">Em breve você poderá gerenciar suas contas fixas diretamente aqui</div>
            </div>
          </div>
        </div>

        {/* TRANSAÇÕES */}
        <div className="panel">
          <div className="panel-hdr">
            <div className="tab-bar">
              <button className={`tab ${activeTab === "expense" ? "on" : ""}`} onClick={() => setActiveTab("expense")}>Despesas</button>
              <button className={`tab ${activeTab === "income" ? "on" : ""}`} onClick={() => setActiveTab("income")}>Receitas</button>
            </div>
            <span className="badge-count">
              {activeTab === "expense" ? expenses.length : income.length} registros · {periodLabel}
            </span>
          </div>

          <div className="tbl-wrap">
            {activeTab === "expense" && (
              expenses.length === 0
                ? <div style={{ color: "var(--muted2)", fontSize: 13, textAlign: "center", padding: "28px 0" }}>Nenhuma despesa em {periodLabel}.</div>
                : (
                  <table>
                    <thead><tr>
                      <th>Descrição</th><th>Categoria</th><th>Data</th><th>Valor</th><th>Status</th><th></th>
                    </tr></thead>
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
                              ? (
                                <button className="paid-btn" title={t.paid ? "Marcar pendente" : "Marcar pago"}
                                  onClick={async () => { await markTransactionPaid(t.id, !t.paid); loadAll() }}>
                                  {t.paid ? "✅" : "⏳"}
                                </button>
                              )
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
                    <thead><tr>
                      <th>Descrição</th><th>Categoria</th><th>Data</th><th>Valor</th><th></th>
                    </tr></thead>
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
    </>
  )
}