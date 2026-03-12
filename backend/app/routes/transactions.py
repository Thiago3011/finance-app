from typing import List, Optional
from collections import defaultdict
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

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


# -----------------------------
# CREATE TRANSACTION
# -----------------------------
@router.post("/transactions", response_model=TransactionResponse)
def create_transaction(transaction: TransactionCreate, db: Session = Depends(get_db)):

    db_transaction = Transaction(
        type=transaction.type,
        amount=transaction.amount,
        description=transaction.description,
        date=transaction.date,
        category_id=transaction.category_id,
        account_id=transaction.account_id
    )

    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)

    return db_transaction


# -----------------------------
# LIST TRANSACTIONS (with filters)
# -----------------------------
@router.get("/transactions", response_model=List[TransactionResponse])
def list_transactions(
    db: Session = Depends(get_db),
    type: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None)
):

    query = db.query(Transaction)

    if type:
        query = query.filter(Transaction.type == type)

    if start_date:
        query = query.filter(Transaction.date >= start_date)

    if end_date:
        query = query.filter(Transaction.date <= end_date)

    return query.all()


# -----------------------------
# SUMMARY
# -----------------------------
@router.get("/transactions/summary", response_model=TransactionSummary)
def get_summary(db: Session = Depends(get_db)):

    transactions = db.query(Transaction).all()

    total_income = 0
    total_expense = 0

    for t in transactions:
        if t.type == "income":
            total_income += t.amount
        elif t.type == "expense":
            total_expense += t.amount

    balance = total_income - total_expense

    return {
        "total_income": total_income,
        "total_expense": total_expense,
        "balance": balance
    }


# -----------------------------
# CATEGORY SUMMARY
# -----------------------------
@router.get("/transactions/by-category")
def summary_by_category(db: Session = Depends(get_db)):

    results = (
        db.query(
            Category.name,
            func.sum(Transaction.amount).label("total")
        )
        .join(Transaction, Transaction.category_id == Category.id)
        .filter(Transaction.type == "expense")
        .group_by(Category.name)
        .all()
    )

    return [
        {"category": name, "total": total}
        for name, total in results
    ]


# -----------------------------
# MONTHLY SUMMARY (python version)
# -----------------------------
@router.get("/transactions/monthly", response_model=List[MonthlySummary])
def monthly_summary(db: Session = Depends(get_db)):

    transactions = db.query(Transaction).all()

    monthly_data = defaultdict(lambda: {"income": 0, "expense": 0})

    for t in transactions:

        month = t.date.strftime("%Y-%m")

        if t.type == "income":
            monthly_data[month]["income"] += t.amount
        else:
            monthly_data[month]["expense"] += t.amount

    result = []

    for month, data in monthly_data.items():

        result.append({
            "month": month,
            "income": data["income"],
            "expense": data["expense"]
        })

    return result


# -----------------------------
# DELETE
# -----------------------------
@router.delete("/transactions/{transaction_id}")
def delete_transaction(transaction_id: int, db: Session = Depends(get_db)):

    transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()

    if not transaction:
        return {"error": "Transaction not found"}

    db.delete(transaction)
    db.commit()

    return {"message": "Transaction deleted"}


# -----------------------------
# MONTHLY SUMMARY (SQL optimized)
# -----------------------------
@router.get("/monthly-summary")
def get_monthly_summary(db: Session = Depends(get_db)):

    results = (
        db.query(
            func.strftime("%Y-%m", Transaction.date).label("month"),
            Category.type,
            func.sum(Transaction.amount).label("total")
        )
        .join(Category, Transaction.category_id == Category.id)
        .group_by("month", Category.type)
        .order_by("month")
        .all()
    )

    summary = {}

    for month, type_, total in results:

        if month not in summary:
            summary[month] = {
                "month": month,
                "income": 0,
                "expense": 0
            }

        summary[month][type_] = total

    response = []

    for month in summary:
        income = summary[month]["income"]
        expense = summary[month]["expense"]

        response.append({
            "month": month,
            "income": income,
            "expense": expense,
            "balance": income - expense
        })

    return response