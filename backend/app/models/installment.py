from sqlalchemy import Column, Integer, Float, String, DateTime
from datetime import datetime
from app.database import Base


class Installment(Base):
    __tablename__ = "installments"

    id = Column(Integer, primary_key=True, index=True)
    description = Column(String, nullable=False)
    total_amount = Column(Float, nullable=False)
    total_installments = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Tipo: "parcelamento", "financiamento", "emprestimo"
    debt_type = Column(String, default="parcelamento", nullable=False)