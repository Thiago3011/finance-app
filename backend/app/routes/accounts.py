from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

from app.database import get_db
from app.models.account import Account

router = APIRouter()


class AccountSchema(BaseModel):
    name: str


class AccountResponse(AccountSchema):
    id: int

    class Config:
        from_attributes = True


@router.get("/accounts", response_model=List[AccountResponse])
def list_accounts(db: Session = Depends(get_db)):
    return db.query(Account).order_by(Account.name).all()


@router.post("/accounts", response_model=AccountResponse)
def create_account(data: AccountSchema, db: Session = Depends(get_db)):
    acc = Account(name=data.name)
    db.add(acc)
    db.commit()
    db.refresh(acc)
    return acc


@router.put("/accounts/{id}", response_model=AccountResponse)
def update_account(id: int, data: AccountSchema, db: Session = Depends(get_db)):
    acc = db.query(Account).filter(Account.id == id).first()
    if not acc:
        raise HTTPException(404, "Conta não encontrada")
    acc.name = data.name
    db.commit()
    db.refresh(acc)
    return acc


@router.delete("/accounts/{id}")
def delete_account(id: int, db: Session = Depends(get_db)):
    acc = db.query(Account).filter(Account.id == id).first()
    if not acc:
        raise HTTPException(404, "Conta não encontrada")
    db.delete(acc)
    db.commit()
    return {"ok": True}