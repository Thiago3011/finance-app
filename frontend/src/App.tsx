import { useEffect, useState } from "react"
import { PieChart, Pie, Cell, Tooltip, Legend, AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar } from "recharts"
import {
  getTransactions, getSummary, createTransaction, deleteTransaction,
  getCategories, getCategorySummary, getMonthlySummary, getAccounts,
  createInstallment, createInstallmentCustom, markTransactionPaid,
  getInstallmentsSummary, updateInstallment, deleteInstallment,
  getRecurring, createRecurring, updateRecurring, updateRecurringAmount, deleteRecurring,
  createCategory, updateCategory, deleteCategory,
  createAccount, updateAccount, deleteAccount,
  getAccountSummary
} from "./api/api"

// ─── helpers ─────────────────────────────────────────────────────────────────
const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)
const fmtDate = (d: string) => { if (!d) return "-"; const [y, m, day] = d.split("-"); return `${day}/${m}/${y}` }
const MONTHS_PT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"]
const COLORS = ["#7c6dfa","#fa6d8f","#6dfabc","#fad26d","#6db8fa","#fa8c6d","#c46dfa","#6dfafa"]
const ICON_OPTIONS = ["💡","🌊","📱","🌐","🏠","🚗","💊","📺","🎮","🎵","☕","🏋️","📚","✈️","🐾","🛡️","💳","🔑","📄","🏦","⛽","🧾","🎓","🍔"]

const DEBT_CFG: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  parcelamento:  { label: "Parcelamento",  icon: "💳", color: "#7c6dfa", bg: "rgba(124,109,250,.15)" },
  financiamento: { label: "Financiamento", icon: "🏦", color: "#fad26d", bg: "rgba(250,210,109,.15)" },
  emprestimo:    { label: "Empréstimo",    icon: "🤝", color: "#fa6d8f", bg: "rgba(250,109,143,.15)" },
}

// ─── CSS ─────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600&family=Bricolage+Grotesque:wght@700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#08080f;--s1:#0f0f1a;--s2:#17172a;--s3:#1f1f35;
  --b1:#ffffff0d;--b2:#ffffff1a;--b3:#ffffff28;
  --acc:#7c6dfa;--acc2:#fa6d8f;
  --text:#eeeef8;--muted:#5a5a72;--muted2:#8888a8;
  --green:#4ade80;--red:#f87171;--yellow:#fbbf24;--r:14px;
}
body{background:var(--bg);color:var(--text);font-family:'Plus Jakarta Sans',sans-serif;min-height:100vh}
.app{max-width:1280px;margin:0 auto;padding:28px 24px}

/* NAV */
.nav{display:flex;align-items:center;gap:8px;background:var(--s2);border-bottom:1px solid var(--b1);padding:0 24px;margin:-28px -24px 28px;position:sticky;top:0;z-index:10}
.nav-logo{font-family:'Bricolage Grotesque',sans-serif;font-size:20px;font-weight:800;background:linear-gradient(130deg,var(--acc),var(--acc2));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;padding:16px 0;margin-right:8px}
.nav-tab{background:none;border:none;border-bottom:2px solid transparent;color:var(--muted2);cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;font-weight:500;padding:16px 14px;transition:all .18s;white-space:nowrap}
.nav-tab:hover{color:var(--text)}
.nav-tab.on{border-bottom-color:var(--acc);color:var(--text)}
.nav-right{margin-left:auto;font-size:12px;color:var(--muted2);padding:16px 0}

/* PERIOD */
.period-row{display:flex;align-items:center;gap:10px;margin-bottom:24px;flex-wrap:wrap}
.period-nav{display:flex;align-items:center;gap:4px;background:var(--s2);border:1px solid var(--b2);border-radius:40px;padding:4px 6px}
.p-arrow{background:none;border:none;color:var(--muted2);cursor:pointer;font-size:18px;padding:3px 8px;border-radius:6px;transition:color .15s;line-height:1}.p-arrow:hover{color:var(--text)}
.p-label{font-size:14px;font-weight:600;min-width:80px;text-align:center}
.view-tog{display:flex;gap:2px;background:var(--s2);border:1px solid var(--b2);border-radius:8px;padding:3px}
.vt-btn{background:none;border:none;color:var(--muted2);cursor:pointer;font-size:12px;font-weight:600;padding:5px 10px;border-radius:6px;transition:all .15s;font-family:'Plus Jakarta Sans',sans-serif}.vt-btn.on{background:var(--s3);color:var(--text)}

/* SUMMARY CARDS */
.sum-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px}
.sc{background:var(--s1);border:1px solid var(--b1);border-radius:var(--r);padding:18px 20px;position:relative;overflow:hidden;transition:border-color .2s,transform .2s}
.sc:hover{transform:translateY(-2px);border-color:var(--b2)}
.sc::after{content:'';position:absolute;top:0;left:0;right:0;height:2px;border-radius:2px 2px 0 0}
.sc.c-inc::after{background:var(--green)}.sc.c-exp::after{background:var(--red)}.sc.c-pend::after{background:var(--yellow)}.sc.c-bal::after{background:linear-gradient(90deg,var(--acc),var(--acc2))}
.sc-lbl{font-size:11px;font-weight:600;color:var(--muted2);text-transform:uppercase;letter-spacing:.9px;margin-bottom:8px}
.sc-val{font-family:'Bricolage Grotesque',sans-serif;font-size:26px;font-weight:700;line-height:1;letter-spacing:-1px}
.sc-val.g{color:var(--green)}.sc-val.r{color:var(--red)}.sc-val.y{color:var(--yellow)}
.sc-sub{font-size:11px;color:var(--muted2);margin-top:5px}
.sc-ico{position:absolute;right:14px;top:14px;font-size:28px;opacity:.07}

/* GRID */
.g2{display:grid;grid-template-columns:1fr 310px;gap:16px;margin-bottom:16px}
.g2b{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
.g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:16px}

