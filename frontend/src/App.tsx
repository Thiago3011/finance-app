import { useEffect, useState } from "react"
import { getTransactions, getSummary, createTransaction, deleteTransaction, getCategories } from "./api/api"

function App() {

  const [transactions, setTransactions] = useState<any[]>([])
  const [summary, setSummary] = useState<any>(null)

  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [type, setType] = useState("expense")

  const [categories, setCategories] = useState<any[]>([])
  const [categoryId, setCategoryId] = useState("")

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const t = await getTransactions()
    const s = await getSummary()
    const c = await getCategories()

    setTransactions(t)
    setSummary(s)
    setCategories(c)
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

          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <button type="submit">
          Adicionar
        </button>

      </form>

      <h2>Transações</h2>

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

          {transactions.map((t) => {

            const isExpense = t.type === "expense"

            return (
              <tr key={t.id}>

                <td>
                  {t.description}
                </td>

                <td>
                  {getCategoryName(t.category_id)}
                </td>

                <td style={{
                  color: isExpense ? "red" : "green",
                  fontWeight: "bold"
                }}>
                  {formatCurrency(t.amount)}
                </td>

                <td>
                  <button onClick={() => handleDelete(t.id)}>
                    excluir
                  </button>
                </td>

              </tr>
            )

          })}

        </tbody>

      </table>

    </div>
  )
}

export default App