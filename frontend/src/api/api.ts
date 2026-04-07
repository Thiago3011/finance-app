const API_URL = "http://127.0.0.1:8000"

export interface FilterParams {
  startDate?: string
  endDate?: string
  year?: number
  month?: number
}

function buildQS(filters: FilterParams, type?: string): string {
  const p = new URLSearchParams()
  if (type) p.append("type", type)
  if (filters.startDate) p.append("start_date", filters.startDate)
  if (filters.endDate) p.append("end_date", filters.endDate)
  if (filters.year) p.append("year", String(filters.year))
  if (filters.month) p.append("month", String(filters.month))
  return p.toString() ? `?${p.toString()}` : ""
}

export async function getTransactions(type?: string, filters: FilterParams = {}) {
  const res = await fetch(`${API_URL}/transactions${buildQS(filters, type)}`)
  return res.json()
}

export async function getSummary(filters: FilterParams = {}) {
  const res = await fetch(`${API_URL}/transactions/summary${buildQS(filters)}`)
  return res.json()
}

export async function createTransaction(data: any) {
  const res = await fetch(`${API_URL}/transactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  })
  return res.json()
}

export async function deleteTransaction(id: number) {
  await fetch(`${API_URL}/transactions/${id}`, { method: "DELETE" })
}

export async function markTransactionPaid(id: number, paid: boolean) {
  const res = await fetch(`${API_URL}/transactions/${id}/paid`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paid })
  })
  return res.json()
}

export async function getCategories() {
  const res = await fetch(`${API_URL}/categories`)
  return res.json()
}

export async function getCategorySummary(filters: FilterParams = {}) {
  const res = await fetch(`${API_URL}/transactions/by-category${buildQS(filters)}`)
  return res.json()
}

export async function getMonthlySummary(year?: number) {
  const qs = year ? `?year=${year}` : ""
  const res = await fetch(`${API_URL}/monthly-summary${qs}`)
  return res.json()
}

export async function getAccounts() {
  const res = await fetch(`${API_URL}/accounts`)
  return res.json()
}

export async function createInstallment(data: any) {
  const res = await fetch(`${API_URL}/installments/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  })
  return res.json()
}

export async function getInstallmentsSummary() {
  const res = await fetch(`${API_URL}/installments/summary`)
  return res.json()
}

export async function getRecurring() {
  const res = await fetch(`${API_URL}/recurring/`)
  return res.json()
}

export async function createRecurring(data: any) {
  const res = await fetch(`${API_URL}/recurring/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  })
  return res.json()
}

export async function updateRecurring(id: number, data: any) {
  const res = await fetch(`${API_URL}/recurring/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  })
  return res.json()
}

export async function deleteRecurring(id: number) {
  await fetch(`${API_URL}/recurring/${id}`, { method: "DELETE" })
}