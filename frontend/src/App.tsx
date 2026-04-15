import { useEffect, useState } from "react"
import { PieChart, Pie, Cell, Tooltip, Legend, AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import {
  getTransactions, getSummary, createTransaction, deleteTransaction,
  getCategories, getCategorySummary, getMonthlySummary, getAccounts,
  createInstallment, createInstallmentCustom, markTransactionPaid,
  updateTransactionAmount, getInstallmentsSummary, updateInstallment, deleteInstallment,
  getRecurring, getRecurringForMonth, createRecurring, updateRecurring,
  payRecurring, unpayRecurring, deleteRecurring,
  createCategory, updateCategory, deleteCategory,
  createAccount, updateAccount, deleteAccount, getAccountSummary
} from "./api/api"

const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)
const fmtDate = (d: string) => { if (!d) return "-"; const [y, m, day] = d.split("-"); return `${day}/${m}/${y}` }
const MONTHS_PT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"]
const PIE_COLORS = ["#7c6dfa","#fa6d8f","#6dfabc","#fad26d","#6db8fa","#fa8c6d","#c46dfa","#6dfafa"]
const ICON_OPTIONS = ["💡","🌊","📱","🌐","🏠","🚗","💊","📺","🎮","🎵","☕","🏋️","📚","✈️","🐾","🛡️","💳","🔑","📄","🏦","⛽","🧾","🎓","🍔"]

const DEBT_CFG: Record<string, { label: string; icon: string; color: string; bg: string; sub?: string }> = {
  parcelamento:          { label: "Parcelamento",    icon: "💳", color: "#7c6dfa", bg: "rgba(124,109,250,.15)" },
  financiamento:         { label: "Financiamento",   icon: "🏦", color: "#fad26d", bg: "rgba(250,210,109,.15)" },
  emprestimo_pessoal:    { label: "Emp. Pessoal",    icon: "🤝", color: "#fa6d8f", bg: "rgba(250,109,143,.15)" },
  emprestimo_consignado: { label: "Emp. Consignado", icon: "📋", color: "#6dfabc", bg: "rgba(109,250,188,.15)", sub: "desconto em folha" },
}

function getTxKind(t: any): { label: string; color: string; bg: string } {
  const d: string = t.description ?? ""
  if (/^\[FIXA:\d+\]/.test(d)) {
    if (t.is_variable_recurring) return { label: "Fixa variável", color: "#fad26d", bg: "rgba(250,210,109,.12)" }
    return { label: "Conta fixa", color: "#6db8fa", bg: "rgba(109,184,250,.12)" }
  }
  if (t.installment_id) {
    const cfg = DEBT_CFG[t.debt_type ?? "parcelamento"] ?? DEBT_CFG.parcelamento
    return { label: cfg.label, color: cfg.color, bg: cfg.bg }
  }
  return { label: "Despesa", color: "#f87171", bg: "rgba(248,113,113,.12)" }
}

function enrichExpenses(expenses: any[], recurringItems: any[]) {
  const varIds = new Set(recurringItems.filter(r => r.is_variable).map(r => r.id))
  return expenses.map(t => {
    const m = (t.description ?? "").match(/^\[FIXA:(\d+)\]/)
    if (m) return { ...t, is_variable_recurring: varIds.has(parseInt(m[1])), is_fixa: true }
    return t
  })
}

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
body{background:var(--bg);color:var(--text);font-family:'Plus Jakarta Sans',sans-serif;font-size:14px;min-height:100vh}
.app{max-width:1320px;margin:0 auto;padding:0 24px 40px}

/* NAV */
.nav{display:flex;align-items:center;gap:4px;background:var(--s2);border-bottom:1px solid var(--b1);padding:0 0 0 4px;margin:0 -24px 28px;position:sticky;top:0;z-index:20;backdrop-filter:blur(12px)}
.nav-logo{font-family:'Bricolage Grotesque',sans-serif;font-size:16px;font-weight:800;background:linear-gradient(130deg,var(--acc),var(--acc2));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;padding:14px 16px 14px 8px;margin-right:4px;border-right:1px solid var(--b1);white-space:nowrap}
.nav-tab{background:none;border:none;border-bottom:2px solid transparent;color:var(--muted2);cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;font-weight:500;padding:14px 13px;transition:all .18s;white-space:nowrap}
.nav-tab:hover{color:var(--text)}.nav-tab.on{border-bottom-color:var(--acc);color:var(--text)}
.nav-right{margin-left:auto;font-size:12px;color:var(--muted2);padding-right:16px}

/* PERIOD */
.period-row{display:flex;align-items:center;gap:10px;margin-bottom:20px;flex-wrap:wrap}
.pnav{display:flex;align-items:center;gap:4px;background:var(--s2);border:1px solid var(--b2);border-radius:40px;padding:5px 8px}
.parr{background:none;border:none;color:var(--muted2);cursor:pointer;font-size:20px;padding:3px 8px;border-radius:6px;transition:color .15s;line-height:1}.parr:hover{color:var(--text)}
.plbl{font-size:15px;font-weight:600;min-width:90px;text-align:center}
.vtog{display:flex;gap:2px;background:var(--s2);border:1px solid var(--b2);border-radius:8px;padding:3px}
.vtbtn{background:none;border:none;color:var(--muted2);cursor:pointer;font-size:13px;font-weight:600;padding:6px 12px;border-radius:6px;transition:all .15s;font-family:'Plus Jakarta Sans',sans-serif}.vtbtn.on{background:var(--s3);color:var(--text)}

/* CARDS */
.sum-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px}
.sc{background:var(--s1);border:1px solid var(--b1);border-radius:var(--r);padding:18px 20px;position:relative;overflow:hidden;transition:border-color .2s,transform .15s}
.sc:hover{transform:translateY(-2px);border-color:var(--b2)}
.sc::after{content:'';position:absolute;top:0;left:0;right:0;height:2px;border-radius:2px 2px 0 0}
.sc.c-inc::after{background:var(--green)}.sc.c-exp::after{background:var(--red)}.sc.c-pend::after{background:var(--yellow)}.sc.c-bal::after{background:linear-gradient(90deg,var(--acc),var(--acc2))}
.sc-lbl{font-size:12px;font-weight:600;color:var(--muted2);text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px}
.sc-val{font-family:'Bricolage Grotesque',sans-serif;font-size:26px;font-weight:700;line-height:1;letter-spacing:-1px}
.sc-val.g{color:var(--green)}.sc-val.r{color:var(--red)}.sc-val.y{color:var(--yellow)}
.sc-sub{font-size:12px;color:var(--muted2);margin-top:5px}
.sc-ico{position:absolute;right:14px;top:14px;font-size:28px;opacity:.07}

/*
  DASHBOARD LAYOUT (wireframe image 2):
  ┌──────────────────────────────┐ ┌──────────────┐
  │ Nova transação               │ │              │
  ├──────────────────────────────┤ │ Contas fixas │
  │ Evolução                     │ │              │
  ├──────────┬──────────┬────────┤ │              │
  │ Por cat  │ Por tipo │ P.cta  │ │              │
  ├──────────┴──────────┴────────┤ │              │
  │ Lista de despesas/receitas   │ │              │
  └──────────────────────────────┘ └──────────────┘
*/
.dash-outer{display:grid;grid-template-columns:1fr 300px;gap:16px;align-items:start;margin-bottom:16px}
.dash-left{display:flex;flex-direction:column;gap:16px;min-width:0}
.pies-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px}

