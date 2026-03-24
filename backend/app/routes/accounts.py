from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.account import Account

router = APIRouter()


class AccountCreate:
    def __init__(self, name: str):
        self.name = name


from pydantic import BaseModel

class AccountSchema(BaseModel):
    name: str

class AccountResponse(AccountSchema):
    id: int
    class Config:
        from_attributes = True


@router.post("/accounts", response_model=AccountResponse)
def create_account(account: AccountSchema, db: Session = Depends(get_db)):
    db_account = Account(name=account.name)
    db.add(db_account)
    db.commit()
    db.refresh(db_account)
    return db_account


@router.get("/accounts", response_model=List[AccountResponse])
def list_accounts(db: Session = Depends(get_db)):
    return db.query(Account).all()
