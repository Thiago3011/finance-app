import { useEffect, useState } from "react"
import {
  PieChart, Pie, Cell, Tooltip, Legend,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer
} from "recharts"
import {
  getTransactions, getSummary, createTransaction, deleteTransaction,
  getCategories, getCategorySummary, getMonthlySummary, getAccounts,
  createInstallment, markTransactionPaid
} from "./api/api"

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #0a0a0f;
    --surface: #111118;
    --surface2: #1a1a24;
    --border: #ffffff10;
    --border2: #ffffff1a;
    --accent: #7c6dfa;
    --accent2: #fa6d8f;
    --accent3: #6dfabc;
    --text: #f0f0f8;
    --muted: #6b6b80;
    --income: #4ade80;
    --expense: #f87171;
    --radius: 16px;
    --shadow: 0 8px 32px rgba(0,0,0,0.4);
  }

  body {
    background: var(--bg);
    color: var(--text);
    font-family: 'DM Sans', sans-serif;
    min-height: 100vh;
  }

  .app {
    max-width: 1200px;
    margin: 0 auto;
    padding: 32px 24px;
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 40px;
  }

  .logo {
    font-family: 'Syne', sans-serif;
    font-size: 28px;
    font-weight: 800;
    background: linear-gradient(135deg, var(--accent), var(--accent2));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    letter-spacing: -0.5px;
  }

  .header-date {
    color: var(--muted);
    font-size: 14px;
    font-weight: 400;
  }

  /* CARDS RESUMO */
  .summary-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    margin-bottom: 32px;
  }

  .summary-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 24px;
    position: relative;
    overflow: hidden;
    transition: border-color 0.2s, transform 0.2s;
  }

  .summary-card:hover {
    border-color: var(--border2);
    transform: translateY(-2px);
  }

  .summary-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
  }

  .summary-card.income::before { background: var(--income); }
  .summary-card.expense::before { background: var(--expense); }
  .summary-card.balance::before { background: linear-gradient(90deg, var(--accent), var(--accent2)); }

  .card-label {
    font-size: 12px;
    font-weight: 500;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 12px;
  }

  .card-value {
    font-family: 'Syne', sans-serif;
    font-size: 28px;
    font-weight: 700;
    line-height: 1;
  }

  .card-value.income { color: var(--income); }
  .card-value.expense { color: var(--expense); }
  .card-value.positive { color: var(--income); }
  .card-value.negative { color: var(--expense); }

  .card-icon {
    position: absolute;
    top: 20px; right: 20px;
    font-size: 28px;
    opacity: 0.15;
  }

  /* GRID PRINCIPAL */
  .main-grid {
    display: grid;
    grid-template-columns: 1fr 340px;
    gap: 20px;
    margin-bottom: 24px;
  }

  .panel {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 24px;
  }

  .panel-title {
    font-family: 'Syne', sans-serif;
    font-size: 16px;
    font-weight: 700;
    margin-bottom: 20px;
    color: var(--text);
  }

  /* FORMS */
  .form-row {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 12px;
  }

  input, select {
    background: var(--surface2);
    border: 1px solid var(--border2);
    border-radius: 10px;
    color: var(--text);
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    padding: 10px 14px;
    outline: none;
    transition: border-color 0.2s;
    flex: 1;
    min-width: 120px;
  }

  input:focus, select:focus {
    border-color: var(--accent);
  }

  input::placeholder { color: var(--muted); }

  select option { background: var(--surface2); }

  .btn {
    border: none;
    border-radius: 10px;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    font-weight: 600;
    padding: 10px 20px;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .btn-primary {
    background: var(--accent);
    color: white;
  }

  .btn-primary:hover { background: #6a5ce8; transform: translateY(-1px); }

  .btn-secondary {
    background: var(--surface2);
    color: var(--text);
    border: 1px solid var(--border2);
  }

  .btn-secondary:hover { border-color: var(--accent); }

  .btn-danger {
    background: transparent;
    color: var(--expense);
    border: 1px solid transparent;
    padding: 6px 10px;
    font-size: 16px;
  }

  .btn-danger:hover { background: rgba(248,113,113,0.1); }

  .btn-toggle {
    background: var(--surface2);
    color: var(--text);
    border: 1px solid var(--border2);
    border-radius: 10px;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    font-weight: 500;
    padding: 10px 18px;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }

  .btn-toggle.active {
    background: rgba(124,109,250,0.15);
    border-color: var(--accent);
    color: var(--accent);
  }

  .btn-toggle:hover { border-color: var(--accent); }

  /* COLLAPSIBLE PANEL */
  .collapsible {
    background: var(--surface2);
    border: 1px solid var(--border2);
    border-radius: var(--radius);
    margin-bottom: 12px;
    overflow: hidden;
    transition: border-color 0.2s;
  }

  .collapsible.active { border-color: var(--accent); }

  .collapsible-body {
    padding: 20px;
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  /* TABELA */
  .table-wrap {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
  }

  th {
    text-align: left;
    padding: 10px 14px;
    font-size: 11px;
    font-weight: 600;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.8px;
    border-bottom: 1px solid var(--border);
  }

  td {
    padding: 12px 14px;
    border-bottom: 1px solid var(--border);
    vertical-align: middle;
  }

  tr:last-child td { border-bottom: none; }

  tr.paid-row { background: rgba(74,222,128,0.04); }

  tr:hover td { background: rgba(255,255,255,0.02); }

  .badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 10px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 500;
  }

  .badge-expense { background: rgba(248,113,113,0.12); color: var(--expense); }
  .badge-income { background: rgba(74,222,128,0.12); color: var(--income); }
  .badge-installment { background: rgba(124,109,250,0.12); color: var(--accent); font-size: 11px; }

  .paid-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 18px;
    padding: 2px 6px;
    border-radius: 6px;
    transition: background 0.15s;
  }

  .paid-btn:hover { background: rgba(255,255,255,0.08); }

  /* SECTION TABS */
  .tabs {
    display: flex;
    gap: 4px;
    background: var(--surface2);
    border-radius: 12px;
    padding: 4px;
    margin-bottom: 20px;
    width: fit-content;
  }

  .tab {
    padding: 8px 18px;
    border-radius: 9px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    border: none;
    background: transparent;
    color: var(--muted);
    font-family: 'DM Sans', sans-serif;
    transition: all 0.2s;
  }

  .tab.active {
    background: var(--surface);
    color: var(--text);
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  }

  /* HINT */
  .hint {
    background: rgba(124,109,250,0.1);
    border: 1px solid rgba(124,109,250,0.2);
    border-radius: 8px;
    color: #b8b0ff;
    font-size: 13px;
    padding: 10px 14px;
    margin-top: 4px;
    width: 100%;
  }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
  }

  .count-badge {
    background: var(--surface2);
    border: 1px solid var(--border2);
    border-radius: 20px;
    color: var(--muted);
    font-size: 12px;
    padding: 3px 10px;
  }

  /* GRÁFICO */
  .charts-grid {
    display: grid;
    grid-template-columns: 1fr 300px;
    gap: 20px;
    margin-bottom: 24px;
  }

  @media (max-width: 768px) {
    .summary-grid { grid-template-columns: 1fr; }
    .main-grid { grid-template-columns: 1fr; }
    .charts-grid { grid-template-columns: 1fr; }
  }
