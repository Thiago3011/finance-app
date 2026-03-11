from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.transaction import Transaction
from app.schemas.transaction import TransactionCreate, TransactionResponse

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