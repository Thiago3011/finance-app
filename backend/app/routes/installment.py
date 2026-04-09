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


# ── Schema para edição ────────────────────────────────────────────────────────
class InstallmentUpdate(BaseModel):
    description: str
    debt_type: str
    total_amount: float


# ── Schema para parcelas personalizadas ──────────────────────────────────────
class CustomInstallmentItem(BaseModel):
    amount: float
    date: str


class InstallmentCreateCustom(BaseModel):
    description: str
    debt_type: str = "parcelamento"
    category_id: int
    account_id: int
    installments: List[CustomInstallmentItem]


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
    db.commit()
    db.refresh(inst)
    return {"ok": True}


@router.delete("/{id}")
def delete_installment(id: int, db: Session = Depends(get_db)):
    inst = db.query(Installment).filter(Installment.id == id).first()
    if not inst:
        raise HTTPException(404, "Não encontrado")
    # remove parcelas associadas
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

        total = len(parcelas)
        pagas = sum(1 for p in parcelas if p.paid)
        valor_parcela = parcelas[0].amount if parcelas else 0
        total_pago = sum(p.amount for p in parcelas if p.paid)
        total_restante = sum(p.amount for p in parcelas if not p.paid)
        proxima = next((p for p in parcelas if not p.paid), None)

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
        })

    return result