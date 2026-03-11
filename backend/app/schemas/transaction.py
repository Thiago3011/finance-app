from pydantic import BaseModel
from datetime import date

class TransactionCreate(BaseModel):
    type: str
    amount: float
    description: str
    date: date

class TransactionResponse(BaseModel):
    id: int
    type: str
    amount: float
    description: str
    date: date

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