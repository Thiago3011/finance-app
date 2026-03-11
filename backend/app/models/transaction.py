from sqlalchemy import Column, Integer, Float, String, Date
from app.database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String)
    amount = Column(Float)
    description = Column(String)
    date = Column(Date)