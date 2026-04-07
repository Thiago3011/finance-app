from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import date

from app.database import get_db
from app.models.recurring import Recurring

router = APIRouter(prefix="/recurring", tags=["Recurring"])


class RecurringCreate(BaseModel):
    name: str
    amount: float
    due_day: int
    category_id: Optional[int] = None
    icon: str = "📄"
    active: bool = True


class RecurringResponse(BaseModel):
    id: int
    name: str
    amount: float
    due_day: int
    category_id: Optional[int] = None
    icon: str
    active: bool

    class Config:
        from_attributes = True


@router.get("/", response_model=List[RecurringResponse])
def list_recurring(db: Session = Depends(get_db)):
    return db.query(Recurring).order_by(Recurring.due_day).all()


@router.post("/", response_model=RecurringResponse)
def create_recurring(data: RecurringCreate, db: Session = Depends(get_db)):
    if not 1 <= data.due_day <= 31:
        raise HTTPException(400, "Dia de vencimento deve ser entre 1 e 31")
    item = Recurring(**data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/{id}", response_model=RecurringResponse)
def update_recurring(id: int, data: RecurringCreate, db: Session = Depends(get_db)):
    item = db.query(Recurring).filter(Recurring.id == id).first()
    if not item:
        raise HTTPException(404, "Não encontrado")
    for k, v in data.model_dump().items():
        setattr(item, k, v)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{id}")
def delete_recurring(id: int, db: Session = Depends(get_db)):
    item = db.query(Recurring).filter(Recurring.id == id).first()
    if not item:
        raise HTTPException(404, "Não encontrado")
    db.delete(item)
    db.commit()
    return {"ok": True}