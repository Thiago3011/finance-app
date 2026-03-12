from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.account import Account

router = APIRouter()

@router.post("/accounts")
def create_account(name: str, db: Session = Depends(get_db)):
    account = Account(name=name)
    db.add(account)
    db.commit()
    db.refresh(account)
    return account

@router.get("/accounts")
def list_accounts(db: Session = Depends(get_db)):
    return db.query(Account).all()