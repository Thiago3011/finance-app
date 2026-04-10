from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import date
import calendar

from app.database import get_db
from app.models.recurring import Recurring

router = APIRouter(prefix="/recurring", tags=["Recurring"])


class RecurringCreate(BaseModel):
    name: str
    amount: float
    due_day: Optional[int] = None
    category_id: Optional[int] = None
    icon: str = "📄"
    active: bool = True
    is_variable: bool = False


class RecurringResponse(BaseModel):
    id: int
    name: str
    amount: float
    due_day: Optional[int] = None
    category_id: Optional[int] = None
    icon: str
    active: bool
    is_variable: bool

    class Config:
        from_attributes = True


@router.get("/", response_model=List[RecurringResponse])
def list_recurring(db: Session = Depends(get_db)):
    fixed = db.query(Recurring).filter(Recurring.is_variable == False).order_by(Recurring.due_day).all()
    variable = db.query(Recurring).filter(Recurring.is_variable == True).order_by(Recurring.name).all()
    return fixed + variable


@router.post("/", response_model=RecurringResponse)
def create_recurring(data: RecurringCreate, db: Session = Depends(get_db)):
    if not data.is_variable:
        if data.due_day is None:
            raise HTTPException(400, "Informe o dia de vencimento para contas fixas")
        if not 1 <= data.due_day <= 31:
            raise HTTPException(400, "Dia de vencimento deve ser entre 1 e 31")

    item = Recurring(
        name=data.name,
        amount=data.amount,
        due_day=data.due_day if not data.is_variable else None,
        category_id=data.category_id,
        icon=data.icon,
        active=data.active,
        is_variable=data.is_variable,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/{id}", response_model=RecurringResponse)
def update_recurring(id: int, data: RecurringCreate, db: Session = Depends(get_db)):
    item = db.query(Recurring).filter(Recurring.id == id).first()
    if not item:
        raise HTTPException(404, "Não encontrado")
    item.name = data.name
    item.amount = data.amount
    item.due_day = data.due_day if not data.is_variable else None
    item.category_id = data.category_id
    item.icon = data.icon
    item.active = data.active
    item.is_variable = data.is_variable
    db.commit()
    db.refresh(item)
    return item


@router.patch("/{id}/amount")
def update_amount(id: int, body: dict, db: Session = Depends(get_db)):
    item = db.query(Recurring).filter(Recurring.id == id).first()
    if not item:
        raise HTTPException(404, "Não encontrado")
    item.amount = body.get("amount", item.amount)
    db.commit()
    db.refresh(item)
    return {"id": item.id, "amount": item.amount}


@router.delete("/{id}")
def delete_recurring(id: int, db: Session = Depends(get_db)):
    item = db.query(Recurring).filter(Recurring.id == id).first()
    if not item:
        raise HTTPException(404, "Não encontrado")
    db.delete(item)
    db.commit()
    return {"ok": True}


@router.get("/for-month")
def recurring_for_month(year: int, month: int, db: Session = Depends(get_db)):
    """
    Retorna contas fixas ativas com status de pagamento para o mês.
    Identifica pagamentos pelo recurring_id salvo na transação (campo notes).
    """
    from app.models.transaction import Transaction

    items = db.query(Recurring).filter(Recurring.active == True).all()
    today = date.today()
    result = []

    for item in items:
        # ✅ FIX: busca por recurring_id único, não por nome
        # Usamos description no formato "[FIXA:{id}] Nome" para identificação única
        existing = db.query(Transaction).filter(
            Transaction.description.like(f"[FIXA:{item.id}]%"),
            Transaction.type == "expense",
        ).all()

        month_tx = [t for t in existing if t.date.year == year and t.date.month == month]

        paid = len(month_tx) > 0
        paid_amount = month_tx[0].amount if month_tx else None
        tx_id = month_tx[0].id if month_tx else None

        # status de vencimento
        if item.due_day and not item.is_variable:
            max_day = calendar.monthrange(year, month)[1]
            due_date = date(year, month, min(item.due_day, max_day))
            if paid:
                status = "paid"
            elif today > due_date:
                status = "overdue"
            else:
                days_left = (due_date - today).days
                status = "soon" if days_left <= 5 else "upcoming"
        else:
            status = "paid" if paid else "variable"

        result.append({
            "id": item.id,
            "name": item.name,
            "amount": item.amount,
            "due_day": item.due_day,
            "icon": item.icon,
            "is_variable": item.is_variable,
            "category_id": item.category_id,
            "paid": paid,
            "paid_amount": paid_amount,
            "transaction_id": tx_id,
            "status": status,
        })

    return result


@router.post("/{id}/pay")
def pay_recurring(id: int, body: dict, db: Session = Depends(get_db)):
    """
    Lança transação de pagamento de conta fixa no mês.
    Usa [FIXA:{id}] como prefixo para identificação única.
    """
    from app.models.transaction import Transaction

    item = db.query(Recurring).filter(Recurring.id == id).first()
    if not item:
        raise HTTPException(404, "Conta fixa não encontrada")

    year = body.get("year", date.today().year)
    month = body.get("month", date.today().month)
    amount = body.get("amount", item.amount)
    account_id = body.get("account_id")

    if not account_id:
        raise HTTPException(400, "Informe a conta (account_id)")

    # Remove lançamento anterior do mesmo mês (se existir)
    existing = db.query(Transaction).filter(
        Transaction.description.like(f"[FIXA:{item.id}]%"),
        Transaction.type == "expense",
    ).all()
    for t in existing:
        if t.date.year == year and t.date.month == month:
            db.delete(t)

    # Cria novo lançamento
    max_day = calendar.monthrange(year, month)[1]
    day = min(item.due_day or date.today().day, max_day)

    tx = Transaction(
        description=f"[FIXA:{item.id}] {item.name}",
        amount=amount,
        type="expense",
        date=date(year, month, day),
        category_id=item.category_id,
        account_id=account_id,
        paid=True,
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return {"ok": True, "transaction_id": tx.id}


@router.delete("/{id}/pay")
def unpay_recurring(id: int, body: dict, db: Session = Depends(get_db)):
    """Remove pagamento da conta fixa no mês."""
    from app.models.transaction import Transaction

    item = db.query(Recurring).filter(Recurring.id == id).first()
    if not item:
        raise HTTPException(404, "Não encontrado")

    year = body.get("year", date.today().year)
    month = body.get("month", date.today().month)

    existing = db.query(Transaction).filter(
        Transaction.description.like(f"[FIXA:{item.id}]%"),
        Transaction.type == "expense",
    ).all()
    for t in existing:
        if t.date.year == year and t.date.month == month:
            db.delete(t)

    db.commit()
    return {"ok": True}