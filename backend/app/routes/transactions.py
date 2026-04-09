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
from app.schemas.transaction import (
    TransactionCreate,
    TransactionResponse,
    TransactionSummary,
    MonthlySummary
)

router = APIRouter()


@router.post("/transactions", response_model=TransactionResponse)
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
    return db_transaction


@router.get("/transactions", response_model=List[TransactionResponse])
def list_transactions(
    db: Session = Depends(get_db),
    type: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
):
    query = db.query(Transaction)
    if type:
        query = query.filter(Transaction.type == type)
    if start_date:
        query = query.filter(Transaction.date >= start_date)
    if end_date:
        query = query.filter(Transaction.date <= end_date)
    if year:
        query = query.filter(func.strftime("%Y", Transaction.date) == str(year))
    if month:
        query = query.filter(func.strftime("%m", Transaction.date) == f"{month:02d}")
    return query.order_by(Transaction.date.desc()).all()


@router.get("/transactions/summary", response_model=TransactionSummary)
def get_summary(
    db: Session = Depends(get_db),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
):
    query = db.query(Transaction)
    if start_date:
        query = query.filter(Transaction.date >= start_date)
    if end_date:
        query = query.filter(Transaction.date <= end_date)
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
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
):
    query = (
        db.query(Category.name, func.sum(Transaction.amount).label("total"))
        .join(Transaction, Transaction.category_id == Category.id)
        .filter(Transaction.type == "expense")
    )
    if start_date:
        query = query.filter(Transaction.date >= start_date)
    if end_date:
        query = query.filter(Transaction.date <= end_date)
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

    response = []
    for m in summary:
        inc = summary[m]["income"]
        exp = summary[m]["expense"]
        response.append({"month": m, "income": inc, "expense": exp, "balance": inc - exp})
    return response


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

    response = []
    for a in accounts.values():
        response.append({"name": a["name"], "income": a["income"], "expense": a["expense"], "balance": a["income"] - a["expense"]})
    return sorted(response, key=lambda x: x["expense"], reverse=True)


@router.delete("/transactions/{transaction_id}")
def delete_transaction(transaction_id: int, db: Session = Depends(get_db)):
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not transaction:
        return {"error": "Transaction not found"}
    db.delete(transaction)
    db.commit()
    return {"message": "Transaction deleted"}


# ── PATCH paid (parcelas) ────────────────────────────────────────────────────
class PaidUpdate(PydanticBase):
    paid: bool

@router.patch("/transactions/{transaction_id}/paid")
def update_paid(transaction_id: int, body: PaidUpdate, db: Session = Depends(get_db)):
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not transaction:
        return {"error": "Transaction not found"}
    if transaction.installment_id is None and not transaction.description.startswith("[FIXA]"):
        return {"error": "Apenas parcelas e fixas podem ter o status alterado"}
    transaction.paid = body.paid
    db.commit()
    db.refresh(transaction)
    return {"id": transaction.id, "paid": transaction.paid}


# ── PATCH amount — editar valor pago (juros, diferença) ──────────────────────
class AmountUpdate(PydanticBase):
    amount: float

@router.patch("/transactions/{transaction_id}/amount")
def update_amount(transaction_id: int, body: AmountUpdate, db: Session = Depends(get_db)):
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not transaction:
        return {"error": "Transaction not found"}
    if body.amount <= 0:
        return {"error": "Valor deve ser maior que zero"}
    transaction.amount = body.amount
    db.commit()
    db.refresh(transaction)
    return {"id": transaction.id, "amount": transaction.amount}