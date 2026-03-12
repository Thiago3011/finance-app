import { useEffect, useState } from "react"
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts"
import {
  getTransactions,
  getSummary,
  createTransaction,
  deleteTransaction,
  getCategories,
  getCategorySummary
} from "./api/api"

function App() {

  const [expenses, setExpenses] = useState<any[]>([])
  const [income, setIncome] = useState<any[]>([])
  const [summary, setSummary] = useState<any>(null)

  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [type, setType] = useState("expense")

  const [categories, setCategories] = useState<any[]>([])
  const [categoryId, setCategoryId] = useState("")

  const [categorySummary, setCategorySummary] = useState<any[]>([])

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {

    const expenseList = await getTransactions("expense")
    const incomeList = await getTransactions("income")

    const s = await getSummary()
    const c = await getCategories()
    const cs = await getCategorySummary()

    setExpenses(expenseList)
    setIncome(incomeList)
    setSummary(s)
    setCategories(c)
    setCategorySummary(cs)
  }

  async function handleDelete(id: number) {
    await deleteTransaction(id)
    loadData()
  }

  function formatCurrency(value: number) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(value)
  }

  async function handleSubmit(e: any) {
    e.preventDefault()

    await createTransaction({
      description,
      amount: parseFloat(amount),
      type,
      category_id: Number(categoryId),
      date: new Date().toISOString().slice(0, 10)
    })

    setDescription("")
    setAmount("")
    setType("expense")
    setCategoryId("")

    loadData()
  }

  function getCategoryName(id: number) {
    const category = categories.find(c => c.id === id)
    return category ? category.name : "-"
  }

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#A28CFF"]

  return (
    <div style={{ padding: 40, fontFamily: "Arial", maxWidth: 900 }}>

      <h1>Finance Dashboard</h1>

      {summary && (
        <div style={{ display: "flex", gap: 20, marginBottom: 30 }}>

          <div>
            <h3>Receitas</h3>
            <p style={{ color: "green", fontWeight: "bold" }}>
              {formatCurrency(summary.total_income)}
            </p>
          </div>

          <div>
            <h3>Despesas</h3>
            <p style={{ color: "red", fontWeight: "bold" }}>
              {formatCurrency(summary.total_expense)}
            </p>
          </div>

          <div>
            <h3>Saldo</h3>
            <p style={{ fontWeight: "bold" }}>
              {formatCurrency(summary.balance)}
            </p>
          </div>

        </div>
      )}

      <h2>Nova transação</h2>

      <form onSubmit={handleSubmit} style={{ marginBottom: 30 }}>

        <input
          type="text"
          placeholder="Descrição"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <input
          type="number"
          placeholder="Valor"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="expense">Despesa</option>
          <option value="income">Receita</option>
        </select>

        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          <option value="">Categoria</option>

          {categories
            .filter((c) => c.type === type)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </select>

        <button type="submit">
          Adicionar
        </button>

      </form>

      <h2>Gastos por categoria</h2>

      <PieChart width={400} height={300}>
        <Pie
          data={categorySummary}
          dataKey="total"
          nameKey="category"
          cx="50%"
          cy="50%"
          outerRadius={100}
          label
        >
          {Array.isArray(categorySummary) &&
            categorySummary.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>

      <h2>Receitas</h2>

      <table border={1} cellPadding={10}>

        <thead>
          <tr>
            <th>Descrição</th>
            <th>Categoria</th>
            <th>Valor</th>
            <th>Ação</th>
          </tr>
        </thead>

        <tbody>

          {income.map((t) => (

            <tr key={t.id}>

              <td>{t.description}</td>

              <td>{getCategoryName(t.category_id)}</td>

              <td style={{ color: "green", fontWeight: "bold" }}>
                {formatCurrency(t.amount)}
              </td>

              <td>
                <button onClick={() => handleDelete(t.id)}>
                  excluir
                </button>
              </td>

            </tr>

          ))}

        </tbody>

      </table>

      <h2 style={{ marginTop: 40 }}>Despesas</h2>

      <table border={1} cellPadding={10}>

        <thead>
          <tr>
            <th>Descrição</th>
            <th>Categoria</th>
            <th>Valor</th>
            <th>Ação</th>
          </tr>
        </thead>

        <tbody>

          {expenses.map((t) => (

            <tr key={t.id}>

              <td>{t.description}</td>

              <td>{getCategoryName(t.category_id)}</td>

              <td style={{ color: "red", fontWeight: "bold" }}>
                {formatCurrency(t.amount)}
              </td>

              <td>
                <button onClick={() => handleDelete(t.id)}>
                  excluir
                </button>
              </td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>
  )
}

export default App