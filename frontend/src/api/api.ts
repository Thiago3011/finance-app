const API_URL = "http://127.0.0.1:8000"

export async function getTransactions(type?: string) {

  let url = `${API_URL}/transactions`

  if (type) {
    url += `?type=${type}`
  }

  const res = await fetch(url)

  return res.json()
}

export async function getSummary() {
  const res = await fetch(`${API_URL}/transactions/summary`)
  return res.json()
}

export async function createTransaction(data: any) {
  const res = await fetch(`${API_URL}/transactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  })

  return res.json()
}

export async function deleteTransaction(id: number) {
  await fetch(`${API_URL}/transactions/${id}`, {
    method: "DELETE"
  })
}

export async function getCategories() {
  const res = await fetch(`${API_URL}/categories`)
  return res.json()
}

export async function getCategorySummary() {
  const res = await fetch(`${API_URL}/transactions/by-category`)
  return res.json()
}