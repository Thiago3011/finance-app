from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

from app.database import get_db
from app.models.category import Category

router = APIRouter()


class CategoryCreate(BaseModel):
    name: str
    type: str  # "income" ou "expense"


class CategoryResponse(BaseModel):
    id: int
    name: str
    type: str

    class Config:
        from_attributes = True


@router.get("/categories", response_model=List[CategoryResponse])
def list_categories(db: Session = Depends(get_db)):
    return db.query(Category).order_by(Category.type, Category.name).all()


@router.post("/categories", response_model=CategoryResponse)
def create_category(data: CategoryCreate, db: Session = Depends(get_db)):
    cat = Category(name=data.name, type=data.type)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


@router.put("/categories/{id}", response_model=CategoryResponse)
def update_category(id: int, data: CategoryCreate, db: Session = Depends(get_db)):
    cat = db.query(Category).filter(Category.id == id).first()
    if not cat:
        raise HTTPException(404, "Categoria não encontrada")
    cat.name = data.name
    cat.type = data.type
    db.commit()
    db.refresh(cat)
    return cat


@router.delete("/categories/{id}")
def delete_category(id: int, db: Session = Depends(get_db)):
    cat = db.query(Category).filter(Category.id == id).first()
    if not cat:
        raise HTTPException(404, "Categoria não encontrada")
    db.delete(cat)
    db.commit()
    return {"ok": True}