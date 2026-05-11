import { useEffect, useState } from "react"
import { PieChart, Pie, Cell, Tooltip, Legend, AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import {
  getTransactions, getSummary, createTransaction, deleteTransaction,
  getCategories, getCategorySummary, getMonthlySummary, getAccounts,
  createInstallmentCustom, markTransactionPaid, updateTransactionAmount,
  getInstallmentsSummary, updateInstallment, deleteInstallment,
  getRecurring, getRecurringForMonth, createRecurring, updateRecurring,
  payRecurring, unpayRecurring, deleteRecurring,
  createCategory, updateCategory, deleteCategory,
  createAccount, updateAccount, deleteAccount, getAccountSummary,
  getInstallmentRealBalance
} from "./api/api"
import AmortizationModal from "./AmortizationModal"

const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)
const fmtDate = (d: string) => { if (!d) return "-"; const [y, m, day] = d.split("-"); return `${day}/${m}/${y}` }
const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"]
const PIE_COLORS = ["#7c6dfa","#fa6d8f","#6dfabc","#fad26d","#6db8fa","#fa8c6d","#c46dfa","#6dfafa"]

// ✅ item 2: ícones mais visíveis e variados
const ICONS = ["💡","⚡","🌊","📱","💻","🌐","🏠","🏢","🚗","🚙","🏍️","✈️","🚌","💊","🏥","📺","📷","🎮","🎵","🎬","☕","🍔","🛒","📚","🎓","🏋️","⚽","🐾","🛡️","💳","💰","🏦","🔑","📄","🧾","⛽","🌿","🛠️","🎁","📦"]

const DEBT: Record<string,{label:string;icon:string;color:string;bg:string;sub?:string}> = {
  parcelamento:          { label:"Parcelamento",    icon:"💳", color:"#7c6dfa", bg:"rgba(124,109,250,.15)" },
  financiamento:         { label:"Financiamento",   icon:"🏦", color:"#fad26d", bg:"rgba(250,210,109,.15)" },
  emprestimo_pessoal:    { label:"Emp. Pessoal",    icon:"🤝", color:"#fa6d8f", bg:"rgba(250,109,143,.15)" },
  emprestimo_consignado: { label:"Emp. Consignado", icon:"📋", color:"#6dfabc", bg:"rgba(109,250,188,.15)", sub:"desconto em folha" },
}

function txKind(t: any) {
  const d = t.description ?? ""
  if (/^\[FIXA:\d+\]/.test(d)) return t.is_variable_recurring
    ? { label:"Fixa variável", color:"#fad26d", bg:"rgba(250,210,109,.12)" }
    : { label:"Conta fixa",    color:"#6db8fa", bg:"rgba(109,184,250,.12)" }
  if (t.installment_id) { const c = DEBT[t.debt_type ?? "parcelamento"] ?? DEBT.parcelamento; return { label:c.label, color:c.color, bg:c.bg } }
  return { label:"Despesa", color:"#f87171", bg:"rgba(248,113,113,.12)" }
}

