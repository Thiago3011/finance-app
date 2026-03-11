from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.transaction import Transaction
from app.schemas.transaction import TransactionCreate, TransactionResponse, TransactionSummary

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