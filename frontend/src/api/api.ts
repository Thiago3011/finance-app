const API_URL = "http://127.0.0.1:8000"

export interface FilterParams {
  startDate?: string
  endDate?: string
  year?: number
  month?: number
}

function buildQS(filters: FilterParams, extra?: Record<string, string>): string {
  const p = new URLSearchParams()
  if (filters.startDate) p.append("start_date", filters.startDate)
  if (filters.endDate) p.append("end_date", filters.endDate)
  if (filters.year) p.append("year", String(filters.year))
  if (filters.month) p.append("month", String(filters.month))
  if (extra) Object.entries(extra).forEach(([k, v]) => p.append(k, v))
  return p.toString() ? `?${p.toString()}` : ""
}

export async function getTransactions(type?: string, filters: FilterParams = {}) {
  const extra = type ? { type } : {}
  const res = await fetch(`${API_URL}/transactions${buildQS(filters, extra)}`)
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

export async function markTransactionPaid(id: number, paid: boolean) {
  const res = await fetch(`${API_URL}/transactions/${id}/paid`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paid })
  })
  return res.json()
}