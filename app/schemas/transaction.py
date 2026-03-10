from pydantic import BaseModel
from datetime import date

class TransactionCreate(BaseModel):
    type: str
    amount: float
    description: str
    date: date