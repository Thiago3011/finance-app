const API_URL = "http://127.0.0.1:8000"

export interface FilterParams { year?: number; month?: number }

function buildQS(filters: FilterParams, type?: string): string {
  const p = new URLSearchParams()
  if (type) p.append("type", type)
  if (filters.year) p.append("year", String(filters.year))
  if (filters.month) p.append("month", String(filters.month))
  return p.toString() ? `?${p.toString()}` : ""
}

export async function getTransactions(type?: string, filters: FilterParams = {}) {
  return (await fetch(`${API_URL}/transactions${buildQS(filters, type)}`)).json()
}
export async function getSummary(filters: FilterParams = {}) {
  return (await fetch(`${API_URL}/transactions/summary${buildQS(filters)}`)).json()
}
export async function createTransaction(data: any) {
  return (await fetch(`${API_URL}/transactions`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(data) })).json()
}
export async function deleteTransaction(id: number) {
  await fetch(`${API_URL}/transactions/${id}`, { method:"DELETE" })
}
export async function markTransactionPaid(id: number, paid: boolean) {
  return (await fetch(`${API_URL}/transactions/${id}/paid`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({paid}) })).json()
}
export async function updateTransactionAmount(id: number, amount: number) {
  return (await fetch(`${API_URL}/transactions/${id}/amount`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({amount}) })).json()
}
export async function getMonthlySummary(year?: number, month?: number) {
  const p = new URLSearchParams()
  if (year) p.append("year", String(year))
  if (month) p.append("month", String(month))
  return (await fetch(`${API_URL}/monthly-summary${p.toString()?`?${p}`:""}`)).json()
}
export async function getAccountSummary(filters: FilterParams = {}) {
  return (await fetch(`${API_URL}/transactions/by-account${buildQS(filters)}`)).json()
}
export async function getCategorySummary(filters: FilterParams = {}) {
  return (await fetch(`${API_URL}/transactions/by-category${buildQS(filters)}`)).json()
}
export async function getCategories() { return (await fetch(`${API_URL}/categories`)).json() }
export async function createCategory(data: { name:string; type:string }) {
  return (await fetch(`${API_URL}/categories`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(data) })).json()
}
export async function updateCategory(id: number, data: { name:string; type:string }) {
  return (await fetch(`${API_URL}/categories/${id}`, { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify(data) })).json()
}
export async function deleteCategory(id: number) { await fetch(`${API_URL}/categories/${id}`, { method:"DELETE" }) }
export async function getAccounts() { return (await fetch(`${API_URL}/accounts`)).json() }
export async function createAccount(data: { name:string }) {
  return (await fetch(`${API_URL}/accounts`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(data) })).json()
}
export async function updateAccount(id: number, data: { name:string }) {
  return (await fetch(`${API_URL}/accounts/${id}`, { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify(data) })).json()
}
export async function deleteAccount(id: number) { await fetch(`${API_URL}/accounts/${id}`, { method:"DELETE" }) }

// installments
export async function createInstallment(data: any) {
  return (await fetch(`${API_URL}/installments/`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(data) })).json()
}
export async function createInstallmentCustom(data: any) {
  return (await fetch(`${API_URL}/installments/custom`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(data) })).json()
}
export async function getInstallmentsSummary() { return (await fetch(`${API_URL}/installments/summary`)).json() }
export async function updateInstallment(id: number, data: any) {
  return (await fetch(`${API_URL}/installments/${id}`, { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify(data) })).json()
}
export async function deleteInstallment(id: number) { await fetch(`${API_URL}/installments/${id}`, { method:"DELETE" }) }
export async function getInstallmentRealBalance(id: number, monthlyRate: number) {
  return (await fetch(`${API_URL}/installments/${id}/real-balance?monthly_rate=${monthlyRate}`)).json()
}

// amortization
export async function simulateAmortization(id: number, data: { monthly_rate:number; amortization_value:number }) {
  return (await fetch(`${API_URL}/installments/${id}/amortize/simulate`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(data) })).json()
}
export async function registerAmortization(id: number, data: { installments_removed:number; value_paid:number; account_id:number; paid_date?:string }) {
  return (await fetch(`${API_URL}/installments/${id}/amortize`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(data) })).json()
}

// recurring
export async function getRecurring() { return (await fetch(`${API_URL}/recurring/`)).json() }
export async function getRecurringForMonth(year: number, month: number) {
  return (await fetch(`${API_URL}/recurring/for-month?year=${year}&month=${month}`)).json()
}
export async function createRecurring(data: any) {
  return (await fetch(`${API_URL}/recurring/`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(data) })).json()
}
export async function updateRecurring(id: number, data: any) {
  return (await fetch(`${API_URL}/recurring/${id}`, { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify(data) })).json()
}
export async function payRecurring(id: number, data: { year:number; month:number; amount:number; account_id:number; fine?:number }) {
  return (await fetch(`${API_URL}/recurring/${id}/pay`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(data) })).json()
}
export async function unpayRecurring(id: number, data: { year:number; month:number }) {
  return (await fetch(`${API_URL}/recurring/${id}/pay`, { method:"DELETE", headers:{"Content-Type":"application/json"}, body:JSON.stringify(data) })).json()
}
export async function deleteRecurring(id: number) { await fetch(`${API_URL}/recurring/${id}`, { method:"DELETE" }) }