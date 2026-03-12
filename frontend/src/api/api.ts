const API_URL = "http://127.0.0.1:8000"

export async function getTransactions() {
  const res = await fetch(`${API_URL}/transactions`)
  return res.json()
}

export async function getSummary() {
  const res = await fetch(`${API_URL}/transactions/summary`)
  return res.json()
}

export async function createTransaction(data:any) {
  const res = await fetch(`${API_URL}/transactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  })

  return res.json()
}

export async function deleteTransaction(id:number) {
  await fetch(`http://127.0.0.1:8000/transactions/${id}`, {
    method: "DELETE"
  })
}