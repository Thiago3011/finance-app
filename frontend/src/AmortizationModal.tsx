import { useState } from "react"
import { simulateAmortization, registerAmortization } from "./api/api"

const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)
const fmtN = (v: number, dec = 2) => v.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec })

interface Inst {
  id: number; description: string; debt_type: string
  total_remaining: number; pending_installments: number; value_per_installment: number
}
interface Props {
  installment: Inst
  accounts: { id: number; name: string }[]
  onClose: () => void
  onSuccess: () => void
}

const CSS = `
.ab{position:fixed;inset:0;background:rgba(0,0,0,.88);display:flex;align-items:center;justify-content:center;z-index:200;padding:16px}
.am{background:#0f0f1a;border:1px solid #ffffff1a;border-radius:16px;width:100%;max-width:820px;max-height:94vh;overflow-y:auto;padding:28px;scrollbar-width:thin}
.am-title{font-family:'Bricolage Grotesque',sans-serif;font-size:22px;font-weight:800;margin-bottom:3px}
.am-sub{font-size:13px;color:#8888a8;margin-bottom:22px}
.seg{display:flex;gap:2px;background:#17172a;border:1px solid #ffffff1a;border-radius:10px;padding:3px;width:fit-content;margin-bottom:22px}
.sg{background:none;border:none;border-radius:8px;color:#8888a8;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;font-weight:600;padding:8px 22px;transition:all .18s}
.sg.on{background:#1f1f35;color:#eeeef8;box-shadow:0 2px 6px rgba(0,0,0,.3)}
.ib{background:rgba(124,109,250,.08);border:1px solid rgba(124,109,250,.2);border-radius:10px;padding:14px 16px;margin-bottom:20px;display:flex;gap:24px;flex-wrap:wrap}
.ib-item{display:flex;flex-direction:column;gap:3px}
.ib-lbl{font-size:11px;font-weight:700;color:#8888a8;text-transform:uppercase;letter-spacing:.7px}
.ib-val{font-family:'Bricolage Grotesque',sans-serif;font-size:18px;font-weight:700}
.fl{font-size:11px;font-weight:700;color:#8888a8;text-transform:uppercase;letter-spacing:.7px;margin-bottom:5px;display:block}
.fi{background:#17172a;border:1px solid #ffffff1a;border-radius:10px;color:#eeeef8;font-family:'Plus Jakarta Sans',sans-serif;font-size:14px;padding:10px 14px;outline:none;width:100%;transition:border-color .2s}
.fi:focus{border-color:#7c6dfa}
.fi::placeholder{color:#5a5a72}
.fi-row{display:flex;gap:12px;margin-bottom:14px}
.fi-row>*{flex:1}
.bp{background:#7c6dfa;border:none;border-radius:10px;color:#fff;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;font-size:14px;font-weight:600;padding:10px 20px;transition:all .2s}
.bp:hover{background:#6a5ce8;transform:translateY(-1px)}
.bp:disabled{opacity:.5;cursor:default;transform:none}
.bs{background:#17172a;border:1px solid #ffffff1a;border-radius:10px;color:#eeeef8;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;font-size:14px;font-weight:600;padding:10px 20px;transition:all .2s}
.bs:hover{border-color:#7c6dfa}
.btns{display:flex;gap:10px;justify-content:flex-end;margin-top:20px}
/* sim cards */
.sc-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:16px}
.sc-card{background:#17172a;border:1px solid #ffffff1a;border-radius:12px;padding:18px;display:flex;flex-direction:column;gap:0}
.sc-card.best{border-color:rgba(109,250,188,.45);background:rgba(109,250,188,.04)}
.sc-title{font-family:'Bricolage Grotesque',sans-serif;font-size:17px;font-weight:800;display:flex;align-items:center;gap:8px;margin-bottom:2px}
.sc-desc{font-size:12px;color:#8888a8;margin-bottom:14px}
.sr{display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid #ffffff08}
.sr:last-of-type{border-bottom:none}
.sl{font-size:13px;color:#8888a8}
.sv{font-family:'Bricolage Grotesque',sans-serif;font-size:15px;font-weight:700}
.sv.g{color:#4ade80}.sv.r{color:#f87171}.sv.y{color:#fbbf24}
.best-tag{background:rgba(109,250,188,.15);border:1px solid rgba(109,250,188,.35);border-radius:20px;color:#6dfabc;font-size:11px;font-weight:700;padding:3px 10px}
/* schedule */
.sched-wrap{margin-top:14px}
.sched-title{font-size:11px;font-weight:700;color:#8888a8;text-transform:uppercase;letter-spacing:.7px;margin-bottom:8px}
table.sc-tbl{width:100%;border-collapse:collapse;font-size:12px}
table.sc-tbl th{text-align:right;padding:5px 8px;font-size:10px;font-weight:700;color:#5a5a72;text-transform:uppercase;border-bottom:1px solid #ffffff08}
table.sc-tbl th:first-child{text-align:left}
table.sc-tbl td{text-align:right;padding:6px 8px;border-bottom:1px solid #ffffff05;color:#c0c0d8;font-size:11px}
table.sc-tbl td:first-child{text-align:left;font-weight:600}
/* register */
.reg-box{background:rgba(124,109,250,.06);border:1px solid rgba(124,109,250,.2);border-radius:10px;padding:16px;margin-bottom:16px}
.prev-box{background:rgba(74,222,128,.06);border:1px solid rgba(74,222,128,.2);border-radius:10px;padding:14px;margin:14px 0}
.prev-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:7px}
.prev-row:last-child{margin-bottom:0}
.alert{border-radius:10px;font-size:13px;padding:10px 14px;margin-bottom:14px}
.alert.err{background:rgba(248,113,113,.1);border:1px solid rgba(248,113,113,.3);color:#f87171}
.alert.ok{background:rgba(74,222,128,.1);border:1px solid rgba(74,222,128,.3);color:#4ade80}
.alert.warn{background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.25);color:#fbbf24;font-size:12px}
/* hist */
.hist-item{background:#17172a;border:1px solid #ffffff0d;border-radius:9px;padding:11px 14px;margin-bottom:7px;display:flex;justify-content:space-between;align-items:center}
@media(max-width:640px){.sc-grid{grid-template-columns:1fr}.fi-row{flex-direction:column}}
`