/* PANEL */
.panel{background:var(--s1);border:1px solid var(--b1);border-radius:var(--r);padding:18px}
.ph{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
.pt{font-family:'Bricolage Grotesque',sans-serif;font-size:15px;font-weight:700}
.ps{font-size:12px;color:var(--muted2);margin-top:2px}

/* FORM */
input,select,textarea{background:var(--s2);border:1px solid var(--b2);border-radius:10px;color:var(--text);font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;padding:9px 13px;outline:none;transition:border-color .2s;width:100%}
input:focus,select:focus{border-color:var(--acc)}
input::placeholder{color:var(--muted)}
select option{background:var(--s2)}
.fr{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px}
.fr>*{flex:1;min-width:90px}
.fl{font-size:11px;font-weight:700;color:var(--muted2);text-transform:uppercase;letter-spacing:.7px;margin-bottom:5px;display:block}

/* BUTTONS */
.btn{border:none;border-radius:10px;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;font-weight:600;padding:9px 18px;transition:all .2s;white-space:nowrap}
.bp{background:var(--acc);color:#fff}.bp:hover{background:#6a5ce8;transform:translateY(-1px)}
.bs{background:var(--s2);color:var(--text);border:1px solid var(--b2)}.bs:hover{border-color:var(--acc)}
.bd{background:none;border:none;cursor:pointer;color:var(--muted);font-size:14px;padding:4px 7px;border-radius:6px;transition:all .15s}.bd:hover{color:var(--red);background:rgba(248,113,113,.1)}
.be{background:none;border:none;cursor:pointer;color:var(--muted);font-size:13px;padding:4px 7px;border-radius:6px;transition:all .15s}.be:hover{color:var(--acc);background:rgba(124,109,250,.1)}
.bsm{padding:6px 13px;font-size:12px}

/* TOGGLE */
.tog{display:inline-flex;align-items:center;gap:7px;background:var(--s2);border:1px solid var(--b2);border-radius:10px;color:var(--muted2);cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;font-weight:500;padding:9px 15px;margin-bottom:10px;transition:all .2s}
.tog.on{background:rgba(124,109,250,.12);border-color:var(--acc);color:var(--acc)}
.cbox{background:var(--s2);border:1px solid var(--b2);border-radius:var(--r);margin-bottom:12px}
.cbox.on{border-color:rgba(124,109,250,.4)}
.cbody{padding:16px;display:flex;flex-wrap:wrap;gap:8px}
.hint{width:100%;background:rgba(124,109,250,.1);border:1px solid rgba(124,109,250,.2);border-radius:8px;color:#b0a8ff;font-size:12px;padding:9px 13px}
.hint-green{width:100%;background:rgba(109,250,188,.08);border:1px solid rgba(109,250,188,.25);border-radius:8px;color:#6dfabc;font-size:12px;padding:9px 13px}

/* DEBT TYPE GRID */
.dt-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;width:100%}
.dt-btn{display:flex;align-items:center;gap:8px;background:var(--s2);border:1px solid var(--b2);border-radius:10px;color:var(--muted2);cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;font-weight:500;padding:10px 14px;transition:all .2s}
.dt-btn:hover{border-color:var(--b3);color:var(--text)}
.dt-btn.s-parcelamento{background:rgba(124,109,250,.15);border-color:#7c6dfa;color:#c0b8ff}
.dt-btn.s-financiamento{background:rgba(250,210,109,.15);border-color:#fad26d;color:#fad26d}
.dt-btn.s-emprestimo_pessoal{background:rgba(250,109,143,.15);border-color:#fa6d8f;color:#fa6d8f}
.dt-btn.s-emprestimo_consignado{background:rgba(109,250,188,.12);border-color:#6dfabc;color:#6dfabc}

/* TABS */
.tabs{display:flex;gap:3px;background:var(--s2);border-radius:10px;padding:3px;width:fit-content;margin-bottom:14px}
.tb{background:none;border:none;border-radius:8px;color:var(--muted2);cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;font-weight:500;padding:7px 15px;transition:all .18s}
.tb.on{background:var(--s1);color:var(--text);box-shadow:0 2px 6px rgba(0,0,0,.3)}

/* TABLE */
.tw{overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:13px}
th{text-align:left;padding:9px 11px;font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.7px;border-bottom:1px solid var(--b1)}
td{padding:11px 11px;border-bottom:1px solid var(--b1);vertical-align:middle}
tr:last-child td{border-bottom:none}
tr:hover td{background:rgba(255,255,255,.012)}
tr.pr{background:rgba(74,222,128,.03)}

/* BADGES */
.badge{display:inline-flex;align-items:center;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:600;white-space:nowrap}
.b-e{background:rgba(248,113,113,.12);color:var(--red)}
.b-i{background:rgba(74,222,128,.12);color:var(--green)}
.b-ok{background:rgba(74,222,128,.1);color:var(--green)}
.b-prog{background:rgba(109,250,188,.1);color:#6dfabc}
.bc{background:var(--s2);border:1px solid var(--b2);border-radius:20px;color:var(--muted2);font-size:12px;padding:3px 10px}
.pb{background:none;border:none;cursor:pointer;font-size:17px;padding:2px 5px;border-radius:6px;transition:background .15s}.pb:hover{background:var(--b2)}
.amt-edit{display:inline-flex;align-items:center;gap:5px}
.amt-input{width:90px;padding:4px 8px;font-size:13px;border-radius:8px}

/* INSTALLMENT CARDS */
.il{display:flex;flex-direction:column;gap:10px}
.ic{background:var(--s2);border:1px solid var(--b2);border-radius:12px;padding:14px}
.ic.done{opacity:.4}
.it{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px}
.in{font-weight:600;font-size:14px;margin-bottom:3px}
.is{font-size:12px;color:var(--muted2)}
.pw{background:var(--b1);border-radius:99px;height:5px;margin-bottom:7px;overflow:hidden}
.pf{height:100%;border-radius:99px;transition:width .4s}
.ib{display:flex;justify-content:space-between;align-items:center}
.ica{font-size:12px;color:var(--muted2)}
.inxt{font-size:12px;background:rgba(251,191,36,.1);color:var(--yellow);border-radius:5px;padding:3px 8px}
.idone{font-size:12px;background:rgba(74,222,128,.1);color:var(--green);border-radius:5px;padding:3px 8px}
.i-act{display:flex;gap:2px;opacity:0;transition:opacity .15s}.ic:hover .i-act{opacity:1}

/* DEBT FILTER */
.df{display:flex;gap:5px;margin-bottom:12px;flex-wrap:wrap}
.dfb{display:flex;align-items:center;gap:5px;background:var(--s2);border:1px solid var(--b2);border-radius:8px;color:var(--muted2);cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;font-size:12px;padding:5px 11px;transition:all .18s}
.dfb.active{background:var(--s3);color:var(--text);border-color:var(--b3)}
.dfb.a-parcelamento{background:rgba(124,109,250,.15);border-color:#7c6dfa;color:#c0b8ff}
.dfb.a-financiamento{background:rgba(250,210,109,.15);border-color:#fad26d;color:#fad26d}
.dfb.a-emprestimo_pessoal{background:rgba(250,109,143,.15);border-color:#fa6d8f;color:#fa6d8f}
.dfb.a-emprestimo_consignado{background:rgba(109,250,188,.12);border-color:#6dfabc;color:#6dfabc}

/* CHIPS */
.chips{display:flex;gap:10px;margin-bottom:14px}
.chip{background:var(--s2);border:1px solid var(--b2);border-radius:10px;padding:10px 14px;flex:1}
.chip-lbl{font-size:11px;font-weight:700;color:var(--muted2);text-transform:uppercase;letter-spacing:.7px;margin-bottom:4px}
.chip-val{font-family:'Bricolage Grotesque',sans-serif;font-size:18px;font-weight:700}

/* RECURRING */
.rl{display:flex;flex-direction:column;gap:7px}
.ri{display:flex;align-items:center;justify-content:space-between;background:var(--s2);border:1px solid var(--b2);border-radius:10px;padding:12px 14px;transition:border-color .2s}
.ri.inactive{opacity:.4}
.ri-left{display:flex;align-items:center;gap:11px}
.ri-ico{width:36px;height:36px;border-radius:10px;background:rgba(124,109,250,.12);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
.ri-ico.var{background:rgba(74,222,128,.1)}
.ri-name{font-size:14px;font-weight:600}
.ri-day{font-size:12px;color:var(--muted2);margin-top:2px}
.ri-right{display:flex;align-items:center;gap:10px}
.ri-act{display:flex;gap:2px;opacity:0;transition:opacity .15s}.ri:hover .ri-act{opacity:1}

/* CONTAS FIXAS NO DASH */
.rec-dash-list{display:flex;flex-direction:column;gap:6px;max-height:600px;overflow-y:auto;padding-right:2px}
.rdi{display:flex;align-items:center;justify-content:space-between;background:var(--s2);border:1px solid var(--b2);border-radius:9px;padding:10px 12px;transition:border-color .2s}
.rdi.paid{border-color:rgba(74,222,128,.3);background:rgba(74,222,128,.04)}
.rdi.overdue{border-color:rgba(248,113,113,.4);background:rgba(248,113,113,.04)}
.rdi.soon{border-color:rgba(251,191,36,.4);background:rgba(251,191,36,.04)}
.rdi-left{display:flex;align-items:center;gap:9px;flex:1;min-width:0}
.rdi-nm{font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rdi-sub{font-size:12px;color:var(--muted2);margin-top:1px}
.rdi-right{display:flex;align-items:center;gap:7px;flex-shrink:0}

/* BY ACCOUNT */
.acc-item{background:var(--s2);border:1px solid var(--b2);border-radius:10px;padding:11px 13px;margin-bottom:6px}

/* MODAL */
.mbg{position:fixed;inset:0;background:rgba(0,0,0,.8);display:flex;align-items:center;justify-content:center;z-index:100;padding:20px}
.modal{background:var(--s1);border:1px solid var(--b2);border-radius:var(--r);padding:26px;width:100%;max-width:480px;max-height:90vh;overflow-y:auto}
.mt{font-family:'Bricolage Grotesque',sans-serif;font-size:18px;font-weight:700;margin-bottom:18px}
.mf{display:flex;gap:10px;justify-content:flex-end;margin-top:18px}
.ico-grid{display:flex;flex-wrap:wrap;gap:5px;margin-top:5px}
.ico-opt{background:var(--s2);border:1px solid var(--b2);border-radius:8px;cursor:pointer;font-size:17px;padding:7px 9px;transition:all .15s;line-height:1}
.ico-opt:hover{border-color:var(--acc)}.ico-opt.sel{border-color:var(--acc);background:rgba(124,109,250,.15)}
.manage-item{display:flex;align-items:center;justify-content:space-between;padding:10px 13px;background:var(--s2);border:1px solid var(--b2);border-radius:10px;margin-bottom:7px}
.mi-inc{background:rgba(74,222,128,.12);color:var(--green);padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600}
.mi-exp{background:rgba(248,113,113,.12);color:var(--red);padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600}
.g2b{display:grid;grid-template-columns:1fr 1fr;gap:16px}

@media(max-width:1100px){.dash-outer{grid-template-columns:1fr}.pies-row{grid-template-columns:1fr 1fr}}
@media(max-width:1024px){.sum-grid{grid-template-columns:1fr 1fr}.g2b{grid-template-columns:1fr}.pies-row{grid-template-columns:1fr}}
@media(max-width:560px){.sum-grid{grid-template-columns:1fr}}
`

interface RecurringItem { id:number;name:string;amount:number;due_day?:number;icon:string;active:boolean;category_id?:number;is_variable:boolean }
interface RecurringMonthItem extends RecurringItem { paid:boolean;paid_amount?:number;transaction_id?:number;status:string }
interface InstallmentSummary { id:number;description:string;debt_type:string;total_amount:number;total_installments:number;paid_installments:number;pending_installments:number;value_per_installment:number;total_paid:number;total_remaining:number;next_due_date?:string;progress_percent:number }

function RecBadge({ status }: { status: string }) {
  if (status==="paid")    return <span className="badge b-ok">✓ pago</span>
  if (status==="overdue") return <span className="badge" style={{background:"rgba(248,113,113,.15)",color:"var(--red)"}}>⚠ venceu</span>
  if (status==="soon")    return <span className="badge" style={{background:"rgba(251,191,36,.15)",color:"var(--yellow)"}}>⏰ vence em breve</span>
  if (status==="variable") return <span className="badge" style={{background:"rgba(109,184,250,.1)",color:"#6db8fa"}}>variável</span>
  return <span className="badge" style={{background:"var(--b1)",color:"var(--muted2)"}}>a vencer</span>
}

// ─── MODALS ───────────────────────────────────────────────────────────────────
function RecurringModal({ initial, categories, onSave, onClose }: { initial?:RecurringItem|null; categories:any[]; onSave:(d:any)=>void; onClose:()=>void }) {
  const [name,setName]=useState(initial?.name??""); const [amount,setAmount]=useState(initial?String(initial.amount):"")
  const [dueDay,setDueDay]=useState(initial?.due_day?String(initial.due_day):""); const [icon,setIcon]=useState(initial?.icon??"📄")
  const [catId,setCatId]=useState(initial?.category_id?String(initial.category_id):""); const [active,setActive]=useState(initial?.active??true); const [isVar,setIsVar]=useState(initial?.is_variable??false)
  function save(e:any){
    e.preventDefault(); if(!name||!amount){alert("Preencha nome e valor");return}
    if(!isVar&&!dueDay){alert("Informe o dia de vencimento para contas fixas");return}
    onSave({name,amount:Number(amount),due_day:dueDay?Number(dueDay):null,icon,category_id:catId?Number(catId):null,active,is_variable:isVar})
  }
  return (
    <div className="mbg" onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div className="modal">
        <div className="mt">{initial?"Editar conta fixa":"Nova conta fixa"}</div>
        <form onSubmit={save}>
          <div style={{marginBottom:14}}><span className="fl">Ícone</span><div className="ico-grid">{ICON_OPTIONS.map(ic=><button key={ic} type="button" className={`ico-opt ${icon===ic?"sel":""}`} onClick={()=>setIcon(ic)}>{ic}</button>)}</div></div>
          <div className="fr" style={{marginBottom:12}}>
            <div style={{flex:2,minWidth:150}}><span className="fl">Nome</span><input placeholder="Ex: Luz, Netflix, Combustível" value={name} onChange={e=>setName(e.target.value)}/></div>
            <div style={{flex:1,minWidth:90}}><span className="fl">Valor atual</span><input type="number" placeholder="0,00" value={amount} onChange={e=>setAmount(e.target.value)}/></div>
          </div>
          <div style={{background:"var(--s2)",border:"1px solid var(--b2)",borderRadius:10,padding:"12px 14px",marginBottom:12}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
              <input type="checkbox" id="var-chk" checked={isVar} onChange={e=>setIsVar(e.target.checked)} style={{width:"auto",cursor:"pointer"}}/>
              <label htmlFor="var-chk" style={{fontSize:13,cursor:"pointer",fontWeight:500}}>Valor variável (muda todo mês)</label>
            </div>
            <div style={{fontSize:12,color:"var(--muted2)"}}>{isVar?"Informe o valor pago no dashboard todo mês. Dia de vencimento é opcional.":"Valor fixo todo mês. Dia de vencimento obrigatório."}</div>
          </div>
          <div className="fr" style={{marginBottom:12}}>
            <div><span className="fl">Dia de vencimento {isVar?"(opcional)":"(obrigatório)"}</span><input type="number" min="1" max="31" placeholder={isVar?"Ex: 10 (se tiver)":"Ex: 10"} value={dueDay} onChange={e=>setDueDay(e.target.value)}/></div>
            <div><span className="fl">Categoria</span><select value={catId} onChange={e=>setCatId(e.target.value)}><option value="">Sem categoria</option>{categories.filter(c=>c.type==="expense").map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}><input type="checkbox" id="act-chk" checked={active} onChange={e=>setActive(e.target.checked)} style={{width:"auto",cursor:"pointer"}}/><label htmlFor="act-chk" style={{fontSize:13,color:"var(--muted2)",cursor:"pointer"}}>Conta ativa</label></div>
          <div className="mf"><button type="button" className="btn bs" onClick={onClose}>Cancelar</button><button type="submit" className="btn bp">Salvar</button></div>
        </form>
      </div>
    </div>
  )
}

function EditInstModal({ initial, onSave, onClose }: { initial:InstallmentSummary; onSave:(d:any)=>void; onClose:()=>void }) {
  const [desc,setDesc]=useState(initial.description); const [dt,setDt]=useState(initial.debt_type); const [total,setTotal]=useState(String(initial.total_amount))
  return (
    <div className="mbg" onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div className="modal">
        <div className="mt">Editar dívida</div>
        <form onSubmit={e=>{e.preventDefault();onSave({description:desc,debt_type:dt,total_amount:Number(total)})}}>
          <div style={{marginBottom:12}}><span className="fl">Descrição</span><input value={desc} onChange={e=>setDesc(e.target.value)}/></div>
          <div style={{marginBottom:12}}><span className="fl">Tipo</span>
            <div className="dt-grid" style={{marginTop:8}}>
              {Object.entries(DEBT_CFG).map(([k,cfg])=>(
                <button key={k} type="button" className={`dt-btn ${dt===k?`s-${k}`:""}`} onClick={()=>setDt(k)}>
                  <span style={{fontSize:18}}>{cfg.icon}</span>
                  <div><div style={{fontSize:13,fontWeight:600}}>{cfg.label}</div>{cfg.sub&&<div style={{fontSize:11,opacity:.7}}>{cfg.sub}</div>}</div>
                </button>
              ))}
            </div>
          </div>
          <div style={{marginBottom:12}}><span className="fl">Valor total</span><input type="number" value={total} onChange={e=>setTotal(e.target.value)}/></div>
          <div className="mf"><button type="button" className="btn bs" onClick={onClose}>Cancelar</button><button type="submit" className="btn bp">Salvar</button></div>
        </form>
      </div>
    </div>
  )
}

function ManageModal({ title, items, itemType, onCreate, onUpdate, onDelete, onClose }: { title:string; items:any[]; itemType:"category"|"account"; onCreate:(d:any)=>void; onUpdate:(id:number,d:any)=>void; onDelete:(id:number)=>void; onClose:()=>void }) {
  const [nn,setNn]=useState(""); const [nt,setNt]=useState("expense")
  const [ei,setEi]=useState<number|null>(null); const [en,setEn]=useState(""); const [et,setEt]=useState("expense")
  return (
    <div className="mbg" onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div className="modal">
        <div className="mt">{title}</div>
        <div style={{background:"var(--s2)",border:"1px solid var(--b2)",borderRadius:10,padding:12,marginBottom:12}}>
          <div className="fr" style={{marginBottom:8}}><input placeholder="Nome" value={nn} onChange={e=>setNn(e.target.value)}/>{itemType==="category"&&<select value={nt} onChange={e=>setNt(e.target.value)} style={{maxWidth:130}}><option value="expense">Despesa</option><option value="income">Receita</option></select>}</div>
          <button className="btn bp bsm" onClick={()=>{if(!nn.trim())return;onCreate(itemType==="category"?{name:nn,type:nt}:{name:nn});setNn("");setNt("expense")}}>+ Adicionar</button>
        </div>
        <div style={{maxHeight:320,overflowY:"auto"}}>
          {items.map(item=>(
            <div key={item.id} className="manage-item">
              {ei===item.id
                ? <div style={{display:"flex",gap:6,flex:1,marginRight:6}}><input value={en} onChange={e=>setEn(e.target.value)} style={{flex:2}}/>{itemType==="category"&&<select value={et} onChange={e=>setEt(e.target.value)} style={{flex:1,maxWidth:120}}><option value="expense">Despesa</option><option value="income">Receita</option></select>}<button className="btn bp bsm" onClick={()=>{onUpdate(item.id,itemType==="category"?{name:en,type:et}:{name:en});setEi(null)}}>✓</button><button className="btn bs bsm" onClick={()=>setEi(null)}>✕</button></div>
                : <><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontWeight:500,fontSize:14}}>{item.name}</span>{itemType==="category"&&<span className={item.type==="income"?"mi-inc":"mi-exp"}>{item.type==="income"?"receita":"despesa"}</span>}</div><div style={{display:"flex",gap:2}}><button className="be" onClick={()=>{setEi(item.id);setEn(item.name);setEt(item.type||"expense")}}>✏️</button><button className="bd" onClick={()=>{if(confirm(`Remover "${item.name}"?`))onDelete(item.id)}}>🗑</button></div></>
              }
            </div>
          ))}
        </div>
        <div className="mf"><button className="btn bs" onClick={onClose}>Fechar</button></div>
      </div>
    </div>
  )
}

function PayRecurringModal({ item, accounts, year, month, onPay, onClose }: { item:RecurringMonthItem; accounts:any[]; year:number; month:number; onPay:(d:any)=>void; onClose:()=>void }) {
  const [payAmt,setPayAmt]=useState(String(item.paid_amount??item.amount))
  const [accId,setAccId]=useState(accounts[0]?.id?String(accounts[0].id):"")
  return (
    <div className="mbg" onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div className="modal">
        <div className="mt">{item.icon} {item.name}</div>
        <div style={{marginBottom:12}}><span className="fl">Valor pago este mês</span><input type="number" value={payAmt} onChange={e=>setPayAmt(e.target.value)}/></div>
        <div style={{marginBottom:16}}><span className="fl">Conta debitada</span><select value={accId} onChange={e=>setAccId(e.target.value)}><option value="">Selecione</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
        <div className="mf"><button className="btn bs" onClick={onClose}>Cancelar</button><button className="btn bp" onClick={()=>{if(!accId){alert("Selecione a conta");return};onPay({year,month,amount:Number(payAmt),account_id:Number(accId)})}}>✅ Confirmar</button></div>
      </div>
    </div>
  )
}

// ─── APP ─────────────────────────────────────────────────────────────────────
export default function App() {
  const now = new Date()
  const [page,setPage]=useState<"dashboard"|"debts"|"fixed"|"settings">("dashboard")
  const [viewMode,setViewMode]=useState<"month"|"year">("month")
  const [year,setYear]=useState(now.getFullYear()); const [month,setMonth]=useState(now.getMonth()+1)

  const [expenses,setExpenses]=useState<any[]>([]); const [income,setIncome]=useState<any[]>([])
  const [summary,setSummary]=useState<any>(null); const [categories,setCategories]=useState<any[]>([])
  const [accounts,setAccounts]=useState<any[]>([]); const [catSummary,setCatSummary]=useState<any[]>([])
  const [monthlyData,setMonthlyData]=useState<any[]>([]); const [accSummary,setAccSummary]=useState<any[]>([])
  const [installments,setInstallments]=useState<InstallmentSummary[]>([]); const [recurringItems,setRecurringItems]=useState<RecurringItem[]>([])
  const [recurringMonth,setRecurringMonth]=useState<RecurringMonthItem[]>([])

  const [desc,setDesc]=useState(""); const [amt,setAmt]=useState(""); const [txType,setTxType]=useState("expense")
  const [catId,setCatId]=useState(""); const [accId,setAccId]=useState(""); const [txDate,setTxDate]=useState(now.toISOString().slice(0,10))
  const [activeTab,setActiveTab]=useState<"expense"|"income">("expense")
  const [editAmtId,setEditAmtId]=useState<number|null>(null); const [editAmtVal,setEditAmtVal]=useState("")

  const [showDebt,setShowDebt]=useState(false); const [debtType,setDebtType]=useState("parcelamento")
  const [useManualMonthly,setUseManualMonthly]=useState(false)
  const [inst,setInst]=useState({description:"",total_amount:"",total_installments:"",monthly_amount:"",start_date:now.toISOString().slice(0,10)})
  const [instCatId,setInstCatId]=useState(""); const [instAccId,setInstAccId]=useState(""); const [submitting,setSubmitting]=useState(false)
  const [debtFilter,setDebtFilter]=useState("todos")

  const [showRecModal,setShowRecModal]=useState(false); const [editingRec,setEditingRec]=useState<RecurringItem|null>(null)
  const [editingInst,setEditingInst]=useState<InstallmentSummary|null>(null)
  const [showCatModal,setShowCatModal]=useState(false); const [showAccModal,setShowAccModal]=useState(false)
  const [payingRec,setPayingRec]=useState<RecurringMonthItem|null>(null)

  const filters = viewMode==="month"?{year,month}:{year}

  useEffect(()=>{loadAll()},[year,month,viewMode])

  async function loadAll(){
    const [exp,inc,s,c,cs,ms,a,is_,rec,recM,as_]=await Promise.all([
      getTransactions("expense",filters),getTransactions("income",filters),
      getSummary(filters),getCategories(),getCategorySummary(filters),
      getMonthlySummary(year,viewMode==="month"?month:undefined),
      getAccounts(),getInstallmentsSummary(),getRecurring(),
      getRecurringForMonth(year,viewMode==="month"?month:now.getMonth()+1),
      getAccountSummary(filters)
    ])
    setExpenses(enrichExpenses(exp,rec));setIncome(inc);setSummary(s)
    setCategories(c);setCatSummary(cs);setMonthlyData(ms)
    setAccounts(a);setInstallments(is_);setRecurringItems(rec)
    setRecurringMonth(recM);setAccSummary(as_)
  }

  function prevPeriod(){if(viewMode==="month"){if(month===1){setMonth(12);setYear(y=>y-1)}else setMonth(m=>m-1)}else setYear(y=>y-1)}
  function nextPeriod(){if(viewMode==="month"){if(month===12){setMonth(1);setYear(y=>y+1)}else setMonth(m=>m+1)}else setYear(y=>y+1)}
  const periodLabel=viewMode==="month"?`${MONTHS_PT[month-1]} ${year}`:`${year}`

  async function handleSubmit(e:any){
    e.preventDefault();if(!desc||!amt||!catId||!accId){alert("Preencha todos os campos");return}
    await createTransaction({description:desc,amount:parseFloat(amt),type:txType,category_id:Number(catId),account_id:Number(accId),date:txDate})
    setDesc("");setAmt("");setTxType("expense");setCatId("");setAccId("");loadAll()
  }

  async function handleDebtSubmit(e:any){
    e.preventDefault();if(submitting)return
    if(!inst.description||!inst.total_amount||!inst.total_installments||!instCatId||!instAccId){alert("Preencha todos os campos");return}
    setSubmitting(true)
    try{
      const tot=Number(inst.total_amount),n=Number(inst.total_installments)
      const monthly=useManualMonthly&&inst.monthly_amount?Number(inst.monthly_amount):tot/n
      const installments_data=Array.from({length:n},(_,i)=>{
        const d=new Date(inst.start_date);d.setMonth(d.getMonth()+i)
        return {amount:monthly,date:d.toISOString().slice(0,10)}
      })
      await createInstallmentCustom({description:inst.description,debt_type:debtType,category_id:Number(instCatId),account_id:Number(instAccId),installments:installments_data})
      setInst({description:"",total_amount:"",total_installments:"",monthly_amount:"",start_date:now.toISOString().slice(0,10)})
      setInstCatId("");setInstAccId("");setShowDebt(false);setUseManualMonthly(false);loadAll()
    }finally{setSubmitting(false)}
  }

  const filteredInst=debtFilter==="todos"?installments:installments.filter(i=>i.debt_type===debtFilter)
  const totalDebt=filteredInst.reduce((a,i)=>a+i.total_remaining,0)
  const totalMonthlyInst=filteredInst.filter(i=>i.pending_installments>0).reduce((a,i)=>a+i.value_per_installment,0)
  const activeInst=filteredInst.filter(i=>i.pending_installments>0); const doneInst=filteredInst.filter(i=>i.pending_installments===0)
  const getCN=(id:number)=>categories.find(c=>c.id===id)?.name??"-"
  const getAN=(id:number)=>accounts.find(a=>a.id===id)?.name??"-"
  const recTotal=recurringItems.filter(r=>r.active).reduce((a,r)=>a+r.amount,0)
  const today=now.toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})

  const typePieData=(()=>{
    const c:Record<string,number>={};for(const t of expenses){const k=getTxKind(t).label;c[k]=(c[k]||0)+t.amount}
    return Object.entries(c).map(([name,value])=>({name,value}))
  })()

  const instPreview=(()=>{
    const tot=Number(inst.total_amount),n=Number(inst.total_installments)
    if(!tot||!n)return null
    const auto=tot/n; const manual=useManualMonthly&&inst.monthly_amount?Number(inst.monthly_amount):null
    return {auto,manual,diff:manual?manual-auto:null}
  })()

  const PeriodNav=()=>(
    <div className="period-row">
      <div className="pnav"><button className="parr" onClick={prevPeriod}>‹</button><span className="plbl">{periodLabel}</span><button className="parr" onClick={nextPeriod}>›</button></div>
      <div className="vtog"><button className={`vtbtn ${viewMode==="month"?"on":""}`} onClick={()=>setViewMode("month")}>Mensal</button><button className={`vtbtn ${viewMode==="year"?"on":""}`} onClick={()=>setViewMode("year")}>Anual</button></div>
      {viewMode==="year"&&MONTHS_PT.map((m,i)=><button key={i} style={{background:"var(--s2)",border:"1px solid var(--b2)",borderRadius:7,color:"var(--muted2)",cursor:"pointer",fontSize:12,fontFamily:"'Plus Jakarta Sans',sans-serif",padding:"5px 9px"}} onClick={()=>{setViewMode("month");setMonth(i+1)}}>{m}</button>)}
    </div>
  )

  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        <div className="nav">
          <div className="nav-logo">Meu Controle Financeiro</div>
          {([["dashboard","📊 Dashboard"],["debts","💳 Dívidas"],["fixed","🧾 Fixas"],["settings","⚙️ Config"]] as const).map(([p,l])=>(
            <button key={p} className={`nav-tab ${page===p?"on":""}`} onClick={()=>setPage(p)}>{l}</button>
          ))}
          <div className="nav-right">{today}</div>
        </div>

        {/* ══ DASHBOARD ══════════════════════════════════════════════════════ */}
        {page==="dashboard"&&(
          <>
            <PeriodNav/>
            {summary&&(
              <div className="sum-grid">
                <div className="sc c-inc"><div className="sc-lbl">Receitas</div><div className="sc-val g">{fmt(summary.total_income)}</div><div className="sc-sub">{periodLabel}</div><div className="sc-ico">↑</div></div>
                <div className="sc c-exp"><div className="sc-lbl">Despesas pagas</div><div className="sc-val r">{fmt(summary.total_expense)}</div><div className="sc-sub">efetivadas</div><div className="sc-ico">↓</div></div>
                <div className="sc c-pend"><div className="sc-lbl">Falta pagar</div><div className="sc-val y">{fmt(summary.total_pending)}</div><div className="sc-sub">pendentes</div><div className="sc-ico">⏳</div></div>
                <div className="sc c-bal"><div className="sc-lbl">Saldo real</div><div className={`sc-val ${summary.balance>=0?"g":"r"}`}>{fmt(summary.balance)}</div><div className="sc-sub">{summary.balance>=0?"positivo 👍":"negativo ⚠️"}</div><div className="sc-ico">◎</div></div>
              </div>
            )}

            {/* OUTER GRID: left col (tudo exceto fixas) | right col (fixas) */}
            <div className="dash-outer">

              {/* LEFT */}
              <div className="dash-left">

                {/* Nova transação */}
                <div className="panel">
                  <div className="ph"><div className="pt">Nova transação</div></div>
                  <form onSubmit={handleSubmit}>
                    <div className="fr">
                      <input style={{flex:2,minWidth:130}} type="text" placeholder="Descrição" value={desc} onChange={e=>setDesc(e.target.value)}/>
                      <input style={{flex:1,minWidth:80}} type="number" placeholder="Valor" value={amt} onChange={e=>setAmt(e.target.value)}/>
                    </div>
                    <div className="fr">
                      <input type="date" value={txDate} onChange={e=>setTxDate(e.target.value)}/>
                      <select value={txType} onChange={e=>{setTxType(e.target.value);setCatId("")}}><option value="expense">Despesa</option><option value="income">Receita</option></select>
                      <select value={catId} onChange={e=>setCatId(e.target.value)}><option value="">Categoria</option>{categories.filter(c=>c.type===txType).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
                      <select value={accId} onChange={e=>setAccId(e.target.value)}><option value="">Conta</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select>
                      <button type="submit" className="btn bp">+ Adicionar</button>
                    </div>
                  </form>
                </div>

                {/* Evolução */}
                <div className="panel">
                  <div className="ph"><div><div className="pt">Evolução</div><div className="ps">{viewMode==="year"?`Todos os meses de ${year}`:periodLabel}</div></div></div>
                  {monthlyData.length>0?(
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={monthlyData}>
                        <defs>
                          <linearGradient id="gi" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4ade80" stopOpacity={.25}/><stop offset="95%" stopColor="#4ade80" stopOpacity={0}/></linearGradient>
                          <linearGradient id="ge" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f87171" stopOpacity={.25}/><stop offset="95%" stopColor="#f87171" stopOpacity={0}/></linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff07"/>
                        <XAxis dataKey="month" tick={{fill:"#8888a8",fontSize:12}} axisLine={false} tickLine={false} tickFormatter={v=>{const[,m]=v.split("-");return MONTHS_PT[parseInt(m)-1]??v}}/>
                        <YAxis tick={{fill:"#8888a8",fontSize:12}} axisLine={false} tickLine={false} tickFormatter={v=>`R$${(v/1000).toFixed(0)}k`}/>
                        <Tooltip formatter={(v:any)=>fmt(v)} contentStyle={{background:"#0f0f1a",border:"1px solid #ffffff15",borderRadius:10,fontSize:13}}/>
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{fontSize:13}}/>
                        <Area type="monotone" dataKey="income" name="Receita" stroke="#4ade80" fill="url(#gi)" strokeWidth={2} dot={false}/>
                        <Area type="monotone" dataKey="expense" name="Despesa" stroke="#f87171" fill="url(#ge)" strokeWidth={2} dot={false}/>
                      </AreaChart>
                    </ResponsiveContainer>
                  ):<div style={{color:"var(--muted2)",fontSize:13,textAlign:"center",padding:32}}>Sem dados para o período.</div>}
                </div>

                {/* Pizzas: Por categoria | Por tipo | Por conta — 3 colunas */}
                {(catSummary.length>0||typePieData.length>0||accSummary.length>0)&&(
                  <div className="pies-row">
                    {/* Por categoria */}
                    <div className="panel">
                      <div className="ph"><div><div className="pt">Por categoria</div><div className="ps">{periodLabel}</div></div></div>
                      {catSummary.length>0?(
                        <PieChart width={220} height={200}>
                          <Pie data={catSummary} dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={72} innerRadius={30}>{catSummary.map((_,i)=><Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}</Pie>
                          <Tooltip formatter={(v:any)=>fmt(v)} contentStyle={{background:"#0f0f1a",border:"1px solid #ffffff15",borderRadius:10,fontSize:12}}/>
                          <Legend iconType="circle" iconSize={7} wrapperStyle={{fontSize:11}}/>
                        </PieChart>
                      ):<div style={{color:"var(--muted2)",fontSize:12,textAlign:"center",paddingTop:24}}>Sem dados.</div>}
                    </div>

                    {/* Por tipo */}
                    <div className="panel">
                      <div className="ph"><div><div className="pt">Por tipo</div><div className="ps">despesas</div></div></div>
                      {typePieData.length>0?(
                        <PieChart width={220} height={200}>
                          <Pie data={typePieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={72} innerRadius={30}>{typePieData.map((_,i)=><Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}</Pie>
                          <Tooltip formatter={(v:any)=>fmt(v)} contentStyle={{background:"#0f0f1a",border:"1px solid #ffffff15",borderRadius:10,fontSize:12}}/>
                          <Legend iconType="circle" iconSize={7} wrapperStyle={{fontSize:11}}/>
                        </PieChart>
                      ):<div style={{color:"var(--muted2)",fontSize:12,textAlign:"center",paddingTop:24}}>Sem dados.</div>}
                    </div>

                    {/* Por conta */}
                    <div className="panel">
                      <div className="ph"><div><div className="pt">Por conta</div><div className="ps">{periodLabel}</div></div></div>
                      {accSummary.length>0?(
                        accSummary.map((a:any)=>(
                          <div key={a.name} className="acc-item">
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                              <span style={{fontWeight:600,fontSize:13}}>{a.name}</span>
                              <span style={{fontFamily:"'Bricolage Grotesque',sans-serif",fontSize:14,fontWeight:700,color:a.balance>=0?"var(--green)":"var(--red)"}}>{fmt(a.balance)}</span>
                            </div>
                            <div style={{display:"flex",gap:12}}><span style={{fontSize:12,color:"var(--muted2)"}}>↑ {fmt(a.income)}</span><span style={{fontSize:12,color:"var(--muted2)"}}>↓ {fmt(a.expense)}</span></div>
                          </div>
                        ))
                      ):<div style={{color:"var(--muted2)",fontSize:12,textAlign:"center",paddingTop:24}}>Sem dados.</div>}
                    </div>
                  </div>
                )}

                {/* Lista de despesas/receitas */}
                <div className="panel">
                  <div className="ph">
                    <div className="tabs">
                      <button className={`tb ${activeTab==="expense"?"on":""}`} onClick={()=>setActiveTab("expense")}>Despesas</button>
                      <button className={`tb ${activeTab==="income"?"on":""}`} onClick={()=>setActiveTab("income")}>Receitas</button>
                    </div>
                    {/* item 3: contador simples, sem data */}
                    <span className="bc">{activeTab==="expense"?expenses.length:income.length} registros</span>
                  </div>
                  <div className="tw">
                    {activeTab==="expense"&&(
                      expenses.length===0
                        ?<div style={{color:"var(--muted2)",fontSize:13,textAlign:"center",padding:"22px 0"}}>Nenhuma despesa em {periodLabel}.</div>
                        :<table><thead><tr><th>Descrição</th><th>Tipo</th><th>Categoria</th><th>Conta</th><th>Data</th><th>Valor</th><th>Status</th><th></th></tr></thead>
                        <tbody>{expenses.map(t=>{
                          const kind=getTxKind(t)
                          const displayName=(t.description??"").replace(/^\[FIXA:\d+\]\s*/,"")
                          const isConsig=t.debt_type==="emprestimo_consignado"
                          // ✅ item 2: contas fixas pagas NÃO têm edição de valor
                          const isFixa=t.is_fixa===true
                          return (
                            <tr key={t.id} className={t.paid&&t.installment_id?"pr":""}>
                              <td style={{fontWeight:500}}>{displayName}</td>
                              <td><span className="badge" style={{background:kind.bg,color:kind.color}}>{kind.label}</span></td>
                              <td style={{color:"var(--muted2)",fontSize:12}}>{getCN(t.category_id)}</td>
                              <td style={{color:"var(--muted2)",fontSize:12}}>{getAN(t.account_id)}</td>
                              <td style={{color:"var(--muted2)",fontSize:12}}>{fmtDate(t.date)}</td>
                              <td>
                                {isConsig||isFixa
                                  ? <span className="badge b-e">{fmt(t.amount)}</span>
                                  : editAmtId===t.id
                                    ? <div className="amt-edit"><input className="amt-input" type="number" value={editAmtVal} onChange={e=>setEditAmtVal(e.target.value)} autoFocus/><button className="btn bp bsm" onClick={async()=>{await updateTransactionAmount(t.id,Number(editAmtVal));setEditAmtId(null);loadAll()}}>✓</button><button className="btn bs bsm" onClick={()=>setEditAmtId(null)}>✕</button></div>
                                    : <div style={{display:"flex",alignItems:"center",gap:5}}><span className="badge b-e">{fmt(t.amount)}</span><button className="be" title="Editar valor" onClick={()=>{setEditAmtId(t.id);setEditAmtVal(String(t.amount))}}>✏️</button></div>
                                }
                              </td>
                              <td>
                                {isConsig
                                  ? <span className="badge b-prog">📋 programado</span>
                                  : t.installment_id
                                    ? <button className="pb" onClick={async()=>{await markTransactionPaid(t.id,!t.paid);loadAll()}}>{t.paid?"✅":"⏳"}</button>
                                    : <span className="badge b-ok">✓ pago</span>
                                }
                              </td>
                              <td>
                                {/* item 2: ao apagar uma fixa, ela volta como "não paga" no dashboard */}
                                {!isConsig&&<button className="bd" onClick={()=>{deleteTransaction(t.id);loadAll()}}>🗑</button>}
                              </td>
                            </tr>
                          )
                        })}</tbody></table>
                    )}
                    {activeTab==="income"&&(
                      income.length===0
                        ?<div style={{color:"var(--muted2)",fontSize:13,textAlign:"center",padding:"22px 0"}}>Nenhuma receita em {periodLabel}.</div>
                        :<table><thead><tr><th>Descrição</th><th>Categoria</th><th>Conta</th><th>Data</th><th>Valor</th><th></th></tr></thead>
                        <tbody>{income.map(t=>(
                          <tr key={t.id}><td style={{fontWeight:500}}>{t.description}</td><td style={{color:"var(--muted2)",fontSize:12}}>{getCN(t.category_id)}</td><td style={{color:"var(--muted2)",fontSize:12}}>{getAN(t.account_id)}</td><td style={{color:"var(--muted2)",fontSize:12}}>{fmtDate(t.date)}</td><td><span className="badge b-i">{fmt(t.amount)}</span></td><td><button className="bd" onClick={()=>{deleteTransaction(t.id);loadAll()}}>🗑</button></td></tr>
                        ))}</tbody></table>
                    )}
                  </div>
                </div>
              </div>

              {/* RIGHT: contas fixas — ocupa toda a lateral direita */}
              <div>
                {recurringMonth.length>0&&viewMode==="month"?(
                  <div className="panel">
                    <div className="ph"><div><div className="pt">Contas fixas</div><div className="ps">{periodLabel}</div></div><span className="bc">{recurringMonth.filter(r=>r.paid).length}/{recurringMonth.length} pagas</span></div>
                    <div className="rec-dash-list">
                      {recurringMonth.map(item=>(
                        <div key={item.id} className={`rdi ${item.status}`}>
                          <div className="rdi-left">
                            <span style={{fontSize:18,flexShrink:0}}>{item.icon}</span>
                            <div style={{minWidth:0}}>
                              <div className="rdi-nm">{item.name}</div>
                              <div className="rdi-sub">
                                {item.due_day?`dia ${item.due_day}`:item.is_variable?"variável":""}
                                {item.paid&&item.paid_amount&&<span style={{color:"var(--green)",marginLeft:6}}>{fmt(item.paid_amount)}</span>}
                              </div>
                            </div>
                          </div>
                          <div className="rdi-right">
                            <RecBadge status={item.status}/>
                            {item.paid
                              ? <button className="be" title="Desmarcar" onClick={async()=>{await unpayRecurring(item.id,{year,month});loadAll()}}>✕</button>
                              : item.is_variable
                                ? <button className="btn bp bsm" onClick={()=>setPayingRec(item)}>Pagar</button>
                                : <button className="btn bp bsm" onClick={()=>{const defAcc=accounts[0]?.id;if(!defAcc){alert("Cadastre uma conta");return};payRecurring(item.id,{year,month,amount:item.amount,account_id:defAcc}).then(()=>loadAll())}}>Pagar</button>
                            }
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ):(
                  /* modo anual ou sem fixas: mostrar nada no lado direito */
                  <div/>
                )}
              </div>
            </div>
          </>
        )}

        {/* ══ DÍVIDAS ════════════════════════════════════════════════════════ */}
        {page==="debts"&&(
          <>
            <button className={`tog ${showDebt?"on":""}`} onClick={()=>setShowDebt(!showDebt)}>+ Nova dívida {showDebt?"▲":"▼"}</button>
            {showDebt&&(
              <div className={`cbox ${showDebt?"on":""}`}>
                <div className="cbody" style={{flexDirection:"column"}}>
                  <div style={{width:"100%"}}>
                    <span className="fl">Tipo de dívida</span>
                    <div className="dt-grid" style={{marginTop:8}}>
                      {Object.entries(DEBT_CFG).map(([k,cfg])=>(
                        <button key={k} type="button" className={`dt-btn ${debtType===k?`s-${k}`:""}`} onClick={()=>setDebtType(k)}>
                          <span style={{fontSize:20}}>{cfg.icon}</span>
                          <div><div style={{fontSize:13,fontWeight:600}}>{cfg.label}</div>{cfg.sub&&<div style={{fontSize:11,opacity:.7}}>{cfg.sub}</div>}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  {debtType==="emprestimo_consignado"&&<div className="hint-green">📋 Parcelas já vencidas serão marcadas como pagas automaticamente. Futuras ficam como "programado".</div>}
                  <form onSubmit={handleDebtSubmit} style={{width:"100%",display:"flex",flexWrap:"wrap",gap:8}}>
                    <input style={{flex:2,minWidth:140}} placeholder="Descrição" value={inst.description} onChange={e=>setInst({...inst,description:e.target.value})}/>
                    <input style={{flex:1}} type="number" placeholder="Valor total" value={inst.total_amount} onChange={e=>setInst({...inst,total_amount:e.target.value})}/>
                    <input style={{flex:1,minWidth:80}} type="number" placeholder="Nº parcelas" min="1" value={inst.total_installments} onChange={e=>setInst({...inst,total_installments:e.target.value})}/>
                    <input type="date" value={inst.start_date} onChange={e=>setInst({...inst,start_date:e.target.value})}/>
                    <div style={{width:"100%",background:"var(--s1)",borderRadius:10,padding:"10px 14px",display:"flex",flexDirection:"column",gap:10}}>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <input type="checkbox" id="manual-chk" checked={useManualMonthly} onChange={e=>setUseManualMonthly(e.target.checked)} style={{width:"auto",cursor:"pointer"}}/>
                        <label htmlFor="manual-chk" style={{fontSize:13,cursor:"pointer",fontWeight:500}}>Informar valor da parcela manualmente (com juros do banco)</label>
                      </div>
                      {useManualMonthly&&<div><span className="fl">Valor mensal real</span><input type="number" placeholder="Ex: 350,00" value={inst.monthly_amount} onChange={e=>setInst({...inst,monthly_amount:e.target.value})}/></div>}
                      {instPreview&&(
                        <div style={{fontSize:12,color:"var(--muted2)"}}>
                          Automático: <strong style={{color:"var(--text)"}}>{fmt(instPreview.auto)}/mês</strong>
                          {instPreview.manual&&<span> → Manual: <strong style={{color:"var(--yellow)"}}>{fmt(instPreview.manual)}/mês</strong>{instPreview.diff&&instPreview.diff>0&&<span style={{color:"var(--red)",marginLeft:4}}>(+{fmt(instPreview.diff)} juros)</span>}</span>}
                        </div>
                      )}
                    </div>
                    <select value={instCatId} onChange={e=>setInstCatId(e.target.value)}><option value="">Categoria</option>{categories.filter(c=>c.type==="expense").map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
                    <select value={instAccId} onChange={e=>setInstAccId(e.target.value)}><option value="">Conta</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select>
                    <button type="submit" disabled={submitting} className="btn bp" style={{opacity:submitting?.6:1}}>{submitting?"Criando...":`✅ Criar ${DEBT_CFG[debtType].label}`}</button>
                  </form>
                </div>
              </div>
            )}
            <div className="df">
              {[["todos","📋","Todos"],["parcelamento","💳","Parcelamentos"],["financiamento","🏦","Financiamentos"],["emprestimo_pessoal","🤝","Emp. Pessoal"],["emprestimo_consignado","📋","Consignado"]].map(([k,ic,lb])=>{
                const cnt=k==="todos"?installments.filter(i=>i.pending_installments>0).length:installments.filter(i=>i.debt_type===k&&i.pending_installments>0).length
                return <button key={k} className={`dfb ${debtFilter===k?(k==="todos"?"active":`a-${k}`):"" }`} onClick={()=>setDebtFilter(k)}>{ic} {lb}{cnt>0&&<span style={{background:"var(--b2)",borderRadius:10,padding:"1px 6px",fontSize:10,marginLeft:4}}>{cnt}</span>}</button>
              })}
            </div>
            {filteredInst.length>0&&<div className="chips"><div className="chip"><div className="chip-lbl">Total em aberto</div><div className="chip-val" style={{color:"var(--red)"}}>{fmt(totalDebt)}</div></div><div className="chip"><div className="chip-lbl">Compromisso mensal</div><div className="chip-val" style={{color:"var(--yellow)"}}>{fmt(totalMonthlyInst)}</div></div></div>}
            <div className="il">
              {[...activeInst,...doneInst].map(inst=>{
                const cfg=DEBT_CFG[inst.debt_type]??DEBT_CFG.parcelamento; const done=inst.pending_installments===0; const isConsig=inst.debt_type==="emprestimo_consignado"
                return (
                  <div key={inst.id} className={`ic ${done?"done":""}`}>
                    <div className="it">
                      <div>
                        <span style={{background:cfg.bg,color:cfg.color,borderRadius:6,padding:"3px 8px",fontSize:11,fontWeight:600,display:"inline-flex",alignItems:"center",gap:4,marginBottom:5}}>
                          {cfg.icon} {cfg.label}{isConsig&&<span style={{fontSize:10,opacity:.8}}>· desconto em folha</span>}
                        </span>
                        <div className="in">{inst.description}</div>
                        <div className="is">{fmt(inst.value_per_installment)}/mês{isConsig&&" · automático"}</div>
                      </div>
                      <div style={{textAlign:"right"}}>
                        {done?<div style={{fontFamily:"'Bricolage Grotesque',sans-serif",fontSize:16,fontWeight:700,color:"var(--green)"}}>{fmt(inst.total_paid)}</div>:<><div style={{fontFamily:"'Bricolage Grotesque',sans-serif",fontSize:17,fontWeight:700,color:cfg.color}}>{fmt(inst.total_remaining)}</div><div style={{fontSize:12,color:"var(--muted2)"}}>pago: {fmt(inst.total_paid)}</div></>}
                        <div className="i-act" style={{justifyContent:"flex-end",marginTop:4}}>
                          {!done&&!isConsig&&<button className="be" onClick={()=>setEditingInst(inst)}>✏️</button>}
                          <button className="bd" onClick={async()=>{if(confirm("Excluir esta dívida e todas as parcelas?")){await deleteInstallment(inst.id);loadAll()}}}>🗑</button>
                        </div>
                      </div>
                    </div>
                    <div className="pw"><div className="pf" style={{width:`${inst.progress_percent}%`,background:done?"var(--green)":`linear-gradient(90deg,${cfg.color},${cfg.color}99)`}}/></div>
                    <div className="ib"><div className="ica">{inst.paid_installments}/{inst.total_installments} · {inst.progress_percent}%</div>{inst.next_due_date&&!done&&<div className="inxt">📅 {fmtDate(inst.next_due_date)}</div>}{done&&<div className="idone">✅ Quitado</div>}</div>
                  </div>
                )
              })}
              {filteredInst.length===0&&<div style={{color:"var(--muted2)",fontSize:13,textAlign:"center",padding:"28px 0"}}>Nenhuma dívida cadastrada.</div>}
            </div>
          </>
        )}

        {/* ══ FIXAS ═══════════════════════════════════════════════════════════ */}
        {page==="fixed"&&(
          <>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
              <div><div style={{fontFamily:"'Bricolage Grotesque',sans-serif",fontSize:20,fontWeight:700}}>Contas fixas</div><div style={{fontSize:13,color:"var(--muted2)",marginTop:2}}>Gerencie suas recorrências mensais</div></div>
              <button className="btn bp" onClick={()=>{setEditingRec(null);setShowRecModal(true)}}>+ Nova conta</button>
            </div>
            {recurringItems.length>0&&<div className="chips"><div className="chip"><div className="chip-lbl">Total estimado/mês</div><div className="chip-val" style={{color:"#6db8fa"}}>{fmt(recTotal)}</div></div><div className="chip"><div className="chip-lbl">Fixas</div><div className="chip-val">{recurringItems.filter(r=>r.active&&!r.is_variable).length}</div></div><div className="chip"><div className="chip-lbl">Variáveis</div><div className="chip-val" style={{color:"var(--yellow)"}}>{recurringItems.filter(r=>r.active&&r.is_variable).length}</div></div></div>}
            {recurringItems.length===0?(<div className="panel" style={{textAlign:"center",padding:"36px 0"}}><div style={{fontSize:40,opacity:.2,marginBottom:8}}>🧾</div><div style={{color:"var(--muted2)",fontSize:13}}>Nenhuma conta fixa cadastrada.</div></div>):(
              <div className="rl">
                {recurringItems.filter(r=>!r.is_variable).length>0&&<div style={{fontSize:11,fontWeight:700,color:"var(--muted2)",textTransform:"uppercase",letterSpacing:".7px",margin:"6px 0 3px"}}>Com vencimento fixo</div>}
                {recurringItems.filter(r=>!r.is_variable).map(item=>(
                  <div key={item.id} className={`ri ${!item.active?"inactive":""}`}>
                    <div className="ri-left"><div className="ri-ico">{item.icon}</div><div><div className="ri-name">{item.name}</div><div className="ri-day">dia {item.due_day}{!item.active&&<span style={{marginLeft:6,fontSize:11,color:"var(--muted)"}}>inativa</span>}</div></div></div>
                    <div className="ri-right"><span style={{fontFamily:"'Bricolage Grotesque',sans-serif",fontSize:15,fontWeight:700,color:"#6db8fa"}}>{fmt(item.amount)}</span><div className="ri-act"><button className="be" onClick={()=>{setEditingRec(item);setShowRecModal(true)}}>✏️</button><button className="bd" onClick={async()=>{if(confirm("Remover?"))await deleteRecurring(item.id);loadAll()}}>🗑</button></div></div>
                  </div>
                ))}
                {recurringItems.filter(r=>r.is_variable).length>0&&<div style={{fontSize:11,fontWeight:700,color:"var(--muted2)",textTransform:"uppercase",letterSpacing:".7px",margin:"12px 0 3px"}}>Variáveis</div>}
                {recurringItems.filter(r=>r.is_variable).map(item=>(
                  <div key={item.id} className={`ri ${!item.active?"inactive":""}`}>
                    <div className="ri-left"><div className="ri-ico var">{item.icon}</div><div><div className="ri-name">{item.name}</div><div className="ri-day">{item.due_day?`dia ${item.due_day} · variável`:"variável · sem vencimento fixo"}{!item.active&&<span style={{marginLeft:6,fontSize:11,color:"var(--muted)"}}>inativa</span>}</div></div></div>
                    <div className="ri-right"><span style={{fontFamily:"'Bricolage Grotesque',sans-serif",fontSize:15,fontWeight:700,color:"var(--yellow)"}}>{fmt(item.amount)}</span><div className="ri-act"><button className="be" onClick={()=>{setEditingRec(item);setShowRecModal(true)}}>✏️</button><button className="bd" onClick={async()=>{if(confirm("Remover?"))await deleteRecurring(item.id);loadAll()}}>🗑</button></div></div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ══ CONFIG ══════════════════════════════════════════════════════════ */}
        {page==="settings"&&(
          <div className="g2b">
            <div className="panel"><div className="ph"><div><div className="pt">Categorias</div><div className="ps">gerencie suas categorias</div></div><button className="btn bp bsm" onClick={()=>setShowCatModal(true)}>Gerenciar</button></div><div style={{maxHeight:300,overflowY:"auto"}}>{categories.map(c=><div key={c.id} className="manage-item"><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontWeight:500,fontSize:14}}>{c.name}</span><span className={c.type==="income"?"mi-inc":"mi-exp"}>{c.type==="income"?"receita":"despesa"}</span></div></div>)}</div></div>
            <div className="panel"><div className="ph"><div><div className="pt">Contas & Cartões</div><div className="ps">gerencie suas contas</div></div><button className="btn bp bsm" onClick={()=>setShowAccModal(true)}>Gerenciar</button></div><div style={{maxHeight:300,overflowY:"auto"}}>{accounts.map(a=><div key={a.id} className="manage-item"><span style={{fontWeight:500,fontSize:14}}>🏦 {a.name}</span></div>)}</div></div>
          </div>
        )}
      </div>

      {showRecModal&&<RecurringModal initial={editingRec} categories={categories} onSave={async d=>{if(editingRec)await updateRecurring(editingRec.id,d);else await createRecurring(d);setShowRecModal(false);setEditingRec(null);loadAll()}} onClose={()=>{setShowRecModal(false);setEditingRec(null)}}/>}
      {editingInst&&<EditInstModal initial={editingInst} onSave={async d=>{await updateInstallment(editingInst.id,d);setEditingInst(null);loadAll()}} onClose={()=>setEditingInst(null)}/>}
      {showCatModal&&<ManageModal title="Categorias" items={categories} itemType="category" onCreate={async d=>{await createCategory(d);loadAll()}} onUpdate={async(id,d)=>{await updateCategory(id,d);loadAll()}} onDelete={async id=>{await deleteCategory(id);loadAll()}} onClose={()=>setShowCatModal(false)}/>}
      {showAccModal&&<ManageModal title="Contas & Cartões" items={accounts} itemType="account" onCreate={async d=>{await createAccount(d);loadAll()}} onUpdate={async(id,d)=>{await updateAccount(id,d);loadAll()}} onDelete={async id=>{await deleteAccount(id);loadAll()}} onClose={()=>setShowAccModal(false)}/>}
      {payingRec&&<PayRecurringModal item={payingRec} accounts={accounts} year={year} month={month} onPay={async d=>{await payRecurring(payingRec.id,d);setPayingRec(null);loadAll()}} onClose={()=>setPayingRec(null)}/>}
    </>
  )
}