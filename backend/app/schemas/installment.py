from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class InstallmentCreate(BaseModel):
    description: str
    total_amount: float
    total_installments: int
    start_date: str
    category_id: int
    account_id: int


class InstallmentResponse(BaseModel):
    id: int
    description: str
    total_amount: float
    total_installments: int
    created_at: datetime  # 👈 era "date", agora é "datetime"

    class Config:
        from_attributes = True