export default function AmortizationModal({ installment, accounts, onClose, onSuccess }: Props) {
  const [tab, setTab] = useState<"simulate" | "register">("simulate")

  // ── Simulator ──
  const [rate, setRate] = useState("")
  const [amortVal, setAmortVal] = useState("")
  const [loading, setLoading] = useState(false)
  const [simErr, setSimErr] = useState("")
  const [simRes, setSimRes] = useState<any>(null)

  // ── Register ──
  const [rInstN, setRInstN] = useState("")
  const [rVal, setRVal] = useState("")
  const [rAcc, setRAcc] = useState(accounts[0]?.id ? String(accounts[0].id) : "")
  const [rDate, setRDate] = useState(new Date().toISOString().slice(0, 10))
  const [rLoading, setRLoading] = useState(false)
  const [rErr, setRErr] = useState("")
  const [rOk, setROk] = useState("")

  const pending = installment.pending_installments
  const balance = installment.total_remaining

  async function handleSim() {
    if (!rate || !amortVal) { setSimErr("Preencha a taxa mensal e o valor a amortizar"); return }
    setLoading(true); setSimErr(""); setSimRes(null)
    try {
      const res = await simulateAmortization(installment.id, {
        monthly_rate: Number(rate),
        amortization_value: Number(amortVal),
      })
      if (res.detail) { setSimErr(res.detail); return }
      setSimRes(res)
    } catch { setSimErr("Erro ao simular. Verifique os dados.") }
    finally { setLoading(false) }
  }

  function useResult(system: "sac" | "price") {
    if (!simRes) return
    const s = simRes[system]
    setRInstN(String(s.installments_removed))
    setRVal(String(simRes.amortization_value))
    setTab("register")
  }

  async function handleRegister() {
    if (!rInstN || !rVal || !rAcc) { setRErr("Preencha todos os campos"); return }
    const n = Number(rInstN)
    if (n <= 0) { setRErr("Número de parcelas deve ser maior que zero"); return }
    if (n >= pending) { setRErr(`Não pode amortizar todas as ${pending} parcelas. Ao menos 1 deve ficar pendente.`); return }
    if (!confirm(`Confirmar amortização de ${n} parcela(s) por ${fmt(Number(rVal))}?\n\nAs últimas ${n} parcelas serão marcadas como pagas. Esta ação é irreversível.`)) return
    setRLoading(true); setRErr(""); setROk("")
    try {
      const res = await registerAmortization(installment.id, {
        installments_removed: n,
        value_paid: Number(rVal),
        account_id: Number(rAcc),
        paid_date: rDate,
      })
      if (res.detail) { setRErr(res.detail); return }
      setROk(res.message)
      setTimeout(() => { onSuccess(); onClose() }, 2000)
    } catch { setRErr("Erro ao registrar amortização.") }
    finally { setRLoading(false) }
  }

  const previewN = Number(rInstN) || 0
  const previewOk = previewN > 0 && previewN < pending

  return (
    <>
      <style>{CSS}</style>
      <div className="ab" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
        <div className="am">

          <div className="am-title">🏦 Amortização Antecipada</div>
          <div className="am-sub">{installment.description}</div>

          {/* INFO DÍVIDA */}
          <div className="ib">
            <div className="ib-item"><span className="ib-lbl">Saldo devedor</span><span className="ib-val" style={{ color: "#f87171" }}>{fmt(balance)}</span></div>
            <div className="ib-item"><span className="ib-lbl">Parcelas pendentes</span><span className="ib-val">{pending}</span></div>
            <div className="ib-item"><span className="ib-lbl">Parcela atual</span><span className="ib-val">{fmt(installment.value_per_installment)}</span></div>
          </div>

          {/* TABS */}
          <div className="seg">
            <button className={`sg ${tab === "simulate" ? "on" : ""}`} onClick={() => setTab("simulate")}>🧮 Simulador</button>
            <button className={`sg ${tab === "register" ? "on" : ""}`} onClick={() => setTab("register")}>✅ Registrar</button>
          </div>

          {/* ══ SIMULADOR ════════════════════════════════════════════════════ */}
          {tab === "simulate" && (
            <>
              <div className="fi-row">
                <div>
                  <span className="fl">Taxa de juros mensal (%)</span>
                  <input className="fi" type="number" step="0.001" placeholder="Ex: 1.5" value={rate} onChange={e => setRate(e.target.value)} />
                  {rate && <div style={{ fontSize: 11, color: "#8888a8", marginTop: 4 }}>
                    = {fmtN(((1 + Number(rate) / 100) ** 12 - 1) * 100, 2)}% ao ano (juros compostos)
                  </div>}
                </div>
                <div>
                  <span className="fl">Valor a amortizar (R$)</span>
                  <input className="fi" type="number" placeholder={`Ex: ${(balance * 0.2).toFixed(0)}`} value={amortVal} onChange={e => setAmortVal(e.target.value)} />
                  {amortVal && balance > 0 && <div style={{ fontSize: 11, color: "#8888a8", marginTop: 4 }}>
                    = {fmtN(Number(amortVal) / balance * 100, 1)}% do saldo devedor
                  </div>}
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 18 }}>
                  <button className="bp" onClick={handleSim} disabled={loading} style={{ width: "100%" }}>
                    {loading ? "Calculando..." : "Simular"}
                  </button>
                </div>
              </div>

              {simErr && <div className="alert err">{simErr}</div>}

              {simRes && (() => {
                const sac = simRes.sac
                const price = simRes.price
                const rec = simRes.recommendation
                return (
                  <>
                    <div style={{ fontSize: 13, color: "#8888a8", marginBottom: 12 }}>
                      Amortizando <strong style={{ color: "#eeeef8" }}>{fmt(simRes.amortization_value)}</strong> · {fmtN(simRes.monthly_rate, 2)}%/mês · {pending} parcelas · saldo {fmt(simRes.current_balance)}
                    </div>

                    <div className="sc-grid">
                      {/* SAC */}
                      {[["sac", sac], ["price", price]].map(([key, s]: any) => {
                        const isBest = rec === key
                        return (
                          <div key={key} className={`sc-card ${isBest ? "best" : ""}`}>
                            <div className="sc-title">
                              {key === "sac" ? "SAC" : "Price"}
                              {isBest && <span className="best-tag">✓ maior economia</span>}
                            </div>
                            <div className="sc-desc">{s.description}</div>

                            <div className="sr"><span className="sl">Parcelas quitadas</span><span className="sv g">−{s.installments_removed}</span></div>
                            <div className="sr"><span className="sl">Restam</span><span className="sv">{s.new_remaining_installments}</span></div>
                            <div className="sr">
                              <span className="sl">Juros economizados</span>
                              <div style={{ textAlign: "right" }}>
                                <div className="sv g">{fmt(s.total_interest_saved)}</div>
                                <div style={{ fontSize: 11, color: "#6dfabc" }}>{fmtN(s.pct_interest_saved, 1)}% dos juros totais</div>
                              </div>
                            </div>
                            <div className="sr"><span className="sl">Total de juros originais</span><span className="sv r">{fmt(s.total_interest_original)}</span></div>
                            <div className="sr">
                              <span className="sl">Parcela atual → nova</span>
                              <div style={{ textAlign: "right" }}>
                                <span style={{ color: "#8888a8", textDecoration: "line-through", fontSize: 12, marginRight: 6 }}>{fmt(s.original_payment)}</span>
                                <span className="sv y">{fmt(s.new_first_payment)}</span>
                              </div>
                            </div>

                            {/* TABELA ANTES */}
                            {s.schedule_sample.length > 0 && (
                              <div className="sched-wrap">
                                <div className="sched-title">Plano original ({key.toUpperCase()}) — primeiras parcelas</div>
                                <table className="sc-tbl">
                                  <thead><tr><th>#</th><th>Amort.</th><th>Juros</th><th>Total</th><th>Saldo</th></tr></thead>
                                  <tbody>
                                    {s.schedule_sample.map((p: any) => (
                                      <tr key={p.installment}>
                                        <td>{p.installment}</td>
                                        <td>{fmt(p.amortization)}</td>
                                        <td style={{ color: "#f87171" }}>{fmt(p.interest)}</td>
                                        <td style={{ fontWeight: 700 }}>{fmt(p.total)}</td>
                                        <td style={{ color: "#8888a8" }}>{fmt(p.balance_after)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            {/* TABELA DEPOIS */}
                            {s.schedule_after_sample.length > 0 && (
                              <div className="sched-wrap">
                                <div className="sched-title" style={{ color: "#6dfabc" }}>Após amortização — primeiras parcelas</div>
                                <table className="sc-tbl">
                                  <thead><tr><th>#</th><th>Amort.</th><th>Juros</th><th>Total</th><th>Saldo</th></tr></thead>
                                  <tbody>
                                    {s.schedule_after_sample.map((p: any) => (
                                      <tr key={p.installment} style={{ background: "rgba(109,250,188,.03)" }}>
                                        <td>{p.installment}</td>
                                        <td>{fmt(p.amortization)}</td>
                                        <td style={{ color: "#f87171" }}>{fmt(p.interest)}</td>
                                        <td style={{ fontWeight: 700, color: "#6dfabc" }}>{fmt(p.total)}</td>
                                        <td style={{ color: "#8888a8" }}>{fmt(p.balance_after)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            <div style={{ marginTop: 16 }}>
                              <button className="bp" style={{ width: "100%" }} onClick={() => useResult(key as "sac" | "price")}>
                                Usar {key.toUpperCase()} → Registrar
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    <div className="alert warn" style={{ marginTop: 14 }}>
                      ℹ️ <strong>SAC</strong>: amortização constante, parcelas diminuem ao longo do tempo. <strong>Price</strong>: parcela fixa, ao amortizar o prazo encurta. Em ambos os casos, as parcelas quitadas são as do <strong>final</strong> da dívida.
                    </div>
                  </>
                )
              })()}

              <div className="btns"><button className="bs" onClick={onClose}>Fechar</button></div>
            </>
          )}

          {/* ══ REGISTRAR ════════════════════════════════════════════════════ */}
          {tab === "register" && (
            <>
              <div style={{ fontSize: 13, color: "#8888a8", marginBottom: 16, lineHeight: 1.6 }}>
                As <strong style={{ color: "#eeeef8" }}>últimas N parcelas</strong> serão marcadas como pagas e aparecerão no dashboard de cada mês correspondente. Uma transação de amortização será lançada em cada mês quitado.
              </div>

              <div className="reg-box">
                <div className="fi-row">
                  <div>
                    <span className="fl">Parcelas a quitar antecipadamente</span>
                    <input className="fi" type="number" min="1" max={pending - 1}
                      placeholder={`Entre 1 e ${pending - 1}`}
                      value={rInstN} onChange={e => setRInstN(e.target.value)} />
                    <div style={{ fontSize: 11, color: "#8888a8", marginTop: 4 }}>
                      Máx: {pending - 1} (ao menos 1 parcela deve ficar pendente)
                    </div>
                  </div>
                  <div>
                    <span className="fl">Valor total pago (R$)</span>
                    <input className="fi" type="number" placeholder="Valor da amortização"
                      value={rVal} onChange={e => setRVal(e.target.value)} />
                    {rInstN && rVal && Number(rInstN) > 0 && (
                      <div style={{ fontSize: 11, color: "#8888a8", marginTop: 4 }}>
                        ≈ {fmt(Number(rVal) / Number(rInstN))} por parcela
                      </div>
                    )}
                  </div>
                </div>
                <div className="fi-row">
                  <div>
                    <span className="fl">Conta debitada</span>
                    <select className="fi" value={rAcc} onChange={e => setRAcc(e.target.value)}>
                      {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <span className="fl">Data do pagamento</span>
                    <input className="fi" type="date" value={rDate} onChange={e => setRDate(e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Preview */}
              {previewOk && (
                <div className="prev-box">
                  <div className="prev-row">
                    <span style={{ fontSize: 13, color: "#8888a8" }}>Parcelas quitadas (do final)</span>
                    <span style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 16, fontWeight: 700, color: "#4ade80" }}>−{previewN}</span>
                  </div>
                  <div className="prev-row">
                    <span style={{ fontSize: 13, color: "#8888a8" }}>Parcelas que continuam pendentes</span>
                    <span style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 16, fontWeight: 700 }}>{pending - previewN}</span>
                  </div>
                  <div className="prev-row">
                    <span style={{ fontSize: 13, color: "#8888a8" }}>Valor saindo da conta</span>
                    <span style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 16, fontWeight: 700, color: "#f87171" }}>{fmt(Number(rVal))}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#fbbf24", marginTop: 10 }}>
                    ⚠️ As parcelas quitadas aparecerão como pagas no dashboard de cada mês. Esta ação é irreversível.
                  </div>
                </div>
              )}

              {rErr && <div className="alert err">{rErr}</div>}
              {rOk && <div className="alert ok">{rOk}</div>}

              <div className="btns">
                <button className="bs" onClick={onClose}>Cancelar</button>
                <button className="bp" onClick={handleRegister} disabled={rLoading || !!rOk}>
                  {rLoading ? "Registrando..." : "✅ Confirmar amortização"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}