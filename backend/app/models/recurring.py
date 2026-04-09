from sqlalchemy import Column, Integer, Float, String, Boolean
from app.database import Base


class Recurring(Base):
    __tablename__ = "recurring"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    due_day = Column(Integer, nullable=True, default=None)  # nullable — variáveis não têm vencimento
    category_id = Column(Integer, nullable=True)
    icon = Column(String, default="📄")
    active = Column(Boolean, default=True)
    is_variable = Column(Boolean, default=False)  # valor muda todo mês