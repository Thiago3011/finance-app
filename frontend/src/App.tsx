import { useEffect, useState } from "react"
import { getTransactions, getSummary, createTransaction } from "./api/api"

function App() {

  const [transactions, setTransactions] = useState<any[]>([])
  const [summary, setSummary] = useState<any>(null)

  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [type, setType] = useState("expense")

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const t = await getTransactions()
    const s = await getSummary()

    setTransactions(t)
    setSummary(s)
  }

  async function handleSubmit(e:any) {
    e.preventDefault()

    await createTransaction({
      description,
      amount: Number(amount),
      type,
      date: new Date().toISOString().slice(0,10)
    })

    setDescription("")
    setAmount("")

    loadData()
  }

  return (
    <div style={{padding:40,fontFamily:"Arial",maxWidth:800}}>

      <h1>Finance Dashboard</h1>

      {summary && (
        <div style={{display:"flex",gap:20,marginBottom:30}}>
          <div>
            <h3>Receitas</h3>
            <p>{summary.total_income}</p>
          </div>

          <div>
            <h3>Despesas</h3>
            <p>{summary.total_expense}</p>
          </div>

          <div>
            <h3>Saldo</h3>
            <p>{summary.balance}</p>
          </div>
        </div>
      )}

      <h2>Nova transação</h2>

      <form onSubmit={handleSubmit} style={{marginBottom:30}}>

        <input
          placeholder="descrição"
          value={description}
          onChange={(e)=>setDescription(e.target.value)}
        />

        <input
          placeholder="valor"
          value={amount}
          onChange={(e)=>setAmount(e.target.value)}
        />

        <select value={type} onChange={(e)=>setType(e.target.value)}>
          <option value="expense">Despesa</option>
          <option value="income">Receita</option>
        </select>

        <button type="submit">Adicionar</button>

      </form>

      <h2>Transações</h2>

      <table border={1} cellPadding={10}>

        <thead>
          <tr>
            <th>Descrição</th>
            <th>Valor</th>
          </tr>
        </thead>

        <tbody>

          {transactions.map((t)=>(
            <tr key={t.id}>
              <td>{t.description}</td>
              <td>{t.amount}</td>
            </tr>
          ))}

        </tbody>

      </table>

    </div>
  )
}

export default App