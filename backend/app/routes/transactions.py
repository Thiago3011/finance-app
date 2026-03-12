from typing import List, Optional
from collections import defaultdict
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


@router.post("/transactions", response_model=TransactionResponse)
def create_transaction(transaction: TransactionCreate, db: Session = Depends(get_db)):

    db_transaction = Transaction(
        type=transaction.type,
        amount=transaction.amount,
        description=transaction.description,
        date=transaction.date,
        category_id=transaction.category_id
    )

    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)

    return db_transaction


@router.get("/transactions", response_model=List[TransactionResponse])
def list_transactions(
    db: Session = Depends(get_db),
    type: Optional[str] = Query(None)
):

    query = db.query(Transaction)

    if type:
        query = query.filter(Transaction.type == type)

    transactions = query.all()

    return transactions


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


@router.delete("/transactions/{transaction_id}")
def delete_transaction(transaction_id: int, db: Session = Depends(get_db)):

    transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()

    if not transaction:
        return {"error": "Transaction not found"}

    db.delete(transaction)
    db.commit()

    return {"message": "Transaction deleted"}