function enrichExp(expenses: any[], recurring: any[]) {
  const varIds = new Set(recurring.filter(r => r.is_variable).map(r => r.id))
  return expenses.map(t => {
    const m = (t.description ?? "").match(/^\[FIXA:(\d+)\]/)
    return m ? { ...t, is_variable_recurring: varIds.has(parseInt(m[1])), is_fixa: true } : t
  })
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600&family=Bricolage+Grotesque:wght@700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#08080f;--s1:#0f0f1a;--s2:#17172a;--s3:#1f1f35;--b1:#ffffff0d;--b2:#ffffff1a;--b3:#ffffff28;--acc:#7c6dfa;--acc2:#fa6d8f;--text:#eeeef8;--muted:#5a5a72;--muted2:#8888a8;--green:#4ade80;--red:#f87171;--yellow:#fbbf24;--r:14px}
body{background:var(--bg);color:var(--text);font-family:'Plus Jakarta Sans',sans-serif;font-size:14px;min-height:100vh}
.app{max-width:1320px;margin:0 auto;padding:0 24px 40px}
.nav{display:flex;align-items:center;gap:4px;background:var(--s2);border-bottom:1px solid var(--b1);padding:0 0 0 4px;margin:0 -24px 28px;position:sticky;top:0;z-index:20;backdrop-filter:blur(12px)}
.nav-logo{font-family:'Bricolage Grotesque',sans-serif;font-size:16px;font-weight:800;background:linear-gradient(130deg,var(--acc),var(--acc2));-webkit-background-clip:text;-webkit-text-fill-color:transparent;padding:14px 16px 14px 8px;margin-right:4px;border-right:1px solid var(--b1);white-space:nowrap}
.nav-tab{background:none;border:none;border-bottom:2px solid transparent;color:var(--muted2);cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;font-weight:500;padding:14px 13px;transition:all .18s;white-space:nowrap}
.nav-tab:hover{color:var(--text)}.nav-tab.on{border-bottom-color:var(--acc);color:var(--text)}
.nav-right{margin-left:auto;font-size:12px;color:var(--muted2);padding-right:16px}
.prow{display:flex;align-items:center;gap:10px;margin-bottom:20px;flex-wrap:wrap}
.pnav{display:flex;align-items:center;gap:4px;background:var(--s2);border:1px solid var(--b2);border-radius:40px;padding:5px 8px}
.pa{background:none;border:none;color:var(--muted2);cursor:pointer;font-size:20px;padding:3px 8px;border-radius:6px;line-height:1;transition:color .15s}.pa:hover{color:var(--text)}
.pl{font-size:15px;font-weight:600;min-width:90px;text-align:center}
.vtog{display:flex;gap:2px;background:var(--s2);border:1px solid var(--b2);border-radius:8px;padding:3px}
.vt{background:none;border:none;color:var(--muted2);cursor:pointer;font-size:13px;font-weight:600;padding:6px 12px;border-radius:6px;font-family:'Plus Jakarta Sans',sans-serif;transition:all .15s}.vt.on{background:var(--s3);color:var(--text)}
.sgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px}
.sc{background:var(--s1);border:1px solid var(--b1);border-radius:var(--r);padding:18px 20px;position:relative;overflow:hidden;transition:border-color .2s,transform .15s}
.sc:hover{transform:translateY(-2px);border-color:var(--b2)}
.sc::after{content:'';position:absolute;top:0;left:0;right:0;height:2px;border-radius:2px 2px 0 0}
.sc.ci::after{background:var(--green)}.sc.ce::after{background:var(--red)}.sc.cp::after{background:var(--yellow)}.sc.cb::after{background:linear-gradient(90deg,var(--acc),var(--acc2))}
.sc-l{font-size:12px;font-weight:600;color:var(--muted2);text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px}
.sc-v{font-family:'Bricolage Grotesque',sans-serif;font-size:26px;font-weight:700;line-height:1;letter-spacing:-1px}
.sc-v.g{color:var(--green)}.sc-v.r{color:var(--red)}.sc-v.y{color:var(--yellow)}
.sc-s{font-size:12px;color:var(--muted2);margin-top:5px}
.sc-i{position:absolute;right:14px;top:14px;font-size:28px;opacity:.07}
.douter{display:grid;grid-template-columns:1fr 300px;gap:16px;align-items:start;margin-bottom:16px}
.dleft{display:flex;flex-direction:column;gap:16px;min-width:0}
.prow3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px}
.panel{background:var(--s1);border:1px solid var(--b1);border-radius:var(--r);padding:18px}
.ph{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
.pt{font-family:'Bricolage Grotesque',sans-serif;font-size:15px;font-weight:700}
.ps{font-size:12px;color:var(--muted2);margin-top:2px}
input,select{background:var(--s2);border:1px solid var(--b2);border-radius:10px;color:var(--text);font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;padding:9px 13px;outline:none;transition:border-color .2s;width:100%}
input:focus,select:focus{border-color:var(--acc)}
input::placeholder{color:var(--muted)}
select option{background:var(--s2)}
.fr{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px}.fr>*{flex:1;min-width:90px}
.fl{font-size:11px;font-weight:700;color:var(--muted2);text-transform:uppercase;letter-spacing:.7px;margin-bottom:5px;display:block}
.btn{border:none;border-radius:10px;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;font-weight:600;padding:9px 18px;transition:all .2s;white-space:nowrap}
.bp{background:var(--acc);color:#fff}.bp:hover{background:#6a5ce8;transform:translateY(-1px)}
.bs{background:var(--s2);color:var(--text);border:1px solid var(--b2)}.bs:hover{border-color:var(--acc)}
.bd{background:none;border:none;cursor:pointer;color:var(--muted);font-size:14px;padding:4px 7px;border-radius:6px;transition:all .15s}.bd:hover{color:var(--red);background:rgba(248,113,113,.1)}
.be{background:none;border:none;cursor:pointer;color:var(--muted);font-size:13px;padding:4px 7px;border-radius:6px;transition:all .15s}.be:hover{color:var(--acc);background:rgba(124,109,250,.1)}
.bsm{padding:6px 13px;font-size:12px}
.tog{display:inline-flex;align-items:center;gap:7px;background:var(--s2);border:1px solid var(--b2);border-radius:10px;color:var(--muted2);cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;font-weight:500;padding:9px 15px;margin-bottom:10px;transition:all .2s}
.tog.on{background:rgba(124,109,250,.12);border-color:var(--acc);color:var(--acc)}
.cbox{background:var(--s2);border:1px solid var(--b2);border-radius:var(--r);margin-bottom:12px}
.cbox.on{border-color:rgba(124,109,250,.4)}
.cbody{padding:16px;display:flex;flex-wrap:wrap;gap:8px}
.hint{width:100%;background:rgba(124,109,250,.1);border:1px solid rgba(124,109,250,.2);border-radius:8px;color:#b0a8ff;font-size:12px;padding:9px 13px}
.hint-g{width:100%;background:rgba(109,250,188,.08);border:1px solid rgba(109,250,188,.25);border-radius:8px;color:#6dfabc;font-size:12px;padding:9px 13px}
.dtg{display:grid;grid-template-columns:1fr 1fr;gap:8px;width:100%}
.dtb{display:flex;align-items:center;gap:8px;background:var(--s2);border:1px solid var(--b2);border-radius:10px;color:var(--muted2);cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;font-weight:500;padding:10px 14px;transition:all .2s}
.dtb:hover{border-color:var(--b3);color:var(--text)}
.dtb.s-parcelamento{background:rgba(124,109,250,.15);border-color:#7c6dfa;color:#c0b8ff}
.dtb.s-financiamento{background:rgba(250,210,109,.15);border-color:#fad26d;color:#fad26d}
.dtb.s-emprestimo_pessoal{background:rgba(250,109,143,.15);border-color:#fa6d8f;color:#fa6d8f}
.dtb.s-emprestimo_consignado{background:rgba(109,250,188,.12);border-color:#6dfabc;color:#6dfabc}
.tabs{display:flex;gap:3px;background:var(--s2);border-radius:10px;padding:3px;width:fit-content;margin-bottom:14px}
.tb{background:none;border:none;border-radius:8px;color:var(--muted2);cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;font-weight:500;padding:7px 15px;transition:all .18s}
.tb.on{background:var(--s1);color:var(--text);box-shadow:0 2px 6px rgba(0,0,0,.3)}
.tw{overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:13px}
th{text-align:left;padding:9px 11px;font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.7px;border-bottom:1px solid var(--b1)}
td{padding:11px 11px;border-bottom:1px solid var(--b1);vertical-align:middle}
tr:last-child td{border-bottom:none}
tr:hover td{background:rgba(255,255,255,.012)}
.badge{display:inline-flex;align-items:center;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:600;white-space:nowrap}
.b-e{background:rgba(248,113,113,.12);color:var(--red)}
.b-i{background:rgba(74,222,128,.12);color:var(--green)}
.b-ok{background:rgba(74,222,128,.1);color:var(--green)}
.b-prog{background:rgba(109,250,188,.1);color:#6dfabc}
.bc{background:var(--s2);border:1px solid var(--b2);border-radius:20px;color:var(--muted2);font-size:12px;padding:3px 10px}
.pb{background:none;border:none;cursor:pointer;font-size:17px;padding:2px 5px;border-radius:6px;transition:background .15s}.pb:hover{background:var(--b2)}
.ae{display:inline-flex;align-items:center;gap:5px}
.ai{width:90px;padding:4px 8px;font-size:13px;border-radius:8px}
.il{display:flex;flex-direction:column;gap:10px}
.ic{background:var(--s2);border:1px solid var(--b2);border-radius:12px;padding:14px}
.ic.done{opacity:.4}
.pw{background:var(--b1);border-radius:99px;height:5px;margin-bottom:7px;overflow:hidden}
.pf{height:100%;border-radius:99px;transition:width .4s}
.ib2{display:flex;justify-content:space-between;align-items:center}
.ica{font-size:12px;color:var(--muted2)}
.inxt{font-size:12px;background:rgba(251,191,36,.1);color:var(--yellow);border-radius:5px;padding:3px 8px}
.idone{font-size:12px;background:rgba(74,222,128,.1);color:var(--green);border-radius:5px;padding:3px 8px}
.i-act{display:flex;gap:2px;opacity:0;transition:opacity .15s}.ic:hover .i-act{opacity:1}
.df{display:flex;gap:5px;margin-bottom:12px;flex-wrap:wrap}
.dfb{display:flex;align-items:center;gap:5px;background:var(--s2);border:1px solid var(--b2);border-radius:8px;color:var(--muted2);cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;font-size:12px;padding:5px 11px;transition:all .18s}
.dfb.active{background:var(--s3);color:var(--text);border-color:var(--b3)}
.dfb.a-parcelamento{background:rgba(124,109,250,.15);border-color:#7c6dfa;color:#c0b8ff}
.dfb.a-financiamento{background:rgba(250,210,109,.15);border-color:#fad26d;color:#fad26d}
.dfb.a-emprestimo_pessoal{background:rgba(250,109,143,.15);border-color:#fa6d8f;color:#fa6d8f}
.dfb.a-emprestimo_consignado{background:rgba(109,250,188,.12);border-color:#6dfabc;color:#6dfabc}
.chips{display:flex;gap:10px;margin-bottom:14px}
.chip{background:var(--s2);border:1px solid var(--b2);border-radius:10px;padding:10px 14px;flex:1}
.chip-l{font-size:11px;font-weight:700;color:var(--muted2);text-transform:uppercase;letter-spacing:.7px;margin-bottom:4px}
.chip-v{font-family:'Bricolage Grotesque',sans-serif;font-size:18px;font-weight:700}
.rl{display:flex;flex-direction:column;gap:7px}
.ri{display:flex;align-items:center;justify-content:space-between;background:var(--s2);border:1px solid var(--b2);border-radius:10px;padding:12px 14px;transition:border-color .2s}
.ri.inactive{opacity:.4}
.ri-l{display:flex;align-items:center;gap:11px;min-width:0;flex:1}
.ri-ico{width:36px;height:36px;border-radius:10px;background:rgba(124,109,250,.12);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
.ri-ico.var{background:rgba(74,222,128,.1)}
.ri-name{font-size:14px;font-weight:600;white-space:normal;word-break:break-word;line-height:1.3}
.ri-day{font-size:12px;color:var(--muted2);margin-top:2px}
.ri-r{display:flex;align-items:center;gap:10px;flex-shrink:0;margin-left:8px}
.ri-act{display:flex;gap:2px;opacity:0;transition:opacity .15s}.ri:hover .ri-act{opacity:1}
.rdl{display:flex;flex-direction:column;gap:6px;max-height:600px;overflow-y:auto;padding-right:2px}
.rdi{display:flex;align-items:center;justify-content:space-between;background:var(--s2);border:1px solid var(--b2);border-radius:9px;padding:10px 12px;transition:border-color .2s}
.rdi.paid{border-color:rgba(74,222,128,.3);background:rgba(74,222,128,.04)}
.rdi.overdue{border-color:rgba(248,113,113,.4);background:rgba(248,113,113,.04)}
.rdi.soon{border-color:rgba(251,191,36,.4);background:rgba(251,191,36,.04)}
.rdi-l{display:flex;align-items:center;gap:9px;flex:1;min-width:0}
.rdi-n{font-size:13px;font-weight:600;white-space:normal;word-break:break-word;line-height:1.3}
.rdi-s{font-size:12px;color:var(--muted2);margin-top:1px}
.rdi-r{display:flex;align-items:center;gap:7px;flex-shrink:0;margin-left:8px}
.acc-i{background:var(--s2);border:1px solid var(--b2);border-radius:10px;padding:11px 13px;margin-bottom:6px}
.mbg{position:fixed;inset:0;background:rgba(0,0,0,.8);display:flex;align-items:center;justify-content:center;z-index:100;padding:20px}
.modal{background:var(--s1);border:1px solid var(--b2);border-radius:var(--r);padding:26px;width:100%;max-width:500px;max-height:90vh;overflow-y:auto}
.mt{font-family:'Bricolage Grotesque',sans-serif;font-size:18px;font-weight:700;margin-bottom:18px}
.mf{display:flex;gap:10px;justify-content:flex-end;margin-top:18px}
.ig{display:flex;flex-wrap:wrap;gap:6px;margin-top:5px}
.io{background:var(--s2);border:1px solid var(--b2);border-radius:10px;cursor:pointer;font-size:22px;padding:8px 10px;transition:all .15s;line-height:1}
.io:hover{border-color:var(--acc);transform:scale(1.1)}.io.sel{border-color:var(--acc);background:rgba(124,109,250,.15);transform:scale(1.1)}
.mi{display:flex;align-items:center;justify-content:space-between;padding:10px 13px;background:var(--s2);border:1px solid var(--b2);border-radius:10px;margin-bottom:7px}
.mi-i{background:rgba(74,222,128,.12);color:var(--green);padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600}
.mi-e{background:rgba(248,113,113,.12);color:var(--red);padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600}
.g2b{display:grid;grid-template-columns:1fr 1fr;gap:16px}
/* calculadora */
.calc-fab{position:fixed;bottom:28px;right:28px;z-index:50;background:var(--acc);border:none;border-radius:50%;width:52px;height:52px;font-size:22px;cursor:pointer;box-shadow:0 4px 20px rgba(124,109,250,.5);transition:all .2s;display:flex;align-items:center;justify-content:center}
.calc-fab:hover{transform:scale(1.1);box-shadow:0 6px 28px rgba(124,109,250,.7)}
.calc-win{position:fixed;bottom:92px;right:28px;z-index:50;background:var(--s1);border:1px solid var(--b2);border-radius:16px;padding:16px;width:240px;box-shadow:0 8px 40px rgba(0,0,0,.6)}
.calc-display{background:var(--s2);border-radius:10px;padding:12px 14px;margin-bottom:12px;text-align:right}
.calc-expr{font-size:11px;color:var(--muted2);min-height:16px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.calc-val{font-family:'Bricolage Grotesque',sans-serif;font-size:26px;font-weight:700;line-height:1.1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.calc-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
.ck{background:var(--s2);border:1px solid var(--b2);border-radius:8px;color:var(--text);cursor:pointer;font-family:'Bricolage Grotesque',sans-serif;font-size:15px;font-weight:700;padding:10px 4px;transition:all .15s;text-align:center}
.ck:hover{background:var(--s3);border-color:var(--b3)}
.ck.op{color:var(--acc)}.ck.eq{background:var(--acc);color:#fff;border-color:var(--acc)}.ck.eq:hover{background:#6a5ce8}.ck.cl{color:var(--red)}
/* fine alert */
.fine-box{background:rgba(248,113,113,.08);border:1px solid rgba(248,113,113,.3);border-radius:10px;padding:14px 16px;margin-bottom:14px}
.fine-title{font-size:13px;font-weight:600;color:var(--red);margin-bottom:10px}
/* real balance */
.rb-box{background:rgba(124,109,250,.08);border:1px solid rgba(124,109,250,.2);border-radius:10px;padding:12px 14px;margin-top:10px}
@media(max-width:1100px){.douter{grid-template-columns:1fr}.prow3{grid-template-columns:1fr 1fr}}
@media(max-width:1024px){.sgrid{grid-template-columns:1fr 1fr}.g2b{grid-template-columns:1fr}.prow3{grid-template-columns:1fr}}
@media(max-width:560px){.sgrid{grid-template-columns:1fr}}
`

interface Rec { id:number;name:string;amount:number;due_day:number;icon:string;active:boolean;category_id?:number;is_variable:boolean }
interface RecMonth extends Rec { paid:boolean;paid_amount?:number;status:string;due_date:string }
interface Inst { id:number;description:string;debt_type:string;total_amount:number;total_installments:number;paid_installments:number;pending_installments:number;value_per_installment:number;total_paid:number;total_remaining:number;next_due_date?:string;progress_percent:number;category_id?:number;account_id?:number }

// ─── CALCULADORA ──────────────────────────────────────────────────────────────
function Calculator() {
  const [open,setOpen]=useState(false); const [display,setDisplay]=useState("0"); const [expr,setExpr]=useState(""); const [wait,setWait]=useState(false)
  function press(k: string) {
    if(k==="C"){setDisplay("0");setExpr("");setWait(false);return}
    if(k==="⌫"){if(wait){setDisplay("0");setWait(false);return};setDisplay(d=>d.length>1?d.slice(0,-1):"0");return}
    if(k==="="){try{const full=expr+display;const res=Function('"use strict";return ('+full.replace(/×/g,"*").replace(/÷/g,"/")+')')();const r=parseFloat(res.toFixed(10));setExpr(full+"=");setDisplay(String(r));setWait(true)}catch{setDisplay("Erro");setWait(true)};return}
    if(["+","-","×","÷"].includes(k)){setExpr(wait?display+k:expr+display+k);setWait(false);setDisplay("0");return}
    if(k==="%"&&display!=="0"){setDisplay(d=>String(parseFloat(d)/100));return}
    if(k==="+/-"){setDisplay(d=>d.startsWith("-")?d.slice(1):"-"+d);return}
    if(k==="."&&display.includes("."))return
    if(wait){setDisplay(k==="."?"0.":k);setWait(false);return}
    setDisplay(d=>d==="0"&&k!=="."?k:d+k)
  }
  const keys=[["C","⌫","%","÷"],["7","8","9","×"],["4","5","6","-"],["1","2","3","+"],["+/-","0",".","="]]
  return (
    <>
      <button className="calc-fab" onClick={()=>setOpen(o=>!o)} title="Calculadora">🧮</button>
      {open&&<div className="calc-win"><div className="calc-display"><div className="calc-expr">{expr||" "}</div><div className="calc-val">{display}</div></div><div className="calc-grid">{keys.flat().map((k,i)=><button key={i} className={`ck ${["÷","×","-","+"].includes(k)?"op":""} ${k==="="?"eq":""} ${["C","⌫"].includes(k)?"cl":""}`} onClick={()=>press(k)}>{k}</button>)}</div></div>}
    </>
  )
}

// ─── MODAL: MULTA AO PAGAR ────────────────────────────────────────────────────
function PayWithFineModal({ title, defaultAmount, accounts, isOverdue, onPay, onClose }: {
  title:string; defaultAmount:number; accounts:any[]; isOverdue:boolean;
  onPay:(amount:number,accId:number,fine:number)=>void; onClose:()=>void
}) {
  const [amt,setAmt]=useState(String(defaultAmount))
  const [accId,setAccId]=useState(accounts[0]?.id?String(accounts[0].id):"")
  const [hasFine,setHasFine]=useState(isOverdue)
  const [fine,setFine]=useState("")
  const total = Number(amt) + (hasFine&&fine?Number(fine):0)
  return (
    <div className="mbg" onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div className="modal">
        <div className="mt">{title}</div>
        {/* item 4: bloco de multa */}
        {isOverdue&&(
          <div className="fine-box">
            <div className="fine-title">⚠️ Conta vencida — houve multa/juros?</div>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:hasFine?10:0}}>
              <input type="checkbox" id="fine-chk" checked={hasFine} onChange={e=>setHasFine(e.target.checked)} style={{width:"auto",cursor:"pointer"}}/>
              <label htmlFor="fine-chk" style={{fontSize:13,cursor:"pointer"}}>Sim, paguei multa/juros</label>
              {hasFine&&<button className="btn bs bsm" style={{marginLeft:"auto",fontSize:11}} onClick={()=>{setHasFine(false);setFine("")}}>Sem multa</button>}
            </div>
            {hasFine&&(
              <div>
                <span className="fl">Valor da multa/juros (R$)</span>
                <input type="number" placeholder="Ex: 15,00" value={fine} onChange={e=>setFine(e.target.value)}/>
                {fine&&<div style={{fontSize:11,color:"var(--muted2)",marginTop:4}}>Valor original: {fmt(Number(amt))} + multa: {fmt(Number(fine))} = <strong style={{color:"var(--red)"}}>{fmt(total)}</strong></div>}
              </div>
            )}
          </div>
        )}
        <div style={{marginBottom:12}}><span className="fl">Valor pago {isOverdue?"(sem multa)":""}</span><input type="number" value={amt} onChange={e=>setAmt(e.target.value)}/></div>
        <div style={{marginBottom:16}}><span className="fl">Conta debitada</span><select value={accId} onChange={e=>setAccId(e.target.value)}><option value="">Selecione</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
        {hasFine&&fine&&<div style={{background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.2)",borderRadius:8,padding:"8px 12px",marginBottom:12,fontSize:13}}>Total debitado: <strong style={{color:"var(--red)"}}>{fmt(total)}</strong></div>}
        <div className="mf">
          <button className="btn bs" onClick={onClose}>Cancelar</button>
          <button className="btn bp" onClick={()=>{if(!accId)return alert("Selecione a conta");onPay(Number(amt),Number(accId),hasFine&&fine?Number(fine):0)}}>✅ Confirmar</button>
        </div>
      </div>
    </div>
  )
}

// ─── MODAL: CONTA FIXA ────────────────────────────────────────────────────────
function RecModal({ item, cats, onSave, onClose }: { item?:Rec|null;cats:any[];onSave:(d:any)=>void;onClose:()=>void }) {
  const [name,setName]=useState(item?.name??""); const [amt,setAmt]=useState(item?String(item.amount):"")
  const [day,setDay]=useState(item?.due_day?String(item.due_day):"")
  const [icon,setIcon]=useState(item?.icon??"📄"); const [catId,setCatId]=useState(item?.category_id?String(item.category_id):"")
  const [active,setActive]=useState(item?.active??true)
  // ✅ item 6: fix — só true se explicitamente true
  const [isVar,setIsVar]=useState(item?.is_variable===true)
  function save(e:any){
    e.preventDefault()
    if(!name||!amt)return alert("Preencha nome e valor")
    if(!day)return alert("Informe o dia de vencimento")  // ✅ item 1: sempre obrigatório
    onSave({name,amount:Number(amt),due_day:Number(day),icon,category_id:catId?Number(catId):null,active,is_variable:isVar})
  }
  return (
    <div className="mbg" onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div className="modal">
        <div className="mt">{item?"Editar conta fixa":"Nova conta fixa"}</div>
        <form onSubmit={save}>
          {/* ✅ item 2: ícones maiores e mais visíveis */}
          <div style={{marginBottom:14}}><span className="fl">Ícone</span><div className="ig">{ICONS.map(ic=><button key={ic} type="button" className={`io ${icon===ic?"sel":""}`} onClick={()=>setIcon(ic)}>{ic}</button>)}</div></div>
          <div className="fr" style={{marginBottom:12}}>
            <div style={{flex:2,minWidth:150}}><span className="fl">Nome</span><input placeholder="Ex: Luz, Netflix" value={name} onChange={e=>setName(e.target.value)}/></div>
            <div style={{flex:1,minWidth:90}}><span className="fl">Valor</span><input type="number" value={amt} onChange={e=>setAmt(e.target.value)}/></div>
          </div>
          {/* ✅ item 1: dia sempre obrigatório, variável só muda o VALOR */}
          <div className="fr" style={{marginBottom:12}}>
            <div><span className="fl">Dia de vencimento (obrigatório)</span><input type="number" min="1" max="31" placeholder="Ex: 10" value={day} onChange={e=>setDay(e.target.value)}/></div>
            <div><span className="fl">Categoria</span><select value={catId} onChange={e=>setCatId(e.target.value)}><option value="">Sem categoria</option>{cats.filter(c=>c.type==="expense").map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          </div>
          <div style={{background:"var(--s2)",border:"1px solid var(--b2)",borderRadius:10,padding:"12px 14px",marginBottom:12}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
              <input type="checkbox" id="vc" checked={isVar} onChange={e=>setIsVar(e.target.checked)} style={{width:"auto",cursor:"pointer"}}/>
              <label htmlFor="vc" style={{fontSize:13,cursor:"pointer",fontWeight:500}}>Valor variável (o valor muda todo mês)</label>
            </div>
            <div style={{fontSize:12,color:"var(--muted2)"}}>{isVar?"O vencimento é fixo, mas você informa o valor exato no dashboard ao pagar.":"Valor e vencimento fixos todo mês."}</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}><input type="checkbox" id="ac" checked={active} onChange={e=>setActive(e.target.checked)} style={{width:"auto",cursor:"pointer"}}/><label htmlFor="ac" style={{fontSize:13,color:"var(--muted2)",cursor:"pointer"}}>Conta ativa</label></div>
          <div className="mf"><button type="button" className="btn bs" onClick={onClose}>Cancelar</button><button type="submit" className="btn bp">Salvar</button></div>
        </form>
      </div>
    </div>
  )
}

// ─── MODAL: EDITAR DÍVIDA ──────────────────────────────────────────────────────
function EditInstModal({ item, cats, accs, onSave, onClose }: { item:Inst;cats:any[];accs:any[];onSave:(d:any)=>void;onClose:()=>void }) {
  const [desc,setDesc]=useState(item.description); const [dt,setDt]=useState(item.debt_type)
  const [total,setTotal]=useState(String(item.total_amount))
  const [catId,setCatId]=useState(item.category_id?String(item.category_id):"")
  const [accId,setAccId]=useState(item.account_id?String(item.account_id):"")
  return (
    <div className="mbg" onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div className="modal">
        <div className="mt">Editar dívida</div>
        <form onSubmit={e=>{e.preventDefault();onSave({description:desc,debt_type:dt,total_amount:Number(total),category_id:catId?Number(catId):null,account_id:accId?Number(accId):null})}}>
          <div style={{marginBottom:12}}><span className="fl">Descrição</span><input value={desc} onChange={e=>setDesc(e.target.value)}/></div>
          <div style={{marginBottom:12}}><span className="fl">Tipo</span>
            <div className="dtg" style={{marginTop:8}}>{Object.entries(DEBT).map(([k,c])=><button key={k} type="button" className={`dtb ${dt===k?`s-${k}`:""}`} onClick={()=>setDt(k)}><span style={{fontSize:18}}>{c.icon}</span><div><div style={{fontSize:13,fontWeight:600}}>{c.label}</div>{c.sub&&<div style={{fontSize:11,opacity:.7}}>{c.sub}</div>}</div></button>)}</div>
          </div>
          <div style={{marginBottom:12}}><span className="fl">Valor total</span><input type="number" value={total} onChange={e=>setTotal(e.target.value)}/></div>
          {/* ✅ item 8: categoria e conta editáveis */}
          <div className="fr" style={{marginBottom:12}}>
            <div><span className="fl">Categoria</span><select value={catId} onChange={e=>setCatId(e.target.value)}><option value="">Sem categoria</option>{cats.filter(c=>c.type==="expense").map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div><span className="fl">Conta</span><select value={accId} onChange={e=>setAccId(e.target.value)}><option value="">Selecione</option>{accs.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
          </div>
          <div className="mf"><button type="button" className="btn bs" onClick={onClose}>Cancelar</button><button type="submit" className="btn bp">Salvar</button></div>
        </form>
      </div>
    </div>
  )
}

// ─── MODAL: SALDO REAL ────────────────────────────────────────────────────────
function RealBalanceModal({ inst, onClose }: { inst:Inst; onClose:()=>void }) {
  const [rate,setRate]=useState(""); const [result,setResult]=useState<any>(null); const [loading,setLoading]=useState(false)
  async function calc(){
    if(!rate)return alert("Informe a taxa mensal")
    setLoading(true)
    try{ const r=await getInstallmentRealBalance(inst.id,Number(rate)); setResult(r) }
    finally{ setLoading(false) }
  }
  return (
    <div className="mbg" onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div className="modal">
        <div className="mt">💰 Saldo devedor real</div>
        <div style={{marginBottom:14,fontSize:13,color:"var(--muted2)",lineHeight:1.6}}>O saldo real é quanto você precisaria pagar <strong style={{color:"var(--text)"}}>hoje</strong> para quitar a dívida, descontando os juros futuros. Diferente da soma total das parcelas.</div>
        <div style={{marginBottom:14}}>
          <span className="fl">Taxa de juros mensal (%)</span>
          <div style={{display:"flex",gap:8}}><input type="number" step="0.01" placeholder="Ex: 1.5" value={rate} onChange={e=>setRate(e.target.value)}/><button className="btn bp bsm" onClick={calc} disabled={loading}>{loading?"...":"Calcular"}</button></div>
        </div>
        {result&&(
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {/* ✅ item 11: saldo real em destaque, total menor */}
            <div style={{background:"rgba(124,109,250,.1)",border:"1px solid rgba(124,109,250,.25)",borderRadius:10,padding:"16px 18px",textAlign:"center"}}>
              <div style={{fontSize:12,fontWeight:700,color:"var(--muted2)",textTransform:"uppercase",letterSpacing:".7px",marginBottom:6}}>Saldo real (valor à vista)</div>
              <div style={{fontFamily:"'Bricolage Grotesque',sans-serif",fontSize:32,fontWeight:800,color:"var(--acc)"}}>{fmt(result.real_balance)}</div>
              <div style={{fontSize:12,color:"var(--muted2)",marginTop:4}}>se quitar hoje com {rate}%/mês de juros</div>
            </div>
            <div style={{display:"flex",gap:10}}>
              <div style={{background:"var(--s2)",border:"1px solid var(--b2)",borderRadius:10,padding:"10px 14px",flex:1}}>
                <div style={{fontSize:11,color:"var(--muted2)",marginBottom:3}}>Soma das parcelas</div>
                <div style={{fontFamily:"'Bricolage Grotesque',sans-serif",fontSize:16,fontWeight:700,color:"var(--muted2)",textDecoration:"line-through"}}>{fmt(result.total_balance)}</div>
              </div>
              <div style={{background:"rgba(74,222,128,.08)",border:"1px solid rgba(74,222,128,.2)",borderRadius:10,padding:"10px 14px",flex:1}}>
                <div style={{fontSize:11,color:"var(--muted2)",marginBottom:3}}>Desconto de juros</div>
                <div style={{fontFamily:"'Bricolage Grotesque',sans-serif",fontSize:16,fontWeight:700,color:"var(--green)"}}>-{fmt(result.discount)} ({result.discount_pct}%)</div>
              </div>
            </div>
          </div>
        )}
        <div className="mf"><button className="btn bs" onClick={onClose}>Fechar</button></div>
      </div>
    </div>
  )
}

function ManageModal({ title, items, kind, onCreate, onUpdate, onDelete, onClose }: { title:string;items:any[];kind:"category"|"account";onCreate:(d:any)=>void;onUpdate:(id:number,d:any)=>void;onDelete:(id:number)=>void;onClose:()=>void }) {
  const [nn,setNn]=useState(""); const [nt,setNt]=useState("expense")
  const [ei,setEi]=useState<number|null>(null); const [en,setEn]=useState(""); const [et,setEt]=useState("expense")
  return (
    <div className="mbg" onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div className="modal">
        <div className="mt">{title}</div>
        <div style={{background:"var(--s2)",border:"1px solid var(--b2)",borderRadius:10,padding:12,marginBottom:12}}>
          <div className="fr" style={{marginBottom:8}}><input placeholder="Nome" value={nn} onChange={e=>setNn(e.target.value)}/>{kind==="category"&&<select value={nt} onChange={e=>setNt(e.target.value)} style={{maxWidth:130}}><option value="expense">Despesa</option><option value="income">Receita</option></select>}</div>
          <button className="btn bp bsm" onClick={()=>{if(!nn.trim())return;onCreate(kind==="category"?{name:nn,type:nt}:{name:nn});setNn("");setNt("expense")}}>+ Adicionar</button>
        </div>
        <div style={{maxHeight:320,overflowY:"auto"}}>
          {items.map(it=>(
            <div key={it.id} className="mi">
              {ei===it.id?<div style={{display:"flex",gap:6,flex:1,marginRight:6}}><input value={en} onChange={e=>setEn(e.target.value)} style={{flex:2}}/>{kind==="category"&&<select value={et} onChange={e=>setEt(e.target.value)} style={{flex:1,maxWidth:120}}><option value="expense">Despesa</option><option value="income">Receita</option></select>}<button className="btn bp bsm" onClick={()=>{onUpdate(it.id,kind==="category"?{name:en,type:et}:{name:en});setEi(null)}}>✓</button><button className="btn bs bsm" onClick={()=>setEi(null)}>✕</button></div>
              :<><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontWeight:500,fontSize:14}}>{it.name}</span>{kind==="category"&&<span className={it.type==="income"?"mi-i":"mi-e"}>{it.type==="income"?"receita":"despesa"}</span>}</div><div style={{display:"flex",gap:2}}><button className="be" onClick={()=>{setEi(it.id);setEn(it.name);setEt(it.type||"expense")}}>✏️</button><button className="bd" onClick={()=>{if(confirm(`Remover "${it.name}"?`))onDelete(it.id)}}>🗑</button></div></>}
            </div>
          ))}
        </div>
        <div className="mf"><button className="btn bs" onClick={onClose}>Fechar</button></div>
      </div>
    </div>
  )
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const now = new Date()
  const [page,setPage]=useState<"dashboard"|"debts"|"fixed"|"settings">("dashboard")
  const [vm,setVm]=useState<"month"|"year">("month"); const [year,setYear]=useState(now.getFullYear()); const [month,setMonth]=useState(now.getMonth()+1)
  const [expenses,setExpenses]=useState<any[]>([]); const [income,setIncome]=useState<any[]>([])
  const [summary,setSummary]=useState<any>(null); const [cats,setCats]=useState<any[]>([])
  const [accs,setAccs]=useState<any[]>([]); const [catSum,setCatSum]=useState<any[]>([])
  const [monthly,setMonthly]=useState<any[]>([]); const [accSum,setAccSum]=useState<any[]>([])
  const [insts,setInsts]=useState<Inst[]>([]); const [recItems,setRecItems]=useState<Rec[]>([])
  const [recMonth,setRecMonth]=useState<RecMonth[]>([])
  const [desc,setDesc]=useState(""); const [amt,setAmt]=useState(""); const [txType,setTxType]=useState("expense")
  const [catId,setCatId]=useState(""); const [accId,setAccId]=useState(""); const [txDate,setTxDate]=useState(now.toISOString().slice(0,10))
  const [tab,setTab]=useState<"expense"|"income">("expense")
  const [eAmtId,setEAmtId]=useState<number|null>(null); const [eAmtV,setEAmtV]=useState("")
  const [showDebt,setShowDebt]=useState(false); const [dtype,setDtype]=useState("parcelamento")
  const [manualM,setManualM]=useState(false)
  const [inst,setInst]=useState({description:"",total_amount:"",total_installments:"",monthly_amount:"",start_date:now.toISOString().slice(0,10)})
  const [iCat,setICat]=useState(""); const [iAcc,setIAcc]=useState(""); const [saving,setSaving]=useState(false)
  const [dfilter,setDfilter]=useState("todos")
  const [editRec,setEditRec]=useState<Rec|null>(null); const [showRecModal,setShowRecModal]=useState(false)
  const [editInst,setEditInst]=useState<Inst|null>(null)
  const [showCatModal,setShowCatModal]=useState(false); const [showAccModal,setShowAccModal]=useState(false)
  const [amortInst,setAmortInst]=useState<Inst|null>(null)
  const [payingRec,setPayingRec]=useState<RecMonth|null>(null)    // item 4
  const [realBalInst,setRealBalInst]=useState<Inst|null>(null)    // item 11

  const f = vm==="month"?{year,month}:{year}
  useEffect(()=>{ load() },[year,month,vm])

  async function load() {
    const [exp,inc,s,c,cs,ms,a,is_,rec,rm,as_] = await Promise.all([
      getTransactions("expense",f), getTransactions("income",f), getSummary(f),
      getCategories(), getCategorySummary(f),
      getMonthlySummary(year,vm==="month"?month:undefined),
      getAccounts(), getInstallmentsSummary(), getRecurring(),
      getRecurringForMonth(year,vm==="month"?month:now.getMonth()+1),
      getAccountSummary(f)
    ])
    setExpenses(enrichExp(exp,rec)); setIncome(inc); setSummary(s)
    setCats(c); setCatSum(cs); setMonthly(ms)
    setAccs(a); setInsts(is_); setRecItems(rec); setRecMonth(rm); setAccSum(as_)
  }

  function prev(){if(vm==="month"){if(month===1){setMonth(12);setYear(y=>y-1)}else setMonth(m=>m-1)}else setYear(y=>y-1)}
  function next(){if(vm==="month"){if(month===12){setMonth(1);setYear(y=>y+1)}else setMonth(m=>m+1)}else setYear(y=>y+1)}
  const pl=vm==="month"?`${MONTHS[month-1]} ${year}`:`${year}`

  async function addTx(e:any){
    e.preventDefault(); if(!desc||!amt||!catId||!accId)return alert("Preencha todos os campos")
    await createTransaction({description:desc,amount:parseFloat(amt),type:txType,category_id:Number(catId),account_id:Number(accId),date:txDate})
    setDesc("");setAmt("");setTxType("expense");setCatId("");setAccId(""); load()
  }

  async function addDebt(e:any){
    e.preventDefault(); if(saving)return; if(!inst.description||!inst.total_amount||!inst.total_installments||!iCat||!iAcc)return alert("Preencha todos os campos")
    setSaving(true)
    try{
      const tot=Number(inst.total_amount), n=Number(inst.total_installments)
      const m=manualM&&inst.monthly_amount?Number(inst.monthly_amount):tot/n
      const rows=Array.from({length:n},(_,i)=>{ const d=new Date(inst.start_date);d.setMonth(d.getMonth()+i);return {amount:m,date:d.toISOString().slice(0,10)} })
      // ✅ item 3: passa total_amount_override para manter o total informado
      await createInstallmentCustom({description:inst.description,debt_type:dtype,category_id:Number(iCat),account_id:Number(iAcc),installments:rows,total_amount_override:tot})
      setInst({description:"",total_amount:"",total_installments:"",monthly_amount:"",start_date:now.toISOString().slice(0,10)})
      setICat("");setIAcc("");setShowDebt(false);setManualM(false); load()
    }finally{setSaving(false)}
  }

  const fInsts=dfilter==="todos"?insts:insts.filter(i=>i.debt_type===dfilter)
  const totalDebt=fInsts.reduce((a,i)=>a+i.total_remaining,0)
  const totalM=fInsts.filter(i=>i.pending_installments>0).reduce((a,i)=>a+i.value_per_installment,0)
  const activeInsts=fInsts.filter(i=>i.pending_installments>0)
  const doneInsts=fInsts.filter(i=>i.pending_installments===0)
  const cn=(id:number)=>cats.find(c=>c.id===id)?.name??"-"
  const an=(id:number)=>accs.find(a=>a.id===id)?.name??"-"
  const recTotal=recItems.filter(r=>r.active).reduce((a,r)=>a+r.amount,0)
  const todayStr=now.toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})

  // ✅ item 4: stats de multas no mês
  const overdueCount=recMonth.filter(r=>r.status==="overdue"&&!r.paid).length

  const typePie=(()=>{
    const c:Record<string,number>={}; for(const t of expenses){const k=txKind(t).label;c[k]=(c[k]||0)+t.amount}
    return Object.entries(c).map(([name,value])=>({name,value}))
  })()

  const instPrev=(()=>{
    const tot=Number(inst.total_amount),n=Number(inst.total_installments); if(!tot||!n)return null
    const auto=tot/n; const manual=manualM&&inst.monthly_amount?Number(inst.monthly_amount):null
    return {auto,manual,diff:manual?manual-auto:null}
  })()

  const Nav=()=>(
    <div className="prow">
      <div className="pnav"><button className="pa" onClick={prev}>‹</button><span className="pl">{pl}</span><button className="pa" onClick={next}>›</button></div>
      <div className="vtog"><button className={`vt ${vm==="month"?"on":""}`} onClick={()=>setVm("month")}>Mensal</button><button className={`vt ${vm==="year"?"on":""}`} onClick={()=>setVm("year")}>Anual</button></div>
      {vm==="year"&&MONTHS.map((m,i)=><button key={i} style={{background:"var(--s2)",border:"1px solid var(--b2)",borderRadius:7,color:"var(--muted2)",cursor:"pointer",fontSize:12,fontFamily:"'Plus Jakarta Sans',sans-serif",padding:"5px 9px"}} onClick={()=>{setVm("month");setMonth(i+1)}}>{m}</button>)}
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
          <div className="nav-right">{todayStr}</div>
        </div>

        {/* ══ DASHBOARD ══ */}
        {page==="dashboard"&&<>
          <Nav/>
          {summary&&(
            <div className="sgrid">
              <div className="sc ci"><div className="sc-l">Receitas</div><div className="sc-v g">{fmt(summary.total_income)}</div><div className="sc-s">{pl}</div><div className="sc-i">↑</div></div>
              <div className="sc ce"><div className="sc-l">Despesas pagas</div><div className="sc-v r">{fmt(summary.total_expense)}</div><div className="sc-s">efetivadas</div><div className="sc-i">↓</div></div>
              <div className="sc cp"><div className="sc-l">Falta pagar</div><div className="sc-v y">{fmt(summary.total_pending)}</div><div className="sc-s">pendentes</div><div className="sc-i">⏳</div></div>
              <div className="sc cb"><div className="sc-l">Saldo real</div><div className={`sc-v ${summary.balance>=0?"g":"r"}`}>{fmt(summary.balance)}</div><div className="sc-s">{summary.balance>=0?"positivo 👍":"negativo ⚠️"}</div><div className="sc-i">◎</div></div>
            </div>
          )}
          {/* ✅ item 4: alerta de contas vencidas */}
          {overdueCount>0&&<div style={{background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.3)",borderRadius:10,padding:"10px 16px",marginBottom:14,fontSize:13,display:"flex",alignItems:"center",gap:10}}>
            <span>⚠️</span><span><strong style={{color:"var(--red)"}}>{overdueCount} conta{overdueCount>1?"s":""} vencida{overdueCount>1?"s":""}</strong> neste mês — ao pagar, verifique se houve multa/juros.</span>
          </div>}
          <div className="douter">
            <div className="dleft">
              <div className="panel">
                <div className="ph"><div className="pt">Nova transação</div></div>
                <form onSubmit={addTx}>
                  <div className="fr"><input style={{flex:2,minWidth:130}} placeholder="Descrição" value={desc} onChange={e=>setDesc(e.target.value)}/><input style={{flex:1,minWidth:80}} type="number" placeholder="Valor" value={amt} onChange={e=>setAmt(e.target.value)}/></div>
                  <div className="fr"><input type="date" value={txDate} onChange={e=>setTxDate(e.target.value)}/><select value={txType} onChange={e=>{setTxType(e.target.value);setCatId("")}}><option value="expense">Despesa</option><option value="income">Receita</option></select><select value={catId} onChange={e=>setCatId(e.target.value)}><option value="">Categoria</option>{cats.filter(c=>c.type===txType).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><select value={accId} onChange={e=>setAccId(e.target.value)}><option value="">Conta</option>{accs.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select><button type="submit" className="btn bp">+ Adicionar</button></div>
                </form>
              </div>
              <div className="panel">
                <div className="ph"><div><div className="pt">Evolução</div><div className="ps">{vm==="year"?`Todos os meses de ${year}`:pl}</div></div></div>
                {monthly.length>0?<ResponsiveContainer width="100%" height={220}><AreaChart data={monthly}><defs><linearGradient id="gi" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4ade80" stopOpacity={.25}/><stop offset="95%" stopColor="#4ade80" stopOpacity={0}/></linearGradient><linearGradient id="ge" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f87171" stopOpacity={.25}/><stop offset="95%" stopColor="#f87171" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#ffffff07"/><XAxis dataKey="month" tick={{fill:"#8888a8",fontSize:12}} axisLine={false} tickLine={false} tickFormatter={v=>{const[,m]=v.split("-");return MONTHS[parseInt(m)-1]??v}}/><YAxis tick={{fill:"#8888a8",fontSize:12}} axisLine={false} tickLine={false} tickFormatter={v=>`R$${(v/1000).toFixed(0)}k`}/><Tooltip formatter={(v:any)=>fmt(v)} contentStyle={{background:"#0f0f1a",border:"1px solid #ffffff15",borderRadius:10,fontSize:13}}/><Legend iconType="circle" iconSize={8} wrapperStyle={{fontSize:13}}/><Area type="monotone" dataKey="income" name="Receita" stroke="#4ade80" fill="url(#gi)" strokeWidth={2} dot={false}/><Area type="monotone" dataKey="expense" name="Despesa" stroke="#f87171" fill="url(#ge)" strokeWidth={2} dot={false}/></AreaChart></ResponsiveContainer>:<div style={{color:"var(--muted2)",fontSize:13,textAlign:"center",padding:32}}>Sem dados para o período.</div>}
              </div>
              {(catSum.length>0||typePie.length>0||accSum.length>0)&&(
                <div className="prow3">
                  <div className="panel"><div className="ph"><div><div className="pt">Por categoria</div><div className="ps">{pl}</div></div></div>{catSum.length>0?<PieChart width={220} height={200}><Pie data={catSum} dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={72} innerRadius={30}>{catSum.map((_,i)=><Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}</Pie><Tooltip formatter={(v:any)=>fmt(v)} contentStyle={{background:"#0f0f1a",border:"1px solid #ffffff15",borderRadius:10,fontSize:12}}/><Legend iconType="circle" iconSize={7} wrapperStyle={{fontSize:11}}/></PieChart>:<div style={{color:"var(--muted2)",fontSize:12,textAlign:"center",paddingTop:24}}>Sem dados.</div>}</div>
                  <div className="panel"><div className="ph"><div><div className="pt">Por tipo</div><div className="ps">despesas</div></div></div>{typePie.length>0?<PieChart width={220} height={200}><Pie data={typePie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={72} innerRadius={30}>{typePie.map((_,i)=><Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}</Pie><Tooltip formatter={(v:any)=>fmt(v)} contentStyle={{background:"#0f0f1a",border:"1px solid #ffffff15",borderRadius:10,fontSize:12}}/><Legend iconType="circle" iconSize={7} wrapperStyle={{fontSize:11}}/></PieChart>:<div style={{color:"var(--muted2)",fontSize:12,textAlign:"center",paddingTop:24}}>Sem dados.</div>}</div>
                  <div className="panel"><div className="ph"><div><div className="pt">Por conta</div><div className="ps">{pl}</div></div></div>{accSum.length>0?accSum.map((a:any)=><div key={a.name} className="acc-i"><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}><span style={{fontWeight:600,fontSize:13}}>{a.name}</span><span style={{fontFamily:"'Bricolage Grotesque',sans-serif",fontSize:14,fontWeight:700,color:a.balance>=0?"var(--green)":"var(--red)"}}>{fmt(a.balance)}</span></div><div style={{display:"flex",gap:12}}><span style={{fontSize:12,color:"var(--muted2)"}}>↑ {fmt(a.income)}</span><span style={{fontSize:12,color:"var(--muted2)"}}>↓ {fmt(a.expense)}</span></div></div>):<div style={{color:"var(--muted2)",fontSize:12,textAlign:"center",paddingTop:24}}>Sem dados.</div>}</div>
                </div>
              )}
              <div className="panel">
                <div className="ph"><div className="tabs"><button className={`tb ${tab==="expense"?"on":""}`} onClick={()=>setTab("expense")}>Despesas</button><button className={`tb ${tab==="income"?"on":""}`} onClick={()=>setTab("income")}>Receitas</button></div><span className="bc">{tab==="expense"?expenses.length:income.length} registros</span></div>
                <div className="tw">
                  {tab==="expense"&&(expenses.length===0?<div style={{color:"var(--muted2)",fontSize:13,textAlign:"center",padding:"22px 0"}}>Nenhuma despesa em {pl}.</div>:
                    <table><thead><tr><th>Descrição</th><th>Tipo</th><th>Categoria</th><th>Conta</th><th>Data</th><th>Valor</th><th>Status</th><th></th></tr></thead>
                    <tbody>{expenses.map(t=>{
                      const k=txKind(t); const name=(t.description??"").replace(/^\[FIXA:\d+\]\s*/,"")
                      const isCons=t.debt_type==="emprestimo_consignado"; const isFixa=t.is_fixa===true
                      const isInstTx=!!t.installment_id // ✅ item 9
                      return <tr key={t.id}>
                        <td style={{fontWeight:500}}>{name}</td>
                        <td><span className="badge" style={{background:k.bg,color:k.color}}>{k.label}</span></td>
                        <td style={{color:"var(--muted2)",fontSize:12}}>{cn(t.category_id)}</td>
                        <td style={{color:"var(--muted2)",fontSize:12}}>{an(t.account_id)}</td>
                        <td style={{color:"var(--muted2)",fontSize:12}}>{fmtDate(t.date)}</td>
                        <td>{isCons||isFixa?<span className="badge b-e">{fmt(t.amount)}</span>:eAmtId===t.id?<div className="ae"><input className="ai" type="number" value={eAmtV} onChange={e=>setEAmtV(e.target.value)} autoFocus/><button className="btn bp bsm" onClick={async()=>{await updateTransactionAmount(t.id,Number(eAmtV));setEAmtId(null);load()}}>✓</button><button className="btn bs bsm" onClick={()=>setEAmtId(null)}>✕</button></div>:<div style={{display:"flex",alignItems:"center",gap:5}}><span className="badge b-e">{fmt(t.amount)}</span><button className="be" onClick={()=>{setEAmtId(t.id);setEAmtV(String(t.amount))}}>✏️</button></div>}</td>
                        <td>{isCons?<span className="badge b-prog">📋 programado</span>:t.installment_id?<button className="pb" onClick={async()=>{await markTransactionPaid(t.id,!t.paid);load()}}>{t.paid?"✅":"⏳"}</button>:<span className="badge b-ok">✓ pago</span>}</td>
                        <td>{!isInstTx&&<button className="bd" onClick={()=>{deleteTransaction(t.id);load()}}>🗑</button>}</td>
                      </tr>
                    })}</tbody></table>
                  )}
                  {tab==="income"&&(income.length===0?<div style={{color:"var(--muted2)",fontSize:13,textAlign:"center",padding:"22px 0"}}>Nenhuma receita em {pl}.</div>:
                    <table><thead><tr><th>Descrição</th><th>Categoria</th><th>Conta</th><th>Data</th><th>Valor</th><th></th></tr></thead>
                    <tbody>{income.map(t=><tr key={t.id}><td style={{fontWeight:500}}>{t.description}</td><td style={{color:"var(--muted2)",fontSize:12}}>{cn(t.category_id)}</td><td style={{color:"var(--muted2)",fontSize:12}}>{an(t.account_id)}</td><td style={{color:"var(--muted2)",fontSize:12}}>{fmtDate(t.date)}</td><td><span className="badge b-i">{fmt(t.amount)}</span></td><td><button className="bd" onClick={()=>{deleteTransaction(t.id);load()}}>🗑</button></td></tr>)}</tbody></table>
                  )}
                </div>
              </div>
            </div>
            {/* fixas sidebar */}
            <div>{recMonth.length>0&&vm==="month"?
              <div className="panel">
                <div className="ph"><div><div className="pt">Contas fixas</div><div className="ps">{pl}</div></div><span className="bc">{recMonth.filter(r=>r.paid).length}/{recMonth.length} pagas</span></div>
                <div className="rdl">{recMonth.map(item=>(
                  <div key={item.id} className={`rdi ${item.status}`}>
                    <div className="rdi-l"><span style={{fontSize:18,flexShrink:0}}>{item.icon}</span>
                      <div style={{minWidth:0}}>
                        <div className="rdi-n">{item.name}</div>
                        <div className="rdi-s">dia {item.due_day}{item.paid&&item.paid_amount&&<span style={{color:"var(--green)",marginLeft:6}}>{fmt(item.paid_amount)}</span>}</div>
                      </div>
                    </div>
                    <div className="rdi-r">
                      {item.status==="paid"?<span className="badge b-ok">✓ pago</span>:item.status==="overdue"?<span className="badge" style={{background:"rgba(248,113,113,.15)",color:"var(--red)"}}>⚠ venceu</span>:item.status==="soon"?<span className="badge" style={{background:"rgba(251,191,36,.15)",color:"var(--yellow)"}}>⏰ em breve</span>:<span className="badge" style={{background:"var(--b1)",color:"var(--muted2)"}}>a vencer</span>}
                      {item.paid
                        ?<button className="be" onClick={async()=>{await unpayRecurring(item.id,{year,month});load()}}>✕</button>
                        // ✅ item 4: todas as contas fixas abrem modal de pagamento (com multa se vencido)
                        :<button className="btn bp bsm" onClick={()=>setPayingRec(item)}>Pagar</button>
                      }
                    </div>
                  </div>
                ))}</div>
              </div>:<div/>}
            </div>
          </div>
        </>}

        {/* ══ DÍVIDAS ══ */}
        {page==="debts"&&<>
          <button className={`tog ${showDebt?"on":""}`} onClick={()=>setShowDebt(!showDebt)}>+ Nova dívida {showDebt?"▲":"▼"}</button>
          {showDebt&&(
            <div className={`cbox ${showDebt?"on":""}`}>
              <div className="cbody" style={{flexDirection:"column"}}>
                <div style={{width:"100%"}}><span className="fl">Tipo de dívida</span>
                  <div className="dtg" style={{marginTop:8}}>{Object.entries(DEBT).map(([k,c])=><button key={k} type="button" className={`dtb ${dtype===k?`s-${k}`:""}`} onClick={()=>setDtype(k)}><span style={{fontSize:20}}>{c.icon}</span><div><div style={{fontSize:13,fontWeight:600}}>{c.label}</div>{c.sub&&<div style={{fontSize:11,opacity:.7}}>{c.sub}</div>}</div></button>)}</div>
                </div>
                {dtype==="emprestimo_consignado"&&<div className="hint-g">📋 Parcelas já vencidas serão marcadas como pagas automaticamente.</div>}
                <form onSubmit={addDebt} style={{width:"100%",display:"flex",flexWrap:"wrap",gap:8}}>
                  <input style={{flex:2,minWidth:140}} placeholder="Descrição" value={inst.description} onChange={e=>setInst({...inst,description:e.target.value})}/>
                  <input style={{flex:1}} type="number" placeholder="Valor total" value={inst.total_amount} onChange={e=>setInst({...inst,total_amount:e.target.value})}/>
                  <input style={{flex:1,minWidth:80}} type="number" placeholder="Nº parcelas" min="1" value={inst.total_installments} onChange={e=>setInst({...inst,total_installments:e.target.value})}/>
                  <input type="date" value={inst.start_date} onChange={e=>setInst({...inst,start_date:e.target.value})}/>
                  <div style={{width:"100%",background:"var(--s1)",borderRadius:10,padding:"10px 14px",display:"flex",flexDirection:"column",gap:10}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}><input type="checkbox" id="mc" checked={manualM} onChange={e=>setManualM(e.target.checked)} style={{width:"auto",cursor:"pointer"}}/><label htmlFor="mc" style={{fontSize:13,cursor:"pointer",fontWeight:500}}>Informar valor da parcela manualmente (com juros)</label></div>
                    {manualM&&<div><span className="fl">Valor mensal real</span><input type="number" placeholder="Ex: 350,00" value={inst.monthly_amount} onChange={e=>setInst({...inst,monthly_amount:e.target.value})}/></div>}
                    {instPrev&&<div style={{fontSize:12,color:"var(--muted2)"}}>Automático: <strong style={{color:"var(--text)"}}>{fmt(instPrev.auto)}/mês</strong>{instPrev.manual&&<span> → Manual: <strong style={{color:"var(--yellow)"}}>{fmt(instPrev.manual)}/mês</strong>{instPrev.diff&&instPrev.diff>0&&<span style={{color:"var(--red)",marginLeft:4}}>(+{fmt(instPrev.diff)} juros)</span>}</span>}</div>}
                  </div>
                  <select value={iCat} onChange={e=>setICat(e.target.value)}><option value="">Categoria</option>{cats.filter(c=>c.type==="expense").map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
                  <select value={iAcc} onChange={e=>setIAcc(e.target.value)}><option value="">Conta</option>{accs.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select>
                  <button type="submit" disabled={saving} className="btn bp">{saving?"Criando...":`✅ Criar ${DEBT[dtype].label}`}</button>
                </form>
              </div>
            </div>
          )}
          <div className="df">
            {[["todos","📋","Todos"],["parcelamento","💳","Parcelamentos"],["financiamento","🏦","Financiamentos"],["emprestimo_pessoal","🤝","Emp. Pessoal"],["emprestimo_consignado","📋","Consignado"]].map(([k,ic,lb])=>{
              const cnt=k==="todos"?insts.filter(i=>i.pending_installments>0).length:insts.filter(i=>i.debt_type===k&&i.pending_installments>0).length
              return <button key={k} className={`dfb ${dfilter===k?(k==="todos"?"active":`a-${k}`):"" }`} onClick={()=>setDfilter(k)}>{ic} {lb}{cnt>0&&<span style={{background:"var(--b2)",borderRadius:10,padding:"1px 6px",fontSize:10,marginLeft:4}}>{cnt}</span>}</button>
            })}
          </div>
          {fInsts.length>0&&<div className="chips"><div className="chip"><div className="chip-l">Total em aberto</div><div className="chip-v" style={{color:"var(--red)"}}>{fmt(totalDebt)}</div></div><div className="chip"><div className="chip-l">Compromisso mensal</div><div className="chip-v" style={{color:"var(--yellow)"}}>{fmt(totalM)}</div></div></div>}
          <div className="il">
            {[...activeInsts,...doneInsts].map(inst=>{
              const c=DEBT[inst.debt_type]??DEBT.parcelamento; const isDone=inst.pending_installments===0; const isCons=inst.debt_type==="emprestimo_consignado"
              return <div key={inst.id} className={`ic ${isDone?"done":""}`}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                  <div>
                    <span style={{background:c.bg,color:c.color,borderRadius:6,padding:"3px 8px",fontSize:11,fontWeight:600,display:"inline-flex",alignItems:"center",gap:4,marginBottom:5}}>{c.icon} {c.label}{isCons&&<span style={{fontSize:10,opacity:.8}}>· desconto em folha</span>}</span>
                    <div style={{fontWeight:600,fontSize:14,marginBottom:3}}>{inst.description}</div>
                    <div style={{fontSize:12,color:"var(--muted2)"}}>{fmt(inst.value_per_installment)}/mês{isCons&&" · automático"}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    {isDone?<div style={{fontFamily:"'Bricolage Grotesque',sans-serif",fontSize:16,fontWeight:700,color:"var(--green)"}}>{fmt(inst.total_paid)}</div>
                      :<>
                        {/* ✅ item 11: saldo total menor, real em destaque */}
                        <div style={{fontSize:11,color:"var(--muted2)",textDecoration:"line-through"}}>{fmt(inst.total_remaining)}</div>
                        <div style={{fontFamily:"'Bricolage Grotesque',sans-serif",fontSize:11,color:"var(--muted2)",marginBottom:2}}>soma parcelas</div>
                        <div style={{fontSize:12,color:"var(--muted2)"}}>pago: {fmt(inst.total_paid)}</div>
                      </>
                    }
                    <div className="i-act" style={{justifyContent:"flex-end",marginTop:4}}>
                      {/* ✅ item 6: consignado também pode editar */}
                      {!isDone&&<button className="be" onClick={()=>setEditInst(inst)}>✏️</button>}
                      {/* ✅ item 11: botão saldo real */}
                      {!isDone&&!isCons&&<button className="be" title="Ver saldo real" style={{color:"var(--acc)"}} onClick={()=>setRealBalInst(inst)}>💰</button>}
                      {!isDone&&<button className="be" title="Amortizar" style={{color:"#6dfabc"}} onClick={()=>setAmortInst(inst)}>🏦</button>}
                      <button className="bd" onClick={async()=>{if(confirm("Excluir dívida e todas as parcelas?")){await deleteInstallment(inst.id);load()}}}>🗑</button>
                    </div>
                  </div>
                </div>
                <div className="pw"><div className="pf" style={{width:`${inst.progress_percent}%`,background:isDone?"var(--green)":`linear-gradient(90deg,${c.color},${c.color}99)`}}/></div>
                <div className="ib2"><div className="ica">{inst.paid_installments}/{inst.total_installments} · {inst.progress_percent}%</div>{inst.next_due_date&&!isDone&&<div className="inxt">📅 {fmtDate(inst.next_due_date)}</div>}{isDone&&<div className="idone">✅ Quitado</div>}</div>
              </div>
            })}
            {fInsts.length===0&&<div style={{color:"var(--muted2)",fontSize:13,textAlign:"center",padding:"28px 0"}}>Nenhuma dívida cadastrada.</div>}
          </div>
        </>}

        {/* ══ FIXAS ══ */}
        {page==="fixed"&&<>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <div><div style={{fontFamily:"'Bricolage Grotesque',sans-serif",fontSize:20,fontWeight:700}}>Contas fixas</div><div style={{fontSize:13,color:"var(--muted2)",marginTop:2}}>Gerencie suas recorrências mensais</div></div>
            <button className="btn bp" onClick={()=>{setEditRec(null);setShowRecModal(true)}}>+ Nova conta</button>
          </div>
          {recItems.length>0&&<div className="chips"><div className="chip"><div className="chip-l">Total estimado/mês</div><div className="chip-v" style={{color:"#6db8fa"}}>{fmt(recTotal)}</div></div><div className="chip"><div className="chip-l">Fixas</div><div className="chip-v">{recItems.filter(r=>r.active&&!r.is_variable).length}</div></div><div className="chip"><div className="chip-l">Variáveis</div><div className="chip-v" style={{color:"var(--yellow)"}}>{recItems.filter(r=>r.active&&r.is_variable).length}</div></div></div>}
          {recItems.length===0?<div className="panel" style={{textAlign:"center",padding:"36px 0"}}><div style={{fontSize:40,opacity:.2,marginBottom:8}}>🧾</div><div style={{color:"var(--muted2)",fontSize:13}}>Nenhuma conta fixa cadastrada.</div></div>:
            <div className="rl">
              {recItems.filter(r=>!r.is_variable).length>0&&<div style={{fontSize:11,fontWeight:700,color:"var(--muted2)",textTransform:"uppercase",letterSpacing:".7px",margin:"6px 0 3px"}}>Com vencimento fixo</div>}
              {recItems.filter(r=>!r.is_variable).map(item=>(
                <div key={item.id} className={`ri ${!item.active?"inactive":""}`}>
                  <div className="ri-l"><div className="ri-ico">{item.icon}</div><div style={{minWidth:0}}><div className="ri-name">{item.name}</div><div className="ri-day">dia {item.due_day}{!item.active&&<span style={{marginLeft:6,fontSize:11,color:"var(--muted)"}}>inativa</span>}</div></div></div>
                  <div className="ri-r"><span style={{fontFamily:"'Bricolage Grotesque',sans-serif",fontSize:15,fontWeight:700,color:"#6db8fa"}}>{fmt(item.amount)}</span><div className="ri-act"><button className="be" onClick={()=>{setEditRec(item);setShowRecModal(true)}}>✏️</button><button className="bd" onClick={async()=>{if(confirm("Remover?"))await deleteRecurring(item.id);load()}}>🗑</button></div></div>
                </div>
              ))}
              {recItems.filter(r=>r.is_variable).length>0&&<div style={{fontSize:11,fontWeight:700,color:"var(--muted2)",textTransform:"uppercase",letterSpacing:".7px",margin:"12px 0 3px"}}>Variáveis (valor muda todo mês)</div>}
              {recItems.filter(r=>r.is_variable).map(item=>(
                <div key={item.id} className={`ri ${!item.active?"inactive":""}`}>
                  <div className="ri-l"><div className="ri-ico var">{item.icon}</div><div style={{minWidth:0}}><div className="ri-name">{item.name}</div><div className="ri-day">dia {item.due_day} · valor variável{!item.active&&<span style={{marginLeft:6,fontSize:11,color:"var(--muted)"}}>inativa</span>}</div></div></div>
                  <div className="ri-r"><span style={{fontFamily:"'Bricolage Grotesque',sans-serif",fontSize:15,fontWeight:700,color:"var(--yellow)"}}>{fmt(item.amount)}</span><div className="ri-act"><button className="be" onClick={()=>{setEditRec(item);setShowRecModal(true)}}>✏️</button><button className="bd" onClick={async()=>{if(confirm("Remover?"))await deleteRecurring(item.id);load()}}>🗑</button></div></div>
                </div>
              ))}
            </div>
          }
        </>}

        {/* ══ CONFIG ══ */}
        {page==="settings"&&(
          <div className="g2b">
            <div className="panel"><div className="ph"><div><div className="pt">Categorias</div><div className="ps">gerencie suas categorias</div></div><button className="btn bp bsm" onClick={()=>setShowCatModal(true)}>Gerenciar</button></div><div style={{maxHeight:300,overflowY:"auto"}}>{cats.map(c=><div key={c.id} className="mi"><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontWeight:500,fontSize:14}}>{c.name}</span><span className={c.type==="income"?"mi-i":"mi-e"}>{c.type==="income"?"receita":"despesa"}</span></div></div>)}</div></div>
            <div className="panel"><div className="ph"><div><div className="pt">Contas & Cartões</div><div className="ps">gerencie suas contas</div></div><button className="btn bp bsm" onClick={()=>setShowAccModal(true)}>Gerenciar</button></div><div style={{maxHeight:300,overflowY:"auto"}}>{accs.map(a=><div key={a.id} className="mi"><span style={{fontWeight:500,fontSize:14}}>🏦 {a.name}</span></div>)}</div></div>
          </div>
        )}
      </div>

      {/* MODAIS */}
      {showRecModal&&<RecModal item={editRec} cats={cats} onSave={async d=>{if(editRec)await updateRecurring(editRec.id,d);else await createRecurring(d);setShowRecModal(false);setEditRec(null);load()}} onClose={()=>{setShowRecModal(false);setEditRec(null)}}/>}
      {editInst&&<EditInstModal item={editInst} cats={cats} accs={accs} onSave={async d=>{await updateInstallment(editInst.id,d);setEditInst(null);load()}} onClose={()=>setEditInst(null)}/>}
      {showCatModal&&<ManageModal title="Categorias" items={cats} kind="category" onCreate={async d=>{await createCategory(d);load()}} onUpdate={async(id,d)=>{await updateCategory(id,d);load()}} onDelete={async id=>{await deleteCategory(id);load()}} onClose={()=>setShowCatModal(false)}/>}
      {showAccModal&&<ManageModal title="Contas & Cartões" items={accs} kind="account" onCreate={async d=>{await createAccount(d);load()}} onUpdate={async(id,d)=>{await updateAccount(id,d);load()}} onDelete={async id=>{await deleteAccount(id);load()}} onClose={()=>setShowAccModal(false)}/>}
      {amortInst&&<AmortizationModal installment={amortInst} accounts={accs} onClose={()=>setAmortInst(null)} onSuccess={()=>{setAmortInst(null);load()}}/>}
      {realBalInst&&<RealBalanceModal inst={realBalInst} onClose={()=>setRealBalInst(null)}/>}
      {/* ✅ item 4: modal de pagamento com multa */}
      {payingRec&&<PayWithFineModal title={`${payingRec.icon} ${payingRec.name}`} defaultAmount={payingRec.paid_amount??payingRec.amount} accounts={accs} isOverdue={payingRec.status==="overdue"}
        onPay={async(amount,accId,fine)=>{ await payRecurring(payingRec.id,{year,month,amount,account_id:accId,fine}); setPayingRec(null); load() }}
        onClose={()=>setPayingRec(null)}/>}
      <Calculator/>
    </>
  )
}