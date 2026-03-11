import { useEffect, useState } from "react"
import { getTransactions, getSummary } from "./api/api"

function App() {

  const [transactions, setTransactions] = useState<any[]>([])
  const [summary, setSummary] = useState<any>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const t = await getTransactions()
    const s = await getSummary()

    setTransactions(t)
    setSummary(s)
  }

  return (
    <div style={{ padding: 40, fontFamily: "Arial" }}>

      <h1>Finance Dashboard</h1>

      {summary && (
        <div>
          <h2>Resumo</h2>

          <p>Receitas: {summary.total_income}</p>
          <p>Despesas: {summary.total_expense}</p>
          <p>Saldo: {summary.balance}</p>
        </div>
      )}

      <h2>Transações</h2>

      <ul>
        {transactions.map((t) => (
          <li key={t.id}>
            {t.description} — {t.amount}
          </li>
        ))}
      </ul>

    </div>
  )
}

export default App