/* PANEL */
.panel{background:var(--s1);border:1px solid var(--b1);border-radius:var(--r);padding:20px}
.ph{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
.pt{font-family:'Bricolage Grotesque',sans-serif;font-size:15px;font-weight:700}
.ps{font-size:12px;color:var(--muted2);margin-top:2px}

/* FORM */
input,select,textarea{background:var(--s2);border:1px solid var(--b2);border-radius:10px;color:var(--text);font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;padding:8px 12px;outline:none;transition:border-color .2s;width:100%}
input:focus,select:focus,textarea:focus{border-color:var(--acc)}
input::placeholder,textarea::placeholder{color:var(--muted)}
select option{background:var(--s2)}
.fr{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px}
.fr>*{flex:1;min-width:100px}
.fl{font-size:10px;font-weight:700;color:var(--muted2);text-transform:uppercase;letter-spacing:.7px;margin-bottom:5px;display:block}

/* BUTTONS */
.btn{border:none;border-radius:10px;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;font-weight:600;padding:8px 16px;transition:all .2s;white-space:nowrap}
.bp{background:var(--acc);color:#fff}.bp:hover{background:#6a5ce8;transform:translateY(-1px)}
.bs{background:var(--s2);color:var(--text);border:1px solid var(--b2)}.bs:hover{border-color:var(--acc)}
.bd{background:none;border:none;cursor:pointer;color:var(--muted);font-size:14px;padding:4px 6px;border-radius:6px;transition:all .15s}.bd:hover{color:var(--red);background:rgba(248,113,113,.1)}
.be{background:none;border:none;cursor:pointer;color:var(--muted);font-size:14px;padding:4px 6px;border-radius:6px;transition:all .15s}.be:hover{color:var(--acc);background:rgba(124,109,250,.1)}
.b-sm{padding:5px 11px;font-size:12px}

/* TOGGLE / COLLAPSE */
.tog{display:inline-flex;align-items:center;gap:6px;background:var(--s2);border:1px solid var(--b2);border-radius:10px;color:var(--muted2);cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;font-weight:500;padding:8px 14px;margin-bottom:10px;transition:all .2s}
.tog.on{background:rgba(124,109,250,.12);border-color:var(--acc);color:var(--acc)}
.tog:hover{border-color:var(--acc);color:var(--text)}
.cbox{background:var(--s2);border:1px solid var(--b2);border-radius:var(--r);margin-bottom:12px}
.cbox.on{border-color:rgba(124,109,250,.4)}
.cbody{padding:16px;display:flex;flex-wrap:wrap;gap:8px}
.hint{width:100%;background:rgba(124,109,250,.1);border:1px solid rgba(124,109,250,.2);border-radius:8px;color:#b0a8ff;font-size:12px;padding:8px 12px}

/* DEBT TYPE */
.dt-btns{display:flex;gap:6px;flex-wrap:wrap;width:100%}
.dt-btn{display:flex;align-items:center;gap:5px;background:var(--s2);border:1px solid var(--b2);border-radius:10px;color:var(--muted2);cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;font-size:12px;font-weight:500;padding:8px 14px;transition:all .2s;flex:1;justify-content:center}
.dt-btn.s-parcelamento{background:rgba(124,109,250,.15);border-color:#7c6dfa;color:#c0b8ff}
.dt-btn.s-financiamento{background:rgba(250,210,109,.15);border-color:#fad26d;color:#fad26d}
.dt-btn.s-emprestimo{background:rgba(250,109,143,.15);border-color:#fa6d8f;color:#fa6d8f}

/* TABS */
.tabs{display:flex;gap:3px;background:var(--s2);border-radius:10px;padding:3px;width:fit-content;margin-bottom:14px}
.tb{background:none;border:none;border-radius:8px;color:var(--muted2);cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;font-weight:500;padding:6px 14px;transition:all .18s}
.tb.on{background:var(--s1);color:var(--text);box-shadow:0 2px 6px rgba(0,0,0,.3)}

/* TABLE */
.tw{overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:13px}
th{text-align:left;padding:8px 12px;font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.8px;border-bottom:1px solid var(--b1)}
td{padding:10px 12px;border-bottom:1px solid var(--b1);vertical-align:middle}
tr:last-child td{border-bottom:none}
tr:hover td{background:rgba(255,255,255,.012)}
tr.pr{background:rgba(74,222,128,.03)}

/* BADGES */
.badge{display:inline-flex;align-items:center;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600;white-space:nowrap}
.b-e{background:rgba(248,113,113,.12);color:var(--red)}
.b-i{background:rgba(74,222,128,.12);color:var(--green)}
.b-p{background:rgba(251,191,36,.12);color:var(--yellow);font-size:10px}
.b-ok{background:rgba(74,222,128,.1);color:var(--green);font-size:10px}
.b-inst{background:rgba(124,109,250,.12);color:var(--acc);font-size:10px}
.b-over{background:rgba(248,113,113,.1);color:var(--red);font-size:10px}
.b-up{background:rgba(74,222,128,.1);color:var(--green);font-size:10px}
.bc{background:var(--s2);border:1px solid var(--b2);border-radius:20px;color:var(--muted2);font-size:11px;padding:2px 8px}
.pb{background:none;border:none;cursor:pointer;font-size:16px;padding:2px 4px;border-radius:6px;transition:background .15s}.pb:hover{background:var(--b2)}

/* INSTALLMENT CARDS */
.il{display:flex;flex-direction:column;gap:10px;max-height:500px;overflow-y:auto;padding-right:2px}
.ic{background:var(--s2);border:1px solid var(--b2);border-radius:12px;padding:14px;transition:border-color .2s}
.ic:hover{border-color:var(--b3)}
.ic.done{opacity:.4}
.it{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px}
.in{font-weight:600;font-size:13px;margin-bottom:3px}
.is{font-size:11px;color:var(--muted2)}
.ir{text-align:right}
.irem{font-family:'Bricolage Grotesque',sans-serif;font-size:17px;font-weight:700;line-height:1}
.ipaid{font-size:11px;color:var(--muted2);margin-top:1px}
.pw{background:var(--b1);border-radius:99px;height:4px;margin-bottom:6px;overflow:hidden}
.pf{height:100%;border-radius:99px;transition:width .4s}
.ib{display:flex;justify-content:space-between;align-items:center}
.ica{font-size:10px;color:var(--muted2)}
.inxt{font-size:10px;background:rgba(251,191,36,.1);color:var(--yellow);border-radius:5px;padding:2px 6px}
.idone{font-size:10px;background:rgba(74,222,128,.1);color:var(--green);border-radius:5px;padding:2px 6px}
.i-actions{display:flex;gap:2px;opacity:0;transition:opacity .15s}
.ic:hover .i-actions{opacity:1}

/* DEBT FILTER */
.df{display:flex;gap:5px;margin-bottom:12px;flex-wrap:wrap}
.dfb{display:flex;align-items:center;gap:4px;background:var(--s2);border:1px solid var(--b2);border-radius:8px;color:var(--muted2);cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;font-size:11px;padding:4px 10px;transition:all .18s}
.dfb.active{color:var(--text);border-color:var(--b3);background:var(--s3)}
.dfb.a-parcelamento{background:rgba(124,109,250,.15);border-color:#7c6dfa;color:#c0b8ff}
.dfb.a-financiamento{background:rgba(250,210,109,.15);border-color:#fad26d;color:#fad26d}
.dfb.a-emprestimo{background:rgba(250,109,143,.15);border-color:#fa6d8f;color:#fa6d8f}

/* CHIP PAIRS */
.chips{display:flex;gap:10px;margin-bottom:14px}
.chip{background:var(--s2);border:1px solid var(--b2);border-radius:10px;padding:9px 12px;flex:1}
.chip-lbl{font-size:10px;font-weight:700;color:var(--muted2);text-transform:uppercase;letter-spacing:.7px;margin-bottom:3px}
.chip-val{font-family:'Bricolage Grotesque',sans-serif;font-size:17px;font-weight:700}

/* RECURRING */
.rl{display:flex;flex-direction:column;gap:7px}
.ri{display:flex;align-items:center;justify-content:space-between;background:var(--s2);border:1px solid var(--b2);border-radius:10px;padding:11px 13px;transition:border-color .2s}
.ri:hover{border-color:var(--b3)}
.ri.inactive{opacity:.4}
.ri-left{display:flex;align-items:center;gap:10px}
.ri-ico{width:34px;height:34px;border-radius:9px;background:rgba(124,109,250,.12);display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0}
.ri-ico.var{background:rgba(250,210,109,.12)}
.ri-name{font-size:13px;font-weight:600}
.ri-day{font-size:11px;color:var(--muted2);margin-top:1px}
.ri-right{display:flex;align-items:center;gap:8px}
.ri-amt{font-family:'Bricolage Grotesque',sans-serif;font-size:15px;font-weight:700;color:var(--red)}
.ri-actions{display:flex;gap:2px;opacity:0;transition:opacity .15s}
.ri:hover .ri-actions{opacity:1}

/* MODAL */
.mbg{position:fixed;inset:0;background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center;z-index:100;padding:20px}
.modal{background:var(--s1);border:1px solid var(--b2);border-radius:var(--r);padding:26px;width:100%;max-width:460px;max-height:90vh;overflow-y:auto}
.modal.wide{max-width:620px}
.mt{font-family:'Bricolage Grotesque',sans-serif;font-size:17px;font-weight:700;margin-bottom:18px}
.mf{display:flex;gap:10px;justify-content:flex-end;margin-top:18px}
.ico-grid{display:flex;flex-wrap:wrap;gap:5px;margin-top:5px}
.ico-opt{background:var(--s2);border:1px solid var(--b2);border-radius:8px;cursor:pointer;font-size:17px;padding:6px 9px;transition:all .15s;line-height:1}
.ico-opt:hover{border-color:var(--acc)}
.ico-opt.sel{border-color:var(--acc);background:rgba(124,109,250,.15)}

/* MANAGE LIST */
.manage-item{display:flex;align-items:center;justify-content:space-between;padding:9px 12px;background:var(--s2);border:1px solid var(--b2);border-radius:10px;margin-bottom:7px}
.manage-badge{font-size:10px;padding:2px 7px;border-radius:20px;font-weight:600}
.mi-inc{background:rgba(74,222,128,.12);color:var(--green)}
.mi-exp{background:rgba(248,113,113,.12);color:var(--red)}

/* ACCOUNT SUMMARY */
.acc-bars{display:flex;flex-direction:column;gap:8px}
.acc-bar-item{background:var(--s2);border:1px solid var(--b2);border-radius:10px;padding:12px 14px}
.acc-bar-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.acc-bar-name{font-weight:600;font-size:13px}
.acc-bar-bal{font-family:'Bricolage Grotesque',sans-serif;font-size:15px;font-weight:700}
.acc-bar-row{display:flex;gap:12px}
.acc-bar-sub{font-size:11px;color:var(--muted2)}

/* CUSTOM PARCELAS */
.custom-row{display:flex;gap:8px;align-items:center;margin-bottom:6px;background:var(--s2);border:1px solid var(--b2);border-radius:8px;padding:8px 10px}
.custom-num{font-size:11px;font-weight:700;color:var(--muted2);min-width:24px}

@media(max-width:1024px){.sum-grid{grid-template-columns:1fr 1fr}.g2,.g2b,.g3{grid-template-columns:1fr}}
@media(max-width:560px){.sum-grid{grid-template-columns:1fr}}
`

// ─── TYPES ───────────────────────────────────────────────────────────────────
interface RecurringItem { id:number;name:string;amount:number;due_day?:number;icon:string;active:boolean;category_id?:number;status?:string;is_variable:boolean }
interface InstallmentSummary { id:number;description:string;debt_type:string;total_amount:number;total_installments:number;paid_installments:number;pending_installments:number;value_per_installment:number;total_paid:number;total_remaining:number;next_due_date?:string;next_installment_number?:number;progress_percent:number }

// ─── MODAL: RECURRING ────────────────────────────────────────────────────────
function RecurringModal({ initial, categories, onSave, onClose }: { initial?: RecurringItem|null; categories:any[]; onSave:(d:any)=>void; onClose:()=>void }) {
  const [name, setName] = useState(initial?.name ?? "")
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "")
  const [dueDay, setDueDay] = useState(initial?.due_day ? String(initial.due_day) : "")
  const [icon, setIcon] = useState(initial?.icon ?? "📄")
  const [catId, setCatId] = useState(initial?.category_id ? String(initial.category_id) : "")
  const [active, setActive] = useState(initial?.active ?? true)
  const [isVar, setIsVar] = useState(initial?.is_variable ?? false)

  function save(e: any) {
    e.preventDefault()
    if (!name || !amount) { alert("Preencha nome e valor"); return }
    if (!isVar && !dueDay) { alert("Informe o dia de vencimento"); return }
    onSave({ name, amount: Number(amount), due_day: isVar ? null : Number(dueDay), icon, category_id: catId ? Number(catId) : null, active, is_variable: isVar })
  }

  return (
    <div className="mbg" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <div className="mt">{initial ? "Editar conta fixa" : "Nova conta fixa"}</div>
        <form onSubmit={save}>
          <div style={{ marginBottom: 14 }}>
            <span className="fl">Ícone</span>
            <div className="ico-grid">{ICON_OPTIONS.map(ic => <button key={ic} type="button" className={`ico-opt ${icon===ic?"sel":""}`} onClick={()=>setIcon(ic)}>{ic}</button>)}</div>
          </div>
          <div className="fr" style={{ marginBottom: 12 }}>
            <div style={{ flex:2, minWidth:150 }}><span className="fl">Nome</span><input placeholder="Ex: Luz, Netflix, Combustível" value={name} onChange={e=>setName(e.target.value)} /></div>
            <div style={{ flex:1, minWidth:90 }}><span className="fl">Valor atual</span><input type="number" placeholder="0,00" value={amount} onChange={e=>setAmount(e.target.value)} /></div>
          </div>

          {/* VARIÁVEL TOGGLE */}
          <div style={{ background:"var(--s2)", border:"1px solid var(--b2)", borderRadius:10, padding:"12px 14px", marginBottom:12 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom: isVar ? 10 : 0 }}>
              <input type="checkbox" id="var-chk" checked={isVar} onChange={e=>setIsVar(e.target.checked)} style={{ width:"auto", cursor:"pointer" }} />
              <label htmlFor="var-chk" style={{ fontSize:13, cursor:"pointer", fontWeight:500 }}>Conta variável (ex: combustível, feira)</label>
            </div>
            {isVar && <div style={{ fontSize:12, color:"var(--muted2)", lineHeight:1.5 }}>Sem data de vencimento fixa. Você poderá atualizar o valor todo mês direto na lista.</div>}
          </div>

          {!isVar && (
            <div className="fr" style={{ marginBottom:12 }}>
              <div><span className="fl">Dia de vencimento</span><input type="number" min="1" max="31" placeholder="Ex: 10" value={dueDay} onChange={e=>setDueDay(e.target.value)} /></div>
              <div><span className="fl">Categoria</span>
                <select value={catId} onChange={e=>setCatId(e.target.value)}>
                  <option value="">Sem categoria</option>
                  {categories.filter(c=>c.type==="expense").map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
          )}
          {isVar && (
            <div style={{ marginBottom:12 }}><span className="fl">Categoria</span>
              <select value={catId} onChange={e=>setCatId(e.target.value)}>
                <option value="">Sem categoria</option>
                {categories.filter(c=>c.type==="expense").map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <input type="checkbox" id="active-chk" checked={active} onChange={e=>setActive(e.target.checked)} style={{ width:"auto", cursor:"pointer" }} />
            <label htmlFor="active-chk" style={{ fontSize:13, color:"var(--muted2)", cursor:"pointer" }}>Conta ativa</label>
          </div>
          <div className="mf">
            <button type="button" className="btn bs" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn bp">Salvar</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── MODAL: EDIT INSTALLMENT ─────────────────────────────────────────────────
function EditInstallmentModal({ initial, onSave, onClose }: { initial: InstallmentSummary; onSave:(d:any)=>void; onClose:()=>void }) {
  const [desc, setDesc] = useState(initial.description)
  const [debtType, setDebtType] = useState(initial.debt_type)
  const [totalAmount, setTotalAmount] = useState(String(initial.total_amount))

  function save(e: any) {
    e.preventDefault()
    onSave({ description: desc, debt_type: debtType, total_amount: Number(totalAmount) })
  }

  return (
    <div className="mbg" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <div className="mt">Editar dívida</div>
        <form onSubmit={save}>
          <div style={{ marginBottom:12 }}><span className="fl">Descrição</span><input value={desc} onChange={e=>setDesc(e.target.value)} /></div>
          <div style={{ marginBottom:12 }}>
            <span className="fl">Tipo</span>
            <div className="dt-btns" style={{ marginTop:6 }}>
              {Object.entries(DEBT_CFG).map(([k,cfg])=>(
                <button key={k} type="button" className={`dt-btn ${debtType===k?`s-${k}`:""}`} onClick={()=>setDebtType(k)}>{cfg.icon} {cfg.label}</button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom:12 }}><span className="fl">Valor total</span><input type="number" value={totalAmount} onChange={e=>setTotalAmount(e.target.value)} /></div>
          <div className="mf">
            <button type="button" className="btn bs" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn bp">Salvar</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── MODAL: MANAGE CATEGORIES / ACCOUNTS ─────────────────────────────────────
function ManageModal({ title, items, itemType, onCreate, onUpdate, onDelete, onClose }: {
  title:string; items:any[]; itemType:"category"|"account";
  onCreate:(d:any)=>void; onUpdate:(id:number,d:any)=>void; onDelete:(id:number)=>void; onClose:()=>void
}) {
  const [newName, setNewName] = useState("")
  const [newType, setNewType] = useState("expense")
  const [editId, setEditId] = useState<number|null>(null)
  const [editName, setEditName] = useState("")
  const [editType, setEditType] = useState("expense")

  return (
    <div className="mbg" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <div className="mt">{title}</div>
        {/* ADD NEW */}
        <div style={{ background:"var(--s2)", border:"1px solid var(--b2)", borderRadius:10, padding:12, marginBottom:14 }}>
          <div className="fr" style={{ marginBottom:8 }}>
            <input placeholder="Nome" value={newName} onChange={e=>setNewName(e.target.value)} />
            {itemType==="category" && (
              <select value={newType} onChange={e=>setNewType(e.target.value)} style={{ maxWidth:130 }}>
                <option value="expense">Despesa</option>
                <option value="income">Receita</option>
              </select>
            )}
          </div>
          <button className="btn bp b-sm" onClick={()=>{
            if (!newName.trim()) return
            onCreate(itemType==="category" ? { name:newName, type:newType } : { name:newName })
            setNewName(""); setNewType("expense")
          }}>+ Adicionar</button>
        </div>
        {/* LIST */}
        <div style={{ maxHeight:320, overflowY:"auto" }}>
          {items.map(item => (
            <div key={item.id} className="manage-item">
              {editId===item.id ? (
                <div style={{ display:"flex", gap:6, flex:1, marginRight:6 }}>
                  <input value={editName} onChange={e=>setEditName(e.target.value)} style={{ flex:2 }} />
                  {itemType==="category" && (
                    <select value={editType} onChange={e=>setEditType(e.target.value)} style={{ flex:1, maxWidth:120 }}>
                      <option value="expense">Despesa</option>
                      <option value="income">Receita</option>
                    </select>
                  )}
                  <button className="btn bp b-sm" onClick={()=>{
                    onUpdate(item.id, itemType==="category" ? {name:editName,type:editType} : {name:editName})
                    setEditId(null)
                  }}>✓</button>
                  <button className="btn bs b-sm" onClick={()=>setEditId(null)}>✕</button>
                </div>
              ) : (
                <>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontWeight:500, fontSize:13 }}>{item.name}</span>
                    {itemType==="category" && (
                      <span className={`manage-badge ${item.type==="income"?"mi-inc":"mi-exp"}`}>
                        {item.type==="income"?"receita":"despesa"}
                      </span>
                    )}
                  </div>
                  <div style={{ display:"flex", gap:2 }}>
                    <button className="be" onClick={()=>{ setEditId(item.id); setEditName(item.name); setEditType(item.type||"expense") }}>✏️</button>
                    <button className="bd" onClick={()=>{ if(confirm(`Remover "${item.name}"?`)) onDelete(item.id) }}>🗑</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="mf"><button className="btn bs" onClick={onClose}>Fechar</button></div>
      </div>
    </div>
  )
}

// ─── APP ─────────────────────────────────────────────────────────────────────
export default function App() {
  const now = new Date()
  const [page, setPage] = useState<"dashboard"|"debts"|"fixed"|"settings">("dashboard")
  const [viewMode, setViewMode] = useState<"month"|"year">("month")
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth()+1)

  const [expenses, setExpenses] = useState<any[]>([])
  const [income, setIncome] = useState<any[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [categories, setCategories] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [catSummary, setCatSummary] = useState<any[]>([])
  const [monthlyData, setMonthlyData] = useState<any[]>([])
  const [accSummary, setAccSummary] = useState<any[]>([])
  const [installments, setInstallments] = useState<InstallmentSummary[]>([])
  const [recurring, setRecurring] = useState<RecurringItem[]>([])
  const [recTotal, setRecTotal] = useState(0)

  // forms
  const [desc, setDesc] = useState(""); const [amt, setAmt] = useState(""); const [txType, setTxType] = useState("expense")
  const [catId, setCatId] = useState(""); const [accId, setAccId] = useState(""); const [txDate, setTxDate] = useState(now.toISOString().slice(0,10))
  const [activeTab, setActiveTab] = useState<"expense"|"income">("expense")

  // debt form
  const [showDebt, setShowDebt] = useState(false)
  const [debtType, setDebtType] = useState("parcelamento")
  const [customMode, setCustomMode] = useState(false)
  const [inst, setInst] = useState({ description:"", total_amount:"", total_installments:"", start_date:now.toISOString().slice(0,10) })
  const [customRows, setCustomRows] = useState([{ amount:"", date:now.toISOString().slice(0,10) }])
  const [instCatId, setInstCatId] = useState(""); const [instAccId, setInstAccId] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [debtFilter, setDebtFilter] = useState("todos")

  // modals
  const [showRecModal, setShowRecModal] = useState(false)
  const [editingRec, setEditingRec] = useState<RecurringItem|null>(null)
  const [editingInst, setEditingInst] = useState<InstallmentSummary|null>(null)
  const [showCatModal, setShowCatModal] = useState(false)
  const [showAccModal, setShowAccModal] = useState(false)
  const [editingVarId, setEditingVarId] = useState<number|null>(null)
  const [varAmt, setVarAmt] = useState("")

  const filters = viewMode==="month" ? {year,month} : {year}

  useEffect(()=>{ loadAll() },[year,month,viewMode])

  async function loadAll() {
    const [exp,inc,s,c,cs,ms,a,is_,rec,as_] = await Promise.all([
      getTransactions("expense",filters), getTransactions("income",filters),
      getSummary(filters), getCategories(), getCategorySummary(filters),
      getMonthlySummary(year, viewMode==="month" ? month : undefined),
      getAccounts(), getInstallmentsSummary(), getRecurring(),
      getAccountSummary(filters)
    ])
    setExpenses(exp); setIncome(inc); setSummary(s)
    setCategories(c); setCatSummary(cs); setMonthlyData(ms)
    setAccounts(a); setInstallments(is_)
    setAccSummary(as_)
    const today = now.getDate()
    setRecurring(rec.map((r:RecurringItem)=>({...r, status: r.due_day ? (r.due_day>=today?"upcoming":"overdue") : "variable"})))
    setRecTotal(rec.filter((r:RecurringItem)=>r.active).reduce((a:number,r:RecurringItem)=>a+r.amount,0))
  }

  function prevPeriod() { if(viewMode==="month"){if(month===1){setMonth(12);setYear(y=>y-1)}else setMonth(m=>m-1)}else setYear(y=>y-1) }
  function nextPeriod() { if(viewMode==="month"){if(month===12){setMonth(1);setYear(y=>y+1)}else setMonth(m=>m+1)}else setYear(y=>y+1) }
  const periodLabel = viewMode==="month" ? `${MONTHS_PT[month-1]} ${year}` : `${year}`

  async function handleSubmit(e:any) {
    e.preventDefault()
    if (!desc||!amt||!catId||!accId){alert("Preencha todos os campos");return}
    await createTransaction({description:desc,amount:parseFloat(amt),type:txType,category_id:Number(catId),account_id:Number(accId),date:txDate})
    setDesc("");setAmt("");setTxType("expense");setCatId("");setAccId("");loadAll()
  }

  async function handleDebtSubmit(e:any) {
    e.preventDefault()
    if(submitting) return
    if(!instCatId||!instAccId){alert("Selecione categoria e conta");return}
    setSubmitting(true)
    try {
      if(customMode) {
        if(customRows.some(r=>!r.amount||!r.date)){alert("Preencha todas as parcelas");return}
        await createInstallmentCustom({
          description: inst.description, debt_type: debtType,
          category_id: Number(instCatId), account_id: Number(instAccId),
          installments: customRows.map(r=>({amount:Number(r.amount),date:r.date}))
        })
      } else {
        if(!inst.description||!inst.total_amount||!inst.total_installments){alert("Preencha todos os campos");return}
        await createInstallment({...inst, total_amount:Number(inst.total_amount), total_installments:Number(inst.total_installments), category_id:Number(instCatId), account_id:Number(instAccId), debt_type:debtType})
      }
      setInst({description:"",total_amount:"",total_installments:"",start_date:now.toISOString().slice(0,10)})
      setCustomRows([{amount:"",date:now.toISOString().slice(0,10)}])
      setInstCatId("");setInstAccId("");setShowDebt(false);loadAll()
    } finally { setSubmitting(false) }
  }

  const filteredInst = debtFilter==="todos" ? installments : installments.filter(i=>i.debt_type===debtFilter)
  const totalDebt = filteredInst.reduce((a,i)=>a+i.total_remaining,0)
  const totalMonthlyInst = filteredInst.filter(i=>i.pending_installments>0).reduce((a,i)=>a+i.value_per_installment,0)
  const activeInst = filteredInst.filter(i=>i.pending_installments>0)
  const doneInst = filteredInst.filter(i=>i.pending_installments===0)
  const getCN = (id:number) => categories.find(c=>c.id===id)?.name ?? "-"
  const today = now.toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})

  return (
    <>
      <style>{CSS}</style>
      <div className="app">

        {/* NAV */}
        <div className="nav">
          <div className="nav-logo">finance.</div>
          {([["dashboard","📊 Dashboard"],["debts","💳 Dívidas"],["fixed","🧾 Fixas"],["settings","⚙️ Config"]] as const).map(([p,l])=>(
            <button key={p} className={`nav-tab ${page===p?"on":""}`} onClick={()=>setPage(p)}>{l}</button>
          ))}
          <div className="nav-right">{today}</div>
        </div>

        {/* PERIOD NAV — sempre visível */}
        <div className="period-row">
          <div className="period-nav">
            <button className="p-arrow" onClick={prevPeriod}>‹</button>
            <span className="p-label">{periodLabel}</span>
            <button className="p-arrow" onClick={nextPeriod}>›</button>
          </div>
          <div className="view-tog">
            <button className={`vt-btn ${viewMode==="month"?"on":""}`} onClick={()=>setViewMode("month")}>Mensal</button>
            <button className={`vt-btn ${viewMode==="year"?"on":""}`} onClick={()=>setViewMode("year")}>Anual</button>
          </div>
          {viewMode==="year" && MONTHS_PT.map((m,i)=>(
            <button key={i} style={{background:"var(--s2)",border:"1px solid var(--b2)",borderRadius:8,color:"var(--muted2)",cursor:"pointer",fontSize:11,fontFamily:"'Plus Jakarta Sans',sans-serif",padding:"4px 9px",transition:"all .15s"}}
              onClick={()=>{setViewMode("month");setMonth(i+1)}}>{m}</button>
          ))}
        </div>

        {/* ═══ DASHBOARD ═══════════════════════════════════════════════════════ */}
        {page==="dashboard" && (
          <>
            {/* SUMMARY CARDS — 4 cards */}
            {summary && (
              <div className="sum-grid">
                <div className="sc c-inc">
                  <div className="sc-lbl">Receitas</div>
                  <div className="sc-val g">{fmt(summary.total_income)}</div>
                  <div className="sc-sub">{periodLabel}</div>
                  <div className="sc-ico">↑</div>
                </div>
                <div className="sc c-exp">
                  <div className="sc-lbl">Despesas pagas</div>
                  <div className="sc-val r">{fmt(summary.total_expense)}</div>
                  <div className="sc-sub">efetivadas no período</div>
                  <div className="sc-ico">↓</div>
                </div>
                <div className="sc c-pend">
                  <div className="sc-lbl">Falta pagar</div>
                  <div className="sc-val y">{fmt(summary.total_pending)}</div>
                  <div className="sc-sub">parcelas pendentes no período</div>
                  <div className="sc-ico">⏳</div>
                </div>
                <div className="sc c-bal">
                  <div className="sc-lbl">Saldo real</div>
                  <div className={`sc-val ${summary.balance>=0?"g":"r"}`}>{fmt(summary.balance)}</div>
                  <div className="sc-sub">{summary.balance>=0?"no positivo 👍":"no negativo ⚠️"}</div>
                  <div className="sc-ico">◎</div>
                </div>
              </div>
            )}

            {/* NOVA TRANSAÇÃO + PIZZA */}
            <div className="g2">
              <div className="panel">
                <div className="ph"><div className="pt">Nova transação</div></div>
                <form onSubmit={handleSubmit}>
                  <div className="fr">
                    <input style={{flex:2,minWidth:130}} type="text" placeholder="Descrição" value={desc} onChange={e=>setDesc(e.target.value)} />
                    <input style={{flex:1,minWidth:80}} type="number" placeholder="Valor" value={amt} onChange={e=>setAmt(e.target.value)} />
                  </div>
                  <div className="fr">
                    <input type="date" value={txDate} onChange={e=>setTxDate(e.target.value)} />
                    <select value={txType} onChange={e=>{setTxType(e.target.value);setCatId("")}}>
                      <option value="expense">Despesa</option>
                      <option value="income">Receita</option>
                    </select>
                    <select value={catId} onChange={e=>setCatId(e.target.value)}>
                      <option value="">Categoria</option>
                      {categories.filter(c=>c.type===txType).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <select value={accId} onChange={e=>setAccId(e.target.value)}>
                      <option value="">Conta</option>
                      {accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    <button type="submit" className="btn bp">+ Adicionar</button>
                  </div>
                </form>
              </div>

              {/* PIZZA */}
              <div className="panel">
                <div className="ph"><div><div className="pt">Por categoria</div><div className="ps">{periodLabel}</div></div></div>
                {catSummary.length>0 ? (
                  <PieChart width={265} height={265}>
                    <Pie data={catSummary} dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={100} innerRadius={48}>
                      {catSummary.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v:any)=>fmt(v)} contentStyle={{background:"#0f0f1a",border:"1px solid #ffffff15",borderRadius:10,fontSize:12}} />
                    <Legend iconType="circle" iconSize={7} wrapperStyle={{fontSize:12}} />
                  </PieChart>
                ) : <div style={{color:"var(--muted2)",fontSize:13,textAlign:"center",paddingTop:40}}>Sem dados para {periodLabel}.</div>}
              </div>
            </div>

            {/* EVOLUÇÃO */}
            <div className="panel" style={{marginBottom:16}}>
              <div className="ph"><div><div className="pt">Evolução</div><div className="ps">{viewMode==="year"?`Todos os meses de ${year}`:periodLabel}</div></div></div>
              {monthlyData.length>0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={monthlyData}>
                    <defs>
                      <linearGradient id="gi" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4ade80" stopOpacity={.25}/><stop offset="95%" stopColor="#4ade80" stopOpacity={0}/></linearGradient>
                      <linearGradient id="ge" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f87171" stopOpacity={.25}/><stop offset="95%" stopColor="#f87171" stopOpacity={0}/></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff07" />
                    <XAxis dataKey="month" tick={{fill:"#5a5a72",fontSize:11}} axisLine={false} tickLine={false} tickFormatter={v=>{const[,m]=v.split("-");return MONTHS_PT[parseInt(m)-1]??v}} />
                    <YAxis tick={{fill:"#5a5a72",fontSize:11}} axisLine={false} tickLine={false} tickFormatter={v=>`R$${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v:any)=>fmt(v)} contentStyle={{background:"#0f0f1a",border:"1px solid #ffffff15",borderRadius:10,fontSize:12}} />
                    <Legend iconType="circle" iconSize={7} wrapperStyle={{fontSize:12}} />
                    <Area type="monotone" dataKey="income" name="Receita" stroke="#4ade80" fill="url(#gi)" strokeWidth={2} dot={false} />
                    <Area type="monotone" dataKey="expense" name="Despesa" stroke="#f87171" fill="url(#ge)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <div style={{color:"var(--muted2)",fontSize:13,textAlign:"center",padding:36}}>Sem dados para o período.</div>}
            </div>

            {/* POR CONTA */}
            {accSummary.length>0 && (
              <div className="panel" style={{marginBottom:16}}>
                <div className="ph"><div><div className="pt">Por conta</div><div className="ps">{periodLabel}</div></div></div>
                <div className="acc-bars">
                  {accSummary.map((a:any)=>(
                    <div key={a.name} className="acc-bar-item">
                      <div className="acc-bar-top">
                        <span className="acc-bar-name">{a.name}</span>
                        <span className="acc-bar-bal" style={{color:a.balance>=0?"var(--green)":"var(--red)"}}>{fmt(a.balance)}</span>
                      </div>
                      <div className="acc-bar-row">
                        <span className="acc-bar-sub">↑ {fmt(a.income)}</span>
                        <span className="acc-bar-sub" style={{marginLeft:14}}>↓ {fmt(a.expense)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TRANSAÇÕES */}
            <div className="panel">
              <div className="ph">
                <div className="tabs">
                  <button className={`tb ${activeTab==="expense"?"on":""}`} onClick={()=>setActiveTab("expense")}>Despesas</button>
                  <button className={`tb ${activeTab==="income"?"on":""}`} onClick={()=>setActiveTab("income")}>Receitas</button>
                </div>
                <span className="bc">{activeTab==="expense"?expenses.length:income.length} · {periodLabel}</span>
              </div>
              <div className="tw">
                {activeTab==="expense" && (
                  expenses.length===0 ? <div style={{color:"var(--muted2)",fontSize:13,textAlign:"center",padding:"24px 0"}}>Nenhuma despesa em {periodLabel}.</div> :
                  <table><thead><tr><th>Descrição</th><th>Categoria</th><th>Conta</th><th>Data</th><th>Valor</th><th>Status</th><th></th></tr></thead>
                  <tbody>{expenses.map(t=>(
                    <tr key={t.id} className={t.paid&&t.installment_id?"pr":""}>
                      <td><div style={{fontWeight:500}}>{t.description}</div>{t.installment_id&&<span className="badge b-inst" style={{marginTop:2}}>parcelado</span>}</td>
                      <td style={{color:"var(--muted2)"}}>{getCN(t.category_id)}</td>
                      <td style={{color:"var(--muted2)"}}>{accounts.find(a=>a.id===t.account_id)?.name??"-"}</td>
                      <td style={{color:"var(--muted2)"}}>{fmtDate(t.date)}</td>
                      <td><span className="badge b-e">{fmt(t.amount)}</span></td>
                      <td>{t.installment_id ? <button className="pb" onClick={async()=>{await markTransactionPaid(t.id,!t.paid);loadAll()}}>{t.paid?"✅":"⏳"}</button> : <span className="badge b-ok">✓ pago</span>}</td>
                      <td><button className="bd" onClick={()=>{deleteTransaction(t.id);loadAll()}}>🗑</button></td>
                    </tr>
                  ))}</tbody></table>
                )}
                {activeTab==="income" && (
                  income.length===0 ? <div style={{color:"var(--muted2)",fontSize:13,textAlign:"center",padding:"24px 0"}}>Nenhuma receita em {periodLabel}.</div> :
                  <table><thead><tr><th>Descrição</th><th>Categoria</th><th>Conta</th><th>Data</th><th>Valor</th><th></th></tr></thead>
                  <tbody>{income.map(t=>(
                    <tr key={t.id}>
                      <td style={{fontWeight:500}}>{t.description}</td>
                      <td style={{color:"var(--muted2)"}}>{getCN(t.category_id)}</td>
                      <td style={{color:"var(--muted2)"}}>{accounts.find(a=>a.id===t.account_id)?.name??"-"}</td>
                      <td style={{color:"var(--muted2)"}}>{fmtDate(t.date)}</td>
                      <td><span className="badge b-i">{fmt(t.amount)}</span></td>
                      <td><button className="bd" onClick={()=>{deleteTransaction(t.id);loadAll()}}>🗑</button></td>
                    </tr>
                  ))}</tbody></table>
                )}
              </div>
            </div>
          </>
        )}

        {/* ═══ DÍVIDAS ═════════════════════════════════════════════════════════ */}
        {page==="debts" && (
          <>
            {/* NOVA DÍVIDA */}
            <button className={`tog ${showDebt?"on":""}`} onClick={()=>setShowDebt(!showDebt)}>
              + Nova dívida {showDebt?"▲":"▼"}
            </button>
            {showDebt && (
              <div className={`cbox ${showDebt?"on":""}`}>
                <div className="cbody" style={{flexDirection:"column"}}>
                  {/* TIPO */}
                  <div style={{width:"100%"}}>
                    <span className="fl">Tipo de dívida</span>
                    <div className="dt-btns" style={{marginTop:6}}>
                      {Object.entries(DEBT_CFG).map(([k,cfg])=>(
                        <button key={k} type="button" className={`dt-btn ${debtType===k?`s-${k}`:""}`} onClick={()=>setDebtType(k)}>{cfg.icon} {cfg.label}</button>
                      ))}
                    </div>
                  </div>

                  {/* MODO CUSTOM */}
                  <div style={{width:"100%",display:"flex",alignItems:"center",gap:10,background:"var(--s1)",borderRadius:10,padding:"10px 14px"}}>
                    <input type="checkbox" id="custom-chk" checked={customMode} onChange={e=>setCustomMode(e.target.checked)} style={{width:"auto",cursor:"pointer"}} />
                    <label htmlFor="custom-chk" style={{fontSize:13,cursor:"pointer",fontWeight:500}}>Parcelas personalizadas (valores e datas diferentes por parcela)</label>
                  </div>

                  <form onSubmit={handleDebtSubmit} style={{width:"100%",display:"flex",flexWrap:"wrap",gap:8}}>
                    <input style={{flex:2,minWidth:140}} placeholder="Descrição" value={inst.description} onChange={e=>setInst({...inst,description:e.target.value})} />

                    {!customMode ? (
                      <>
                        <input style={{flex:1}} type="number" placeholder="Valor total" value={inst.total_amount} onChange={e=>setInst({...inst,total_amount:e.target.value})} />
                        <input style={{flex:1,minWidth:80}} type="number" placeholder="Nº parcelas" min="1" value={inst.total_installments} onChange={e=>{
                          setInst({...inst,total_installments:e.target.value})
                          const n = parseInt(e.target.value)||0
                          setCustomRows(Array.from({length:n},(_,i)=>customRows[i]||{amount:"",date:now.toISOString().slice(0,10)}))
                        }} />
                        <input type="date" value={inst.start_date} onChange={e=>setInst({...inst,start_date:e.target.value})} />
                      </>
                    ) : (
                      <div style={{width:"100%"}}>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                          <span className="fl" style={{margin:0}}>Parcelas</span>
                          <button type="button" className="btn bp b-sm" onClick={()=>setCustomRows([...customRows,{amount:"",date:now.toISOString().slice(0,10)}])}>+ Parcela</button>
                        </div>
                        {customRows.map((row,i)=>(
                          <div key={i} className="custom-row">
                            <span className="custom-num">{i+1}</span>
                            <input type="number" placeholder="Valor" value={row.amount} onChange={e=>{const r=[...customRows];r[i]={...r[i],amount:e.target.value};setCustomRows(r)}} style={{flex:1}} />
                            <input type="date" value={row.date} onChange={e=>{const r=[...customRows];r[i]={...r[i],date:e.target.value};setCustomRows(r)}} style={{flex:1}} />
                            {customRows.length>1 && <button type="button" className="bd" onClick={()=>setCustomRows(customRows.filter((_,j)=>j!==i))}>✕</button>}
                          </div>
                        ))}
                        {customRows.length>0 && (
                          <div style={{fontSize:12,color:"var(--muted2)",marginTop:6}}>
                            Total: <strong style={{color:"var(--text)"}}>{fmt(customRows.reduce((a,r)=>a+Number(r.amount||0),0))}</strong> em {customRows.length} parcela{customRows.length>1?"s":""}
                          </div>
                        )}
                      </div>
                    )}

                    <select value={instCatId} onChange={e=>setInstCatId(e.target.value)}>
                      <option value="">Categoria</option>
                      {categories.filter(c=>c.type==="expense").map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <select value={instAccId} onChange={e=>setInstAccId(e.target.value)}>
                      <option value="">Conta</option>
                      {accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>

                    {!customMode && inst.total_amount && inst.total_installments && Number(inst.total_installments)>0 && (
                      <div className="hint">{DEBT_CFG[debtType].icon} {fmt(Number(inst.total_amount)/Number(inst.total_installments))}/mês · Só impacta o saldo quando marcado como pago</div>
                    )}

                    <button type="submit" disabled={submitting} className="btn bp" style={{opacity:submitting?.6:1}}>
                      {submitting?"Criando...":`✅ Criar ${DEBT_CFG[debtType].label}`}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* FILTER + LIST */}
            <div className="df">
              {[["todos","📋","Todos"],["parcelamento","💳","Parcelamentos"],["financiamento","🏦","Financiamentos"],["emprestimo","🤝","Empréstimos"]].map(([k,ic,lb])=>{
                const cnt = k==="todos" ? installments.filter(i=>i.pending_installments>0).length : installments.filter(i=>i.debt_type===k&&i.pending_installments>0).length
                return (
                  <button key={k} className={`dfb ${debtFilter===k?(k==="todos"?"active":`a-${k}`):"" }`} onClick={()=>setDebtFilter(k)}>
                    {ic} {lb} {cnt>0&&<span style={{background:"var(--b2)",borderRadius:10,padding:"1px 5px",fontSize:10}}>{cnt}</span>}
                  </button>
                )
              })}
            </div>

            {filteredInst.length>0 && (
              <div className="chips">
                <div className="chip"><div className="chip-lbl">Total em aberto</div><div className="chip-val" style={{color:"var(--red)"}}>{fmt(totalDebt)}</div></div>
                <div className="chip"><div className="chip-lbl">Compromisso mensal</div><div className="chip-val" style={{color:"var(--yellow)"}}>{fmt(totalMonthlyInst)}</div></div>
              </div>
            )}

            <div className="il">
              {activeInst.map(inst=>{
                const cfg = DEBT_CFG[inst.debt_type]??DEBT_CFG.parcelamento
                return (
                  <div key={inst.id} className="ic">
                    <div className="it">
                      <div>
                        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                          <span style={{background:cfg.bg,color:cfg.color,borderRadius:6,padding:"2px 7px",fontSize:10,fontWeight:600}}>{cfg.icon} {cfg.label}</span>
                        </div>
                        <div className="in">{inst.description}</div>
                        <div className="is">{fmt(inst.value_per_installment)}/mês</div>
                      </div>
                      <div className="ir">
                        <div className="irem" style={{color:cfg.color}}>{fmt(inst.total_remaining)}</div>
                        <div className="ipaid">pago: {fmt(inst.total_paid)}</div>
                        <div className="i-actions" style={{justifyContent:"flex-end",marginTop:4}}>
                          <button className="be" onClick={()=>setEditingInst(inst)}>✏️</button>
                          <button className="bd" onClick={async()=>{if(confirm("Excluir esta dívida e todas as parcelas?")){await deleteInstallment(inst.id);loadAll()}}}>🗑</button>
                        </div>
                      </div>
                    </div>
                    <div className="pw"><div className="pf" style={{width:`${inst.progress_percent}%`,background:`linear-gradient(90deg,${cfg.color},${cfg.color}99)`}} /></div>
                    <div className="ib">
                      <div className="ica">{inst.paid_installments}/{inst.total_installments} · {inst.progress_percent}%</div>
                      {inst.next_due_date&&<div className="inxt">📅 {fmtDate(inst.next_due_date)}</div>}
                    </div>
                  </div>
                )
              })}
              {doneInst.map(inst=>{
                const cfg = DEBT_CFG[inst.debt_type]??DEBT_CFG.parcelamento
                return (
                  <div key={inst.id} className="ic done">
                    <div className="it">
                      <div>
                        <span style={{background:cfg.bg,color:cfg.color,borderRadius:6,padding:"2px 7px",fontSize:10,fontWeight:600}}>{cfg.icon} {cfg.label}</span>
                        <div className="in" style={{marginTop:4}}>{inst.description}</div>
                      </div>
                      <div className="ir">
                        <div style={{fontFamily:"'Bricolage Grotesque',sans-serif",fontSize:16,fontWeight:700,color:"var(--green)"}}>{fmt(inst.total_paid)}</div>
                        <div className="i-actions" style={{justifyContent:"flex-end",marginTop:4}}>
                          <button className="bd" onClick={async()=>{if(confirm("Excluir?")){await deleteInstallment(inst.id);loadAll()}}}>🗑</button>
                        </div>
                      </div>
                    </div>
                    <div className="pw"><div className="pf" style={{width:"100%",background:"var(--green)"}} /></div>
                    <div className="ib"><div className="ica">100% pago</div><div className="idone">✅ Quitado</div></div>
                  </div>
                )
              })}
              {filteredInst.length===0&&<div style={{color:"var(--muted2)",fontSize:13,textAlign:"center",padding:"28px 0"}}>Nenhuma dívida{debtFilter!=="todos"?` do tipo ${DEBT_CFG[debtFilter]?.label.toLowerCase()}`:""}.</div>}
            </div>
          </>
        )}

        {/* ═══ CONTAS FIXAS ════════════════════════════════════════════════════ */}
        {page==="fixed" && (
          <>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
              <div>
                <div style={{fontFamily:"'Bricolage Grotesque',sans-serif",fontSize:20,fontWeight:700}}>Contas fixas</div>
                <div style={{fontSize:12,color:"var(--muted2)",marginTop:2}}>Recorrências mensais — fixas e variáveis</div>
              </div>
              <button className="btn bp" onClick={()=>{setEditingRec(null);setShowRecModal(true)}}>+ Nova conta</button>
            </div>

            {recurring.length>0 && (
              <div className="chips">
                <div className="chip"><div className="chip-lbl">Total mensal</div><div className="chip-val" style={{color:"var(--red)"}}>{fmt(recTotal)}</div></div>
                <div className="chip"><div className="chip-lbl">Fixas</div><div className="chip-val">{recurring.filter(r=>r.active&&!r.is_variable).length}</div></div>
                <div className="chip"><div className="chip-lbl">Variáveis</div><div className="chip-val" style={{color:"var(--yellow)"}}>{recurring.filter(r=>r.active&&r.is_variable).length}</div></div>
              </div>
            )}

            {recurring.length===0 ? (
              <div className="panel" style={{textAlign:"center",padding:"40px 0"}}>
                <div style={{fontSize:40,opacity:.2,marginBottom:10}}>🧾</div>
                <div style={{color:"var(--muted2)",fontSize:13}}>Nenhuma conta fixa cadastrada.<br/><span style={{fontSize:11,color:"var(--muted)"}}>Adicione luz, água, internet, assinaturas, combustível...</span></div>
              </div>
            ) : (
              <div className="rl">
                {/* FIXAS */}
                {recurring.filter(r=>!r.is_variable).length>0 && (
                  <div style={{fontSize:11,fontWeight:700,color:"var(--muted2)",textTransform:"uppercase",letterSpacing:".7px",margin:"8px 0 4px"}}>Com vencimento fixo</div>
                )}
                {recurring.filter(r=>!r.is_variable).map(item=>(
                  <div key={item.id} className={`ri ${!item.active?"inactive":""}`}>
                    <div className="ri-left">
                      <div className="ri-ico">{item.icon}</div>
                      <div>
                        <div className="ri-name">{item.name}</div>
                        <div className="ri-day">
                          dia {item.due_day}
                          {item.active&&<span style={{marginLeft:6}}>{item.status==="overdue"?<span className="badge b-over">venceu</span>:<span className="badge b-up">a vencer</span>}</span>}
                          {!item.active&&<span style={{marginLeft:6,fontSize:10,color:"var(--muted)"}}>inativa</span>}
                        </div>
                      </div>
                    </div>
                    <div className="ri-right">
                      <div className="ri-amt">{fmt(item.amount)}</div>
                      <div className="ri-actions">
                        <button className="be" onClick={()=>{setEditingRec(item);setShowRecModal(true)}}>✏️</button>
                        <button className="bd" onClick={async()=>{if(confirm("Remover?"))await deleteRecurring(item.id);loadAll()}}>🗑</button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* VARIÁVEIS */}
                {recurring.filter(r=>r.is_variable).length>0 && (
                  <div style={{fontSize:11,fontWeight:700,color:"var(--muted2)",textTransform:"uppercase",letterSpacing:".7px",margin:"12px 0 4px"}}>Variáveis (sem vencimento fixo)</div>
                )}
                {recurring.filter(r=>r.is_variable).map(item=>(
                  <div key={item.id} className={`ri ${!item.active?"inactive":""}`}>
                    <div className="ri-left">
                      <div className="ri-ico var">{item.icon}</div>
                      <div>
                        <div className="ri-name">{item.name}</div>
                        <div className="ri-day">
                          variável
                          {!item.active&&<span style={{marginLeft:6,fontSize:10,color:"var(--muted)"}}>inativa</span>}
                        </div>
                      </div>
                    </div>
                    <div className="ri-right">
                      {/* Edição inline do valor variável */}
                      {editingVarId===item.id ? (
                        <div style={{display:"flex",gap:6,alignItems:"center"}}>
                          <input type="number" value={varAmt} onChange={e=>setVarAmt(e.target.value)}
                            style={{width:100,padding:"5px 8px",fontSize:13}} autoFocus />
                          <button className="btn bp b-sm" onClick={async()=>{
                            await updateRecurringAmount(item.id,Number(varAmt));
                            setEditingVarId(null);loadAll()
                          }}>✓</button>
                          <button className="btn bs b-sm" onClick={()=>setEditingVarId(null)}>✕</button>
                        </div>
                      ) : (
                        <>
                          <div className="ri-amt" style={{color:"var(--yellow)"}}>{fmt(item.amount)}</div>
                          <div className="ri-actions">
                            <button className="be" title="Atualizar valor deste mês" onClick={()=>{setEditingVarId(item.id);setVarAmt(String(item.amount))}}>💰</button>
                            <button className="be" onClick={()=>{setEditingRec(item);setShowRecModal(true)}}>✏️</button>
                            <button className="bd" onClick={async()=>{if(confirm("Remover?"))await deleteRecurring(item.id);loadAll()}}>🗑</button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ═══ CONFIG ══════════════════════════════════════════════════════════ */}
        {page==="settings" && (
          <div className="g2b">
            <div className="panel">
              <div className="ph">
                <div><div className="pt">Categorias</div><div className="ps">gerencie suas categorias</div></div>
                <button className="btn bp b-sm" onClick={()=>setShowCatModal(true)}>Gerenciar</button>
              </div>
              <div style={{maxHeight:300,overflowY:"auto"}}>
                {categories.map(c=>(
                  <div key={c.id} className="manage-item">
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontWeight:500,fontSize:13}}>{c.name}</span>
                      <span className={`manage-badge ${c.type==="income"?"mi-inc":"mi-exp"}`}>{c.type==="income"?"receita":"despesa"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="panel">
              <div className="ph">
                <div><div className="pt">Contas</div><div className="ps">gerencie suas contas e cartões</div></div>
                <button className="btn bp b-sm" onClick={()=>setShowAccModal(true)}>Gerenciar</button>
              </div>
              <div style={{maxHeight:300,overflowY:"auto"}}>
                {accounts.map(a=>(
                  <div key={a.id} className="manage-item">
                    <span style={{fontWeight:500,fontSize:13}}>🏦 {a.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* MODALS */}
      {showRecModal && <RecurringModal initial={editingRec} categories={categories} onSave={async d=>{if(editingRec)await updateRecurring(editingRec.id,d);else await createRecurring(d);setShowRecModal(false);setEditingRec(null);loadAll()}} onClose={()=>{setShowRecModal(false);setEditingRec(null)}} />}

      {editingInst && <EditInstallmentModal initial={editingInst} onSave={async d=>{await updateInstallment(editingInst.id,d);setEditingInst(null);loadAll()}} onClose={()=>setEditingInst(null)} />}

      {showCatModal && <ManageModal title="Categorias" items={categories} itemType="category"
        onCreate={async d=>{await createCategory(d);loadAll()}}
        onUpdate={async(id,d)=>{await updateCategory(id,d);loadAll()}}
        onDelete={async id=>{await deleteCategory(id);loadAll()}}
        onClose={()=>setShowCatModal(false)} />}

      {showAccModal && <ManageModal title="Contas & Cartões" items={accounts} itemType="account"
        onCreate={async d=>{await createAccount(d);loadAll()}}
        onUpdate={async(id,d)=>{await updateAccount(id,d);loadAll()}}
        onDelete={async id=>{await deleteAccount(id);loadAll()}}
        onClose={()=>setShowAccModal(false)} />}
    </>
  )
}