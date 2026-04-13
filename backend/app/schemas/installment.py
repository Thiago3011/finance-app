from pydantic import BaseModel
from datetime import datetime
from typing import Optional


# Tipos válidos de dívida
# parcelamento | financiamento | emprestimo_pessoal | emprestimo_consignado
DEBT_TYPES = ["parcelamento", "financiamento", "emprestimo_pessoal", "emprestimo_consignado"]


class InstallmentCreate(BaseModel):
    description: str
    total_amount: float
    total_installments: int
    start_date: str
    category_id: int
    account_id: int
    debt_type: str = "parcelamento"


class InstallmentResponse(BaseModel):
    id: int
    description: str
    total_amount: float
    total_installments: int
    created_at: datetime
    debt_type: str

    class Config:
        from_attributes = True