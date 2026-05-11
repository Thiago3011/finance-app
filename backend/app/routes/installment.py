from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import date

from app.database import get_db
from app.schemas.installment import InstallmentCreate, InstallmentResponse
from app.services.installment_service import create_installment, create_installment_custom
from app.models.installment import Installment
from app.models.transaction import Transaction

router = APIRouter(prefix="/installments", tags=["Installments"])


class InstallmentUpdate(BaseModel):
    description: str
    debt_type: str
    total_amount: float
    category_id: Optional[int] = None
    account_id: Optional[int] = None


class CustomInstallmentItem(BaseModel):
    amount: float
    date: str


class InstallmentCreateCustom(BaseModel):
    description: str
    debt_type: str = "parcelamento"
    category_id: int
    account_id: int
    installments: List[CustomInstallmentItem]
    # ✅ Fix item 3: total_amount pode ser passado explicitamente
    total_amount_override: Optional[float] = None


@router.post("/", response_model=InstallmentResponse)
def create(data: InstallmentCreate, db: Session = Depends(get_db)):
    return create_installment(db, data)


@router.post("/custom", response_model=InstallmentResponse)
def create_custom(data: InstallmentCreateCustom, db: Session = Depends(get_db)):
    return create_installment_custom(db, data)


@router.get("/", response_model=List[InstallmentResponse])
def list_installments(db: Session = Depends(get_db)):
    return db.query(Installment).all()


@router.put("/{id}")
def update_installment(id: int, data: InstallmentUpdate, db: Session = Depends(get_db)):
    inst = db.query(Installment).filter(Installment.id == id).first()
    if not inst:
        raise HTTPException(404, "Não encontrado")

    inst.description = data.description
    inst.debt_type = data.debt_type
    inst.total_amount = data.total_amount

    # Atualiza categoria e conta em todas as parcelas
    parcelas = db.query(Transaction).filter(Transaction.installment_id == id).order_by(Transaction.installment_number).all()
    total = len(parcelas)
    for p in parcelas:
        if data.category_id is not None:
            p.category_id = data.category_id
        if data.account_id is not None:
            p.account_id = data.account_id
        n = p.installment_number or 0
        p.description = f"{data.description} ({n}/{total})"

    db.commit()
    return {"ok": True}


@router.delete("/{id}")
def delete_installment(id: int, db: Session = Depends(get_db)):
    inst = db.query(Installment).filter(Installment.id == id).first()
    if not inst:
        raise HTTPException(404, "Não encontrado")
    db.query(Transaction).filter(Transaction.installment_id == id).delete()
    db.delete(inst)
    db.commit()
    return {"ok": True}


@router.get("/summary")
def installments_summary(db: Session = Depends(get_db)):
    installments = db.query(Installment).all()
    result = []

    for inst in installments:
        parcelas = (
            db.query(Transaction)
            .filter(Transaction.installment_id == inst.id)
            .order_by(Transaction.date)
            .all()
        )
        if not parcelas:
            continue

        # ✅ Fix item 10: conta apenas parcelas originais (não amortizações [AMORT:])
        original = [p for p in parcelas if not p.description.startswith(f"[AMORT:{inst.id}]")]
        amort_txs = [p for p in parcelas if p.description.startswith(f"[AMORT:{inst.id}]")]

        total = len(original)
        pagas = sum(1 for p in original if p.paid)
        total_pago = sum(p.amount for p in original if p.paid)
        total_pago += sum(p.amount for p in amort_txs)  # soma amortizações no pago
        total_restante = sum(p.amount for p in original if not p.paid)
        proxima = next((p for p in original if not p.paid), None)
        valor_parcela = next((p.amount for p in original), 0)

        cat_id = original[0].category_id if original else None
        acc_id = original[0].account_id if original else None
        start = str(original[0].date) if original else None

        result.append({
            "id": inst.id,
            "description": inst.description,
            "debt_type": inst.debt_type,
            "total_amount": inst.total_amount,
            "total_installments": total,
            "paid_installments": pagas,
            "pending_installments": total - pagas,
            "value_per_installment": valor_parcela,
            "total_paid": total_pago,
            "total_remaining": total_restante,
            "next_due_date": str(proxima.date) if proxima else None,
            "next_installment_number": proxima.installment_number if proxima else None,
            "progress_percent": round((pagas / total) * 100, 1) if total > 0 else 0,
            "category_id": cat_id,
            "account_id": acc_id,
            "start_date": start,
        })

    return result


@router.get("/{id}/real-balance")
def real_balance(id: int, monthly_rate: float, db: Session = Depends(get_db)):
    """
    Calcula o saldo devedor REAL (valor à vista para quitar hoje)
    usando o desconto a valor presente das parcelas pendentes.
    monthly_rate: taxa mensal em % (ex: 1.5)
    """
    import math

    inst = db.query(Installment).filter(Installment.id == id).first()
    if not inst:
        raise HTTPException(404, "Dívida não encontrada")

    pending = (
        db.query(Transaction)
        .filter(
            Transaction.installment_id == id,
            Transaction.paid == False,
            ~Transaction.description.like(f"[AMORT:{id}]%")
        )
        .order_by(Transaction.date)
        .all()
    )

    if not pending:
        return {"real_balance": 0, "total_balance": 0, "installments": 0, "monthly_rate": monthly_rate}

    r = monthly_rate / 100
    today = date.today()
    total_balance = sum(p.amount for p in pending)

    if r == 0:
        real = total_balance
    else:
        # Valor presente de cada parcela futura
        real = 0
        for p in pending:
            days = (p.date - today).days
            months = max(days / 30.44, 0)
            real += p.amount / ((1 + r) ** months)

    return {
        "real_balance": round(real, 2),
        "total_balance": round(total_balance, 2),
        "installments": len(pending),
        "monthly_rate": monthly_rate,
        "discount": round(total_balance - real, 2),
        "discount_pct": round((total_balance - real) / total_balance * 100, 1) if total_balance > 0 else 0,
    }