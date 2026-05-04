"""
Rotas de amortização de dívidas.
- POST /installments/{id}/amortize/simulate  → simulação SAC + Price (não salva nada)
- POST /installments/{id}/amortize           → cadastra amortização real:
    · marca as últimas N parcelas pendentes como paid=True
    · lança uma transação de amortização no mês de cada parcela quitada
    · atualiza a dívida
"""
import math
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import date

from app.database import get_db
from app.models.installment import Installment
from app.models.transaction import Transaction

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────
class SimulateRequest(BaseModel):
    monthly_rate: float       # taxa mensal em % (ex: 1.5 para 1.5%)
    amortization_value: float # valor que quer amortizar


class AmortizeRequest(BaseModel):
    installments_removed: int  # quantas parcelas finais serão marcadas como pagas
    value_paid: float          # valor total pago na amortização
    account_id: int            # conta de onde saiu o dinheiro
    paid_date: Optional[str] = None  # data do pagamento principal (default: hoje)


# ── Helpers SAC e Price ───────────────────────────────────────────────────────
def _sac_schedule(balance: float, n: int, r: float):
    """Gera plano SAC completo. r = taxa decimal (ex: 0.015)"""
    if n <= 0:
        return []
    amort = balance / n
    schedule = []
    b = balance
    for i in range(n):
        interest = b * r
        total = amort + interest
        schedule.append({
            "installment": i + 1,
            "amortization": round(amort, 2),
            "interest": round(interest, 2),
            "total": round(total, 2),
            "balance_after": round(max(b - amort, 0), 2),
        })
        b -= amort
    return schedule


def _price_schedule(balance: float, n: int, r: float):
    """Gera plano Price completo. r = taxa decimal."""
    if n <= 0:
        return []
    if r == 0:
        pmt = balance / n
    else:
        pmt = balance * r / (1 - (1 + r) ** (-n))
    schedule = []
    b = balance
    for i in range(n):
        interest = b * r
        amort = pmt - interest
        schedule.append({
            "installment": i + 1,
            "amortization": round(amort, 2),
            "interest": round(interest, 2),
            "total": round(pmt, 2),
            "balance_after": round(max(b - amort, 0), 2),
        })
        b -= amort
    return schedule


def _simulate_sac(balance: float, n: int, r: float, amort_value: float) -> dict:
    sched = _sac_schedule(balance, n, r)
    total_interest_original = sum(p["interest"] for p in sched)

    # quantas parcelas finais o valor cobre (amortização remove saldo do final)
    amort_per = balance / n
    removed = min(int(amort_value / amort_per), n - 1)
    removed = max(removed, 0)

    removed_parcelas = sched[-removed:] if removed > 0 else []
    interest_saved = sum(p["interest"] for p in removed_parcelas)

    new_n = n - removed
    new_sched = _sac_schedule(balance - amort_value, new_n, r) if new_n > 0 else []
    new_pmt = new_sched[0]["total"] if new_sched else 0

    return {
        "system": "SAC",
        "description": "Amortização constante — parcela diminui com o tempo",
        "installments_removed": removed,
        "new_remaining_installments": new_n,
        "total_interest_original": round(total_interest_original, 2),
        "total_interest_saved": round(interest_saved, 2),
        "pct_interest_saved": round(interest_saved / total_interest_original * 100, 1) if total_interest_original > 0 else 0,
        "new_first_payment": round(new_pmt, 2),
        "original_payment": round(sched[0]["total"] if sched else 0, 2),
        "schedule_sample": sched[:8],
        "schedule_after_sample": new_sched[:8],
    }


def _simulate_price(balance: float, n: int, r: float, amort_value: float) -> dict:
    sched = _price_schedule(balance, n, r)
    total_interest_original = sum(p["interest"] for p in sched)

    if r == 0:
        pmt = balance / n
    else:
        pmt = balance * r / (1 - (1 + r) ** (-n))

    new_balance = balance - amort_value
    if new_balance <= 0:
        new_n = 0
        interest_saved = total_interest_original
    else:
        if r == 0:
            new_n = math.ceil(new_balance / pmt) if pmt > 0 else 0
        else:
            ratio = new_balance * r / pmt
            if ratio >= 1:
                new_n = n
            else:
                new_n = math.ceil(-math.log(1 - ratio) / math.log(1 + r))
        new_n = max(min(new_n, n - 1), 0)
        removed = n - new_n
        removed_parcelas = sched[-removed:] if removed > 0 else []
        interest_saved = sum(p["interest"] for p in removed_parcelas)

    removed = n - new_n
    new_sched = _price_schedule(new_balance, new_n, r) if new_n > 0 else []

    return {
        "system": "Price",
        "description": "Parcela fixa — prazo reduz ao amortizar",
        "installments_removed": removed,
        "new_remaining_installments": new_n,
        "total_interest_original": round(total_interest_original, 2),
        "total_interest_saved": round(interest_saved, 2),
        "pct_interest_saved": round(interest_saved / total_interest_original * 100, 1) if total_interest_original > 0 else 0,
        "new_first_payment": round(new_sched[0]["total"] if new_sched else pmt, 2),
        "original_payment": round(pmt, 2),
        "schedule_sample": sched[:8],
        "schedule_after_sample": new_sched[:8],
    }


# ── Routes ────────────────────────────────────────────────────────────────────
@router.post("/installments/{id}/amortize/simulate")
def simulate_amortization(id: int, body: SimulateRequest, db: Session = Depends(get_db)):
    inst = db.query(Installment).filter(Installment.id == id).first()
    if not inst:
        raise HTTPException(404, "Dívida não encontrada")

    pending = (
        db.query(Transaction)
        .filter(Transaction.installment_id == id, Transaction.paid == False)
        .order_by(Transaction.date)
        .all()
    )
    if not pending:
        raise HTTPException(400, "Todas as parcelas já estão pagas")

    balance = sum(p.amount for p in pending)
    n = len(pending)

    if body.amortization_value <= 0:
        raise HTTPException(400, "Valor de amortização deve ser maior que zero")
    if body.amortization_value >= balance:
        raise HTTPException(400, f"Valor maior que o saldo devedor ({balance:.2f}). Para quitação total, use outro recurso.")
    if body.monthly_rate < 0:
        raise HTTPException(400, "Taxa de juros não pode ser negativa")

    r = body.monthly_rate / 100

    sac = _simulate_sac(balance, n, r, body.amortization_value)
    price = _simulate_price(balance, n, r, body.amortization_value)

    return {
        "installment_id": id,
        "description": inst.description,
        "debt_type": inst.debt_type,
        "current_balance": round(balance, 2),
        "current_installments": n,
        "current_payment": round(pending[0].amount, 2),
        "amortization_value": body.amortization_value,
        "monthly_rate": body.monthly_rate,
        "annual_rate": round((1 + body.monthly_rate / 100) ** 12 - 1) * 100,
        "sac": sac,
        "price": price,
        "recommendation": "sac" if sac["total_interest_saved"] >= price["total_interest_saved"] else "price",
    }


@router.post("/installments/{id}/amortize")
def register_amortization(id: int, body: AmortizeRequest, db: Session = Depends(get_db)):
    """
    Cadastra amortização real:
    1. Pega as últimas N parcelas pendentes
    2. Marca cada uma como paid=True
    3. Lança uma transação [AMORT] no mês de cada parcela quitada
       (assim aparecem no dash de cada mês correspondente)
    """
    inst = db.query(Installment).filter(Installment.id == id).first()
    if not inst:
        raise HTTPException(404, "Dívida não encontrada")

    if body.installments_removed <= 0:
        raise HTTPException(400, "Número de parcelas deve ser maior que zero")
    if body.value_paid <= 0:
        raise HTTPException(400, "Valor deve ser maior que zero")

    # pega pendentes ordenadas do final para o início
    pending = (
        db.query(Transaction)
        .filter(Transaction.installment_id == id, Transaction.paid == False)
        .order_by(Transaction.date.desc())
        .all()
    )

    if not pending:
        raise HTTPException(400, "Não há parcelas pendentes para amortizar")

    total_pending = len(pending)
    if body.installments_removed >= total_pending:
        raise HTTPException(400, f"Não pode amortizar todas as {total_pending} parcelas pendentes. Ao menos uma precisa ficar.")

    to_amortize = pending[:body.installments_removed]
    paid_date = date.fromisoformat(body.paid_date) if body.paid_date else date.today()

    # valor proporcional por parcela (caso queira diluir o pagamento)
    value_per = round(body.value_paid / len(to_amortize), 2)

    for i, parcela in enumerate(to_amortize):
        # marca a parcela original como paga
        parcela.paid = True

        # lança transação de amortização no mês da parcela
        # assim aparece no dashboard do mês correto
        amort_tx = Transaction(
            description=f"[AMORT:{id}] {inst.description} (parcela {parcela.installment_number})",
            amount=value_per,
            type="expense",
            date=parcela.date,       # ← data da parcela, não hoje
            category_id=parcela.category_id,
            account_id=body.account_id,
            installment_id=inst.id,
            paid=True,
        )
        db.add(amort_tx)

    db.commit()

    # contagens atualizadas
    remaining_pending = (
        db.query(Transaction)
        .filter(Transaction.installment_id == id, Transaction.paid == False)
        .count()
    )
    total_paid_now = (
        db.query(Transaction)
        .filter(Transaction.installment_id == id, Transaction.paid == True)
        .count()
    )

    return {
        "ok": True,
        "installments_amortized": len(to_amortize),
        "value_paid": body.value_paid,
        "remaining_pending_installments": remaining_pending,
        "total_paid_installments": total_paid_now,
        "message": f"✅ {len(to_amortize)} parcela(s) quitada(s) antecipadamente. {remaining_pending} ainda pendente(s).",
    }


@router.get("/installments/{id}/amortize/history")
def amortization_history(id: int, db: Session = Depends(get_db)):
    """Retorna histórico de amortizações de uma dívida."""
    txs = (
        db.query(Transaction)
        .filter(
            Transaction.installment_id == id,
            Transaction.description.like(f"[AMORT:{id}]%")
        )
        .order_by(Transaction.date.desc())
        .all()
    )
    return [
        {
            "id": t.id,
            "description": t.description,
            "amount": t.amount,
            "date": str(t.date),
            "account_id": t.account_id,
        }
        for t in txs
    ]