from fastapi import APIRouter
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.transaction import Transaction
from app.schemas.transaction import TransactionCreate

router = APIRouter()

@router.post("/transactions")
def create_transaction(transaction: TransactionCreate):
    db: Session = SessionLocal()

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