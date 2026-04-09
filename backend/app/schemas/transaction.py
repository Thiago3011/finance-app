from pydantic import BaseModel
from datetime import date
from typing import Optional


class TransactionBase(BaseModel):
    type: str
    amount: float
    description: str
    date: date
    category_id: Optional[int] = None
    account_id: Optional[int] = None


class TransactionCreate(TransactionBase):
    pass


class TransactionResponse(TransactionBase):
    id: int
    paid: bool = False
    installment_id: Optional[int] = None
    installment_number: Optional[int] = None

    class Config:
        from_attributes = True


class TransactionSummary(BaseModel):
    total_income: float
    total_expense: float
    total_pending: float
    balance: float


class MonthlySummary(BaseModel):
    month: str
    income: float
    expense: float