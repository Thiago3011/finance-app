const API_URL = "http://127.0.0.1:8000"

export async function getTransactions() {
  const res = await fetch(`${API_URL}/transactions`)
  return res.json()
}

export async function getSummary() {
  const res = await fetch(`${API_URL}/transactions/summary`)
  return res.json()
}