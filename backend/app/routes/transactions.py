from typing import List, Optional
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel as PydanticBase

from app.database import get_db
from app.models.transaction import Transaction
from app.models.category import Category
from app.models.account import Account
from app.models.installment import Installment
from app.schemas.transaction import (
    TransactionCreate,
    TransactionSummary,
    MonthlySummary
)

router = APIRouter()


# Response schema enriquecido com debt_type
from pydantic import BaseModel as PM
class TransactionOut(PM):
    id: int
    type: str
    amount: float
    description: str
    date: date
    category_id: Optional[int] = None
    account_id: Optional[int] = None
    paid: bool = False
    installment_id: Optional[int] = None
    installment_number: Optional[int] = None
    debt_type: Optional[str] = None  # vem do join com installments

    class Config:
        from_attributes = True


def enrich(transactions: list, db: Session) -> list:
    """Adiciona debt_type em transações que têm installment_id"""
    ids = list({t.installment_id for t in transactions if t.installment_id})
    if not ids:
        return [_to_dict(t, None) for t in transactions]
    rows = db.query(Installment).filter(Installment.id.in_(ids)).all()
    debt_map = {r.id: r.debt_type for r in rows}
    return [_to_dict(t, debt_map.get(t.installment_id)) for t in transactions]


def _to_dict(t, debt_type):
    return {
        "id": t.id,
        "type": t.type,
        "amount": t.amount,
        "description": t.description,
        "date": str(t.date),
        "category_id": t.category_id,
        "account_id": t.account_id,
        "paid": t.paid,
        "installment_id": t.installment_id,
        "installment_number": t.installment_number,
        "debt_type": debt_type,
    }


@router.post("/transactions")
def create_transaction(transaction: TransactionCreate, db: Session = Depends(get_db)):
    db_transaction = Transaction(
        type=transaction.type,
        amount=transaction.amount,
        description=transaction.description,
        date=transaction.date,
        category_id=transaction.category_id,
        account_id=transaction.account_id,
        paid=True
    )
    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)
    return _to_dict(db_transaction, None)


@router.get("/transactions")
def list_transactions(
    db: Session = Depends(get_db),
    type: Optional[str] = Query(None),
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
):
    query = db.query(Transaction)
    if type:
        query = query.filter(Transaction.type == type)
    if year:
        query = query.filter(func.strftime("%Y", Transaction.date) == str(year))
    if month:
        query = query.filter(func.strftime("%m", Transaction.date) == f"{month:02d}")
    txs = query.order_by(Transaction.date.desc()).all()
    return enrich(txs, db)


@router.get("/transactions/summary", response_model=TransactionSummary)
def get_summary(
    db: Session = Depends(get_db),
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
):
    query = db.query(Transaction)
    if year:
        query = query.filter(func.strftime("%Y", Transaction.date) == str(year))
    if month:
        query = query.filter(func.strftime("%m", Transaction.date) == f"{month:02d}")

    transactions = query.all()
    total_income = 0
    total_expense = 0
    total_pending = 0

    for t in transactions:
        if t.type == "income":
            total_income += t.amount
        elif t.type == "expense":
            if t.paid:
                total_expense += t.amount
            else:
                total_pending += t.amount

    return {
        "total_income": total_income,
        "total_expense": total_expense,
        "total_pending": total_pending,
        "balance": total_income - total_expense
    }


@router.get("/transactions/by-category")
def summary_by_category(
    db: Session = Depends(get_db),
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
):
    query = (
        db.query(Category.name, func.sum(Transaction.amount).label("total"))
        .join(Transaction, Transaction.category_id == Category.id)
        .filter(Transaction.type == "expense")
    )
    if year:
        query = query.filter(func.strftime("%Y", Transaction.date) == str(year))
    if month:
        query = query.filter(func.strftime("%m", Transaction.date) == f"{month:02d}")

    results = query.group_by(Category.name).all()
    return [{"category": name, "total": total} for name, total in results]


@router.get("/monthly-summary")
def get_monthly_summary(
    db: Session = Depends(get_db),
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
):
    query = db.query(
        func.strftime("%Y-%m", Transaction.date).label("month"),
        Transaction.type,
        func.sum(Transaction.amount).label("total")
    )
    if year:
        query = query.filter(func.strftime("%Y", Transaction.date) == str(year))
    if month:
        query = query.filter(func.strftime("%m", Transaction.date) == f"{month:02d}")

    results = query.group_by("month", Transaction.type).order_by("month").all()

    summary: dict = {}
    for m, type_, total in results:
        if m not in summary:
            summary[m] = {"month": m, "income": 0, "expense": 0}
        if type_ in ("income", "expense"):
            summary[m][type_] = total

    return [{"month": m, "income": d["income"], "expense": d["expense"], "balance": d["income"] - d["expense"]}
            for m, d in summary.items()]


@router.get("/transactions/by-account")
def summary_by_account(
    db: Session = Depends(get_db),
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
):
    query = (
        db.query(Account.name, Transaction.type, func.sum(Transaction.amount).label("total"))
        .join(Transaction, Transaction.account_id == Account.id)
    )
    if year:
        query = query.filter(func.strftime("%Y", Transaction.date) == str(year))
    if month:
        query = query.filter(func.strftime("%m", Transaction.date) == f"{month:02d}")

    results = query.group_by(Account.name, Transaction.type).all()
    accounts: dict = {}
    for acc_name, type_, total in results:
        if acc_name not in accounts:
            accounts[acc_name] = {"name": acc_name, "income": 0, "expense": 0}
        if type_ in ("income", "expense"):
            accounts[acc_name][type_] = total

    return sorted(
        [{"name": a["name"], "income": a["income"], "expense": a["expense"], "balance": a["income"] - a["expense"]}
         for a in accounts.values()],
        key=lambda x: x["expense"], reverse=True
    )


@router.delete("/transactions/{transaction_id}")
def delete_transaction(transaction_id: int, db: Session = Depends(get_db)):
    t = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not t:
        return {"error": "Not found"}
    db.delete(t)
    db.commit()
    return {"ok": True}


class PaidUpdate(PydanticBase):
    paid: bool

@router.patch("/transactions/{transaction_id}/paid")
def update_paid(transaction_id: int, body: PaidUpdate, db: Session = Depends(get_db)):
    t = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not t:
        return {"error": "Not found"}
    if t.installment_id is None and not (t.description or "").startswith("[FIXA:"):
        return {"error": "Apenas parcelas e fixas podem ter status alterado"}
    t.paid = body.paid
    db.commit()
    return {"id": t.id, "paid": t.paid}


class AmountUpdate(PydanticBase):
    amount: float

@router.patch("/transactions/{transaction_id}/amount")
def update_amount(transaction_id: int, body: AmountUpdate, db: Session = Depends(get_db)):
    t = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not t:
        return {"error": "Not found"}
    if body.amount <= 0:
        return {"error": "Valor deve ser maior que zero"}
    t.amount = body.amount
    db.commit()
    return {"id": t.id, "amount": t.amount}