`

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
}

function formatDate(d: string) {
  if (!d) return "-"
  const [y, m, day] = d.split("-")
  return `${day}/${m}/${y}`
}

const COLORS = ["#7c6dfa", "#fa6d8f", "#6dfabc", "#fad26d", "#6db8fa", "#fa6d6d"]

export default function App() {
  const [expenses, setExpenses] = useState<any[]>([])
  const [income, setIncome] = useState<any[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [type, setType] = useState("expense")
  const [categories, setCategories] = useState<any[]>([])
  const [categoryId, setCategoryId] = useState("")
  const [accounts, setAccounts] = useState<any[]>([])
  const [accountId, setAccountId] = useState("")
  const [categorySummary, setCategorySummary] = useState<any[]>([])
  const [monthlyData, setMonthlyData] = useState<any[]>([])
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [showFilter, setShowFilter] = useState(false)
  const [showInstallment, setShowInstallment] = useState(false)
  const [installment, setInstallment] = useState({
    description: "", total_amount: "", total_installments: "",
    start_date: new Date().toISOString().slice(0, 10)
  })
  const [installCategoryId, setInstallCategoryId] = useState("")
  const [installAccountId, setInstallAccountId] = useState("")
  const [submittingInstallment, setSubmittingInstallment] = useState(false)
  const [activeTab, setActiveTab] = useState<"expense" | "income">("expense")

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [expenseList, incomeList, s, c, cs, ms, a] = await Promise.all([
      getTransactions("expense", startDate, endDate),
      getTransactions("income", startDate, endDate),
      getSummary(),
      getCategories(),
      getCategorySummary(),
      getMonthlySummary(),
      getAccounts()
    ])
    setExpenses(expenseList)
    setIncome(incomeList)
    setSummary(s)
    setCategories(c)
    setCategorySummary(cs)
    setMonthlyData(ms)
    setAccounts(a)
  }

  async function handleDelete(id: number) {
    await deleteTransaction(id)
    loadData()
  }

  async function handleSubmit(e: any) {
    e.preventDefault()
    if (!description || !amount || !categoryId || !accountId) {
      alert("Preencha todos os campos!")
      return
    }
    await createTransaction({
      description, amount: parseFloat(amount), type,
      category_id: Number(categoryId), account_id: Number(accountId), date
    })
    setDescription(""); setAmount(""); setType("expense"); setCategoryId(""); setAccountId("")
    loadData()
  }

  async function handleInstallmentSubmit(e: any) {
    e.preventDefault()
    if (submittingInstallment) return
    if (!installment.description || !installment.total_amount || !installment.total_installments || !installCategoryId || !installAccountId) {
      alert("Preencha todos os campos do parcelamento!")
      return
    }
    setSubmittingInstallment(true)
    try {
      await createInstallment({
        description: installment.description,
        total_amount: Number(installment.total_amount),
        total_installments: Number(installment.total_installments),
        start_date: installment.start_date,
        category_id: Number(installCategoryId),
        account_id: Number(installAccountId)
      })
      setInstallment({ description: "", total_amount: "", total_installments: "", start_date: new Date().toISOString().slice(0, 10) })
      setInstallCategoryId(""); setInstallAccountId("")
      setShowInstallment(false)
      loadData()
    } finally {
      setSubmittingInstallment(false)
    }
  }

  function getCategoryName(id: number) {
    return categories.find(c => c.id === id)?.name ?? "-"
  }

  const today = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })

  return (
    <>
      <style>{styles}</style>
      <div className="app">

        {/* HEADER */}
        <div className="header">
          <div className="logo">finance.</div>
          <div className="header-date">{today}</div>
        </div>

        {/* RESUMO */}
        {summary && (
          <div className="summary-grid">
            <div className="summary-card income">
              <div className="card-label">Receitas</div>
              <div className="card-value income">{formatCurrency(summary.total_income)}</div>
              <div className="card-icon">↑</div>
            </div>
            <div className="summary-card expense">
              <div className="card-label">Despesas pagas</div>
              <div className="card-value expense">{formatCurrency(summary.total_expense)}</div>
              <div className="card-icon">↓</div>
            </div>
            <div className="summary-card balance">
              <div className="card-label">Saldo real</div>
              <div className={`card-value ${summary.balance >= 0 ? "positive" : "negative"}`}>
                {formatCurrency(summary.balance)}
              </div>
              <div className="card-icon">◎</div>
            </div>
          </div>
        )}

        {/* GRID PRINCIPAL */}
        <div className="main-grid">

          {/* LADO ESQUERDO — FORMS */}
          <div>

            {/* FILTRO COLAPSÁVEL */}
            <button
              className={`btn-toggle ${showFilter ? "active" : ""}`}
              onClick={() => setShowFilter(!showFilter)}
            >
              🔍 Filtrar período {showFilter ? "▲" : "▼"}
            </button>

            {showFilter && (
              <div className="collapsible active" style={{ marginBottom: 16 }}>
                <div className="collapsible-body">
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ flex: 1 }} />
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ flex: 1 }} />
                  <button className="btn btn-primary" onClick={loadData}>Filtrar</button>
                  <button className="btn btn-secondary" onClick={() => { setStartDate(""); setEndDate(""); setTimeout(loadData, 0) }}>Limpar</button>
                </div>
              </div>
            )}

            {/* NOVA TRANSAÇÃO */}
            <div className="panel" style={{ marginBottom: 16 }}>
              <div className="panel-title">Nova transação</div>
              <form onSubmit={handleSubmit}>
                <div className="form-row">
                  <input type="text" placeholder="Descrição" value={description} onChange={e => setDescription(e.target.value)} style={{ flex: 2, minWidth: 160 }} />
                  <input type="number" placeholder="Valor" value={amount} onChange={e => setAmount(e.target.value)} style={{ flex: 1, minWidth: 100 }} />
                </div>
                <div className="form-row">
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} />
                  <select value={type} onChange={e => { setType(e.target.value); setCategoryId("") }}>
                    <option value="expense">Despesa</option>
                    <option value="income">Receita</option>
                  </select>
                  <select value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                    <option value="">Categoria</option>
                    {categories.filter(c => c.type === type).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <select value={accountId} onChange={e => setAccountId(e.target.value)}>
                    <option value="">Conta</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                  <button type="submit" className="btn btn-primary">+ Adicionar</button>
                </div>
              </form>
            </div>

            {/* PARCELAMENTO COLAPSÁVEL */}
            <button
              className={`btn-toggle ${showInstallment ? "active" : ""}`}
              onClick={() => setShowInstallment(!showInstallment)}
            >
              💳 Parcelamento {showInstallment ? "▲" : "▼"}
            </button>

            {showInstallment && (
              <div className="collapsible active" style={{ marginBottom: 16 }}>
                <form onSubmit={handleInstallmentSubmit}>
                  <div className="collapsible-body">
                    <input placeholder="Descrição" value={installment.description}
                      onChange={e => setInstallment({ ...installment, description: e.target.value })} style={{ flex: 2, minWidth: 160 }} />
                    <input type="number" placeholder="Valor total" value={installment.total_amount}
                      onChange={e => setInstallment({ ...installment, total_amount: e.target.value })} style={{ flex: 1 }} />
                    <input type="number" placeholder="Parcelas" min="1" value={installment.total_installments}
                      onChange={e => setInstallment({ ...installment, total_installments: e.target.value })} style={{ flex: 1, minWidth: 80 }} />
                    <input type="date" value={installment.start_date}
                      onChange={e => setInstallment({ ...installment, start_date: e.target.value })} style={{ flex: 1 }} />
                    <select value={installCategoryId} onChange={e => setInstallCategoryId(e.target.value)} style={{ flex: 1 }}>
                      <option value="">Categoria</option>
                      {categories.filter(c => c.type === "expense").map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <select value={installAccountId} onChange={e => setInstallAccountId(e.target.value)} style={{ flex: 1 }}>
                      <option value="">Conta</option>
                      {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>

                    {installment.total_amount && installment.total_installments && Number(installment.total_installments) > 0 && (
                      <div className="hint">
                        💡 Valor por parcela: <strong>{formatCurrency(Number(installment.total_amount) / Number(installment.total_installments))}</strong>
                        {" · "}Parcelas só afetam o saldo quando marcadas como pagas
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={submittingInstallment}
                      className="btn btn-primary"
                      style={{ opacity: submittingInstallment ? 0.6 : 1, cursor: submittingInstallment ? "not-allowed" : "pointer" }}
                    >
                      {submittingInstallment ? "Criando..." : "✅ Confirmar Parcelamento"}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* LADO DIREITO — PIZZA */}
          <div className="panel">
            <div className="panel-title">Por categoria</div>
            {categorySummary.length > 0 ? (
              <PieChart width={280} height={280}>
                <Pie data={categorySummary} dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={100} innerRadius={50}>
                  {categorySummary.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => formatCurrency(v)} contentStyle={{ background: "#111118", border: "1px solid #ffffff15", borderRadius: 10, fontSize: 13 }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 13 }} />
              </PieChart>
            ) : (
              <div style={{ color: "var(--muted)", fontSize: 14, textAlign: "center", marginTop: 60 }}>
                Sem dados ainda.
              </div>
            )}
          </div>
        </div>

        {/* GRÁFICO ÁREA */}
        <div className="panel" style={{ marginBottom: 24 }}>
          <div className="panel-title">Evolução mensal</div>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4ade80" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f87171" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                <XAxis dataKey="month" tick={{ fill: "#6b6b80", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#6b6b80", fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => formatCurrency(v)} contentStyle={{ background: "#111118", border: "1px solid #ffffff15", borderRadius: 10, fontSize: 13 }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 13 }} />
                <Area type="monotone" dataKey="income" name="Receita" stroke="#4ade80" fill="url(#gIncome)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="expense" name="Despesa" stroke="#f87171" fill="url(#gExpense)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ color: "var(--muted)", fontSize: 14, textAlign: "center", padding: 40 }}>Sem dados ainda.</div>
          )}
        </div>

        {/* TABELA TRANSAÇÕES */}
        <div className="panel">
          <div className="section-header">
            <div className="tabs">
              <button className={`tab ${activeTab === "expense" ? "active" : ""}`} onClick={() => setActiveTab("expense")}>
                Despesas
              </button>
              <button className={`tab ${activeTab === "income" ? "active" : ""}`} onClick={() => setActiveTab("income")}>
                Receitas
              </button>
            </div>
            <div className="count-badge">
              {activeTab === "expense" ? expenses.length : income.length} registros
            </div>
          </div>

          <div className="table-wrap">
            {activeTab === "expense" && (
              expenses.length === 0
                ? <div style={{ color: "var(--muted)", fontSize: 14, textAlign: "center", padding: 32 }}>Nenhuma despesa encontrada.</div>
                : (
                  <table>
                    <thead>
                      <tr>
                        <th>Descrição</th>
                        <th>Categoria</th>
                        <th>Data</th>
                        <th>Valor</th>
                        <th>Status</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map(t => (
                        <tr key={t.id} className={t.paid ? "paid-row" : ""}>
                          <td>
                            <div style={{ fontWeight: 500 }}>{t.description}</div>
                            {t.installment_id && (
                              <span className="badge badge-installment">parcelado</span>
                            )}
                          </td>
                          <td><span style={{ color: "var(--muted)", fontSize: 13 }}>{getCategoryName(t.category_id)}</span></td>
                          <td><span style={{ color: "var(--muted)", fontSize: 13 }}>{formatDate(t.date)}</span></td>
                          <td><span className="badge badge-expense">{formatCurrency(t.amount)}</span></td>
                          <td>
                            <button
                              className="paid-btn"
                              title={t.paid ? "Marcar como pendente" : "Marcar como pago"}
                              onClick={async () => {
                                await markTransactionPaid(t.id, !t.paid)
                                loadData()
                              }}
                            >
                              {t.paid ? "✅" : "⏳"}
                            </button>
                          </td>
                          <td>
                            <button className="btn btn-danger" onClick={() => handleDelete(t.id)}>🗑</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
            )}

            {activeTab === "income" && (
              income.length === 0
                ? <div style={{ color: "var(--muted)", fontSize: 14, textAlign: "center", padding: 32 }}>Nenhuma receita encontrada.</div>
                : (
                  <table>
                    <thead>
                      <tr>
                        <th>Descrição</th>
                        <th>Categoria</th>
                        <th>Data</th>
                        <th>Valor</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {income.map(t => (
                        <tr key={t.id}>
                          <td style={{ fontWeight: 500 }}>{t.description}</td>
                          <td><span style={{ color: "var(--muted)", fontSize: 13 }}>{getCategoryName(t.category_id)}</span></td>
                          <td><span style={{ color: "var(--muted)", fontSize: 13 }}>{formatDate(t.date)}</span></td>
                          <td><span className="badge badge-income">{formatCurrency(t.amount)}</span></td>
                          <td>
                            <button className="btn btn-danger" onClick={() => handleDelete(t.id)}>🗑</button>
                          </td>
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