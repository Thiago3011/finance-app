from pydantic import BaseModel
from datetime import date


class TransactionBase(BaseModel):
    type: str
    amount: float
    description: str
    date: date
    category_id: int | None = None
    account_id: int | None = None

class TransactionCreate(TransactionBase):
    pass


class TransactionResponse(TransactionBase):
    id: int

    class Config:
        from_attributes = True


class TransactionSummary(BaseModel):
    total_income: float
    total_expense: float
    balance: float


class MonthlySummary(BaseModel):
    month: str
    income: float
    expense: float