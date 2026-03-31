from typing import List, Optional
from collections import defaultdict
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel as PydanticBase

from app.database import get_db
from app.models.transaction import Transaction
from app.models.category import Category
from app.schemas.transaction import (
    TransactionCreate,
    TransactionResponse,
    TransactionSummary,
    MonthlySummary
)

router = APIRouter()


# CREATE — despesas normais já entram como pagas
@router.post("/transactions", response_model=TransactionResponse)
def create_transaction(transaction: TransactionCreate, db: Session = Depends(get_db)):
    db_transaction = Transaction(
        type=transaction.type,
        amount=transaction.amount,
        description=transaction.description,
        date=transaction.date,
        category_id=transaction.category_id,
        account_id=transaction.account_id,
        paid=True  # transações normais sempre pagas
    )
    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)
    return db_transaction


# LIST — com filtros de período, ano e mês
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


# SUMMARY — parcelas só contam se pagas; normais sempre contam
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

    for t in transactions:
        if t.type == "income":
            total_income += t.amount
        elif t.type == "expense" and t.paid:
            total_expense += t.amount

    return {
        "total_income": total_income,
        "total_expense": total_expense,
        "balance": total_income - total_expense
    }


# CATEGORY SUMMARY — com filtros
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


# MONTHLY SUMMARY — com filtro de ano
@router.get("/monthly-summary")
def get_monthly_summary(
    db: Session = Depends(get_db),
    year: Optional[int] = Query(None),
):
    query = db.query(
        func.strftime("%Y-%m", Transaction.date).label("month"),
        Category.type,
        func.sum(Transaction.amount).label("total")
    ).join(Category, Transaction.category_id == Category.id)

    if year:
        query = query.filter(func.strftime("%Y", Transaction.date) == str(year))

    results = query.group_by("month", Category.type).order_by("month").all()

    summary = {}
    for month, type_, total in results:
        if month not in summary:
            summary[month] = {"month": month, "income": 0, "expense": 0}
        summary[month][type_] = total

    response = []
    for m in summary:
        inc = summary[m]["income"]
        exp = summary[m]["expense"]
        response.append({"month": m, "income": inc, "expense": exp, "balance": inc - exp})
    return response


# DELETE
@router.delete("/transactions/{transaction_id}")
def delete_transaction(transaction_id: int, db: Session = Depends(get_db)):
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not transaction:
        return {"error": "Transaction not found"}
    db.delete(transaction)
    db.commit()
    return {"message": "Transaction deleted"}


# PATCH PAID — apenas para parcelas
class PaidUpdate(PydanticBase):
    paid: bool

@router.patch("/transactions/{transaction_id}/paid")
def update_paid(transaction_id: int, body: PaidUpdate, db: Session = Depends(get_db)):
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not transaction:
        return {"error": "Transaction not found"}
    if transaction.installment_id is None:
        return {"error": "Apenas parcelas podem ter o status alterado"}
    transaction.paid = body.paid
    db.commit()
    db.refresh(transaction)
    return {"id": transaction.id, "paid": transaction.paid}