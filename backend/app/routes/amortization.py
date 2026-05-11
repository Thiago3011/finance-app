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


class SimulateRequest(BaseModel):
    monthly_rate: float
    amortization_value: float


class AmortizeRequest(BaseModel):
    installments_removed: int
    value_paid: float
    account_id: int
    paid_date: Optional[str] = None


def _sac_schedule(balance, n, r):
    if n <= 0: return []
    amort = balance / n
    schedule, b = [], balance
    for i in range(n):
        interest = b * r
        total = amort + interest
        schedule.append({"installment": i+1, "amortization": round(amort,2), "interest": round(interest,2), "total": round(total,2), "balance_after": round(max(b-amort,0),2)})
        b -= amort
    return schedule


def _price_schedule(balance, n, r):
    if n <= 0: return []
    pmt = balance * r / (1-(1+r)**(-n)) if r > 0 else balance/n
    schedule, b = [], balance
    for i in range(n):
        interest = b * r
        amort = pmt - interest
        schedule.append({"installment": i+1, "amortization": round(amort,2), "interest": round(interest,2), "total": round(pmt,2), "balance_after": round(max(b-amort,0),2)})
        b -= amort
    return schedule


def _sim_sac(balance, n, r, av):
    sched = _sac_schedule(balance, n, r)
    total_int = sum(p["interest"] for p in sched)
    amort_per = balance/n if n else 0
    removed = min(int(av/amort_per) if amort_per else 0, n-1)
    removed = max(removed, 0)
    interest_saved = sum(p["interest"] for p in sched[-removed:]) if removed else 0
    new_n = n - removed
    new_sched = _sac_schedule(balance-av, new_n, r) if new_n > 0 else []
    return {"system":"SAC","description":"Amortização constante — parcela diminui com o tempo","installments_removed":removed,"new_remaining_installments":new_n,"total_interest_original":round(total_int,2),"total_interest_saved":round(interest_saved,2),"pct_interest_saved":round(interest_saved/total_int*100,1) if total_int else 0,"new_first_payment":round(new_sched[0]["total"],2) if new_sched else 0,"original_payment":round(sched[0]["total"],2) if sched else 0,"schedule_sample":sched[:8],"schedule_after_sample":new_sched[:8]}


def _sim_price(balance, n, r, av):
    sched = _price_schedule(balance, n, r)
    total_int = sum(p["interest"] for p in sched)
    pmt = balance*r/(1-(1+r)**(-n)) if r > 0 else balance/n
    new_balance = balance - av
    if new_balance <= 0:
        new_n = 0
        interest_saved = total_int
    else:
        ratio = new_balance * r / pmt if r > 0 else 0
        new_n = math.ceil(-math.log(1-ratio)/math.log(1+r)) if 0 < ratio < 1 else (0 if new_balance <= 0 else n)
        new_n = max(min(new_n, n-1), 0)
        removed = n - new_n
        interest_saved = sum(p["interest"] for p in sched[-removed:]) if removed else 0
    removed = n - new_n
    new_sched = _price_schedule(new_balance, new_n, r) if new_n > 0 else []
    return {"system":"Price","description":"Parcela fixa — prazo reduz ao amortizar","installments_removed":removed,"new_remaining_installments":new_n,"total_interest_original":round(total_int,2),"total_interest_saved":round(interest_saved,2),"pct_interest_saved":round(interest_saved/total_int*100,1) if total_int else 0,"new_first_payment":round(new_sched[0]["total"],2) if new_sched else round(pmt,2),"original_payment":round(pmt,2),"schedule_sample":sched[:8],"schedule_after_sample":new_sched[:8]}


@router.post("/installments/{id}/amortize/simulate")
def simulate_amortization(id: int, body: SimulateRequest, db: Session = Depends(get_db)):
    inst = db.query(Installment).filter(Installment.id == id).first()
    if not inst: raise HTTPException(404, "Dívida não encontrada")

    # ✅ Fix item 10: exclui transações [AMORT:] da contagem
    pending = (db.query(Transaction)
        .filter(Transaction.installment_id == id, Transaction.paid == False,
                ~Transaction.description.like(f"[AMORT:{id}]%"))
        .order_by(Transaction.date).all())

    if not pending: raise HTTPException(400, "Todas as parcelas já estão pagas")
    if body.amortization_value <= 0: raise HTTPException(400, "Valor deve ser maior que zero")

    balance = sum(p.amount for p in pending)
    n = len(pending)
    if body.amortization_value >= balance: raise HTTPException(400, f"Valor maior que o saldo devedor ({balance:.2f}).")
    r = body.monthly_rate / 100

    sac = _sim_sac(balance, n, r, body.amortization_value)
    price = _sim_price(balance, n, r, body.amortization_value)

    return {
        "installment_id": id, "description": inst.description, "debt_type": inst.debt_type,
        "current_balance": round(balance,2), "current_installments": n,
        "current_payment": round(pending[0].amount,2),
        "amortization_value": body.amortization_value, "monthly_rate": body.monthly_rate,
        "annual_rate": round(((1+body.monthly_rate/100)**12-1)*100,2),
        "sac": sac, "price": price,
        "recommendation": "sac" if sac["total_interest_saved"] >= price["total_interest_saved"] else "price",
    }


@router.post("/installments/{id}/amortize")
def register_amortization(id: int, body: AmortizeRequest, db: Session = Depends(get_db)):
    inst = db.query(Installment).filter(Installment.id == id).first()
    if not inst: raise HTTPException(404, "Dívida não encontrada")
    if body.installments_removed <= 0: raise HTTPException(400, "Deve ser maior que zero")
    if body.value_paid <= 0: raise HTTPException(400, "Valor deve ser maior que zero")

    # ✅ Fix item 10: exclui [AMORT:] da lista de pendentes
    pending = (db.query(Transaction)
        .filter(Transaction.installment_id == id, Transaction.paid == False,
                ~Transaction.description.like(f"[AMORT:{id}]%"))
        .order_by(Transaction.date.desc()).all())

    if not pending: raise HTTPException(400, "Não há parcelas pendentes")

    total_pending = len(pending)
    if body.installments_removed >= total_pending:
        raise HTTPException(400, f"Não pode amortizar todas as {total_pending} parcelas. Ao menos 1 deve ficar.")

    to_amortize = pending[:body.installments_removed]
    paid_date = date.fromisoformat(body.paid_date) if body.paid_date else date.today()
    value_per = round(body.value_paid / len(to_amortize), 2)

    for parcela in to_amortize:
        parcela.paid = True
        db.add(Transaction(
            description=f"[AMORT:{id}] {inst.description} (parcela {parcela.installment_number})",
            amount=value_per,
            type="expense",
            date=parcela.date,
            category_id=parcela.category_id,
            account_id=body.account_id,
            installment_id=inst.id,
            paid=True,
        ))

    db.commit()

    remaining = (db.query(Transaction)
        .filter(Transaction.installment_id == id, Transaction.paid == False,
                ~Transaction.description.like(f"[AMORT:{id}]%"))
        .count())

    return {
        "ok": True, "installments_amortized": len(to_amortize),
        "value_paid": body.value_paid, "remaining_pending_installments": remaining,
        "message": f"✅ {len(to_amortize)} parcela(s) quitada(s). {remaining} ainda pendente(s).",
    }


@router.get("/installments/{id}/amortize/history")
def amortization_history(id: int, db: Session = Depends(get_db)):
    txs = (db.query(Transaction)
        .filter(Transaction.installment_id == id, Transaction.description.like(f"[AMORT:{id}]%"))
        .order_by(Transaction.date.desc()).all())
    return [{"id":t.id,"description":t.description,"amount":t.amount,"date":str(t.date),"account_id":t.account_id} for t in txs]