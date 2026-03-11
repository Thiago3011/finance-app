from typing import List
from collections import defaultdict
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.transaction import Transaction
from app.schemas.transaction import TransactionCreate, TransactionResponse, TransactionSummary, MonthlySummary

router = APIRouter()

@router.post("/transactions")
def create_transaction(transaction: TransactionCreate, db: Session = Depends(get_db)):
    
    db_transaction = Transaction(
        type=transaction.type,
        amount=transaction.amount,
        description=transaction.description,
        date=transaction.date
    )

    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)

    return db_transaction

@router.get("/transactions", response_model=List[TransactionResponse])
def list_transactions(db: Session = Depends(get_db)):

    transactions = db.query(Transaction).all()

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

@router.delete("/transactions/{transaction_id}")
def delete_transaction(
    transaction_id: int,
    db: Session = Depends(get_db)
):

    transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()

    if not transaction:
        return {"error": "Transaction not found"}

    db.delete(transaction)
    db.commit()

    return {"message": "Transaction deleted"}

@router.get("/transactions/monthly", response_model=list[MonthlySummary])
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