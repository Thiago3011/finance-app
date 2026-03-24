from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.schemas.installment import InstallmentCreate, InstallmentResponse
from app.services.installment_service import create_installment
from app.models.installment import Installment

router = APIRouter(prefix="/installments", tags=["Installments"])


@router.post("/", response_model=InstallmentResponse)
def create(data: InstallmentCreate, db: Session = Depends(get_db)):
    return create_installment(db, data)


@router.get("/", response_model=List[InstallmentResponse])
def list_installments(db: Session = Depends(get_db)):
    return db.query(Installment).all()