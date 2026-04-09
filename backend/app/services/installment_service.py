from datetime import datetime, date
from dateutil.relativedelta import relativedelta
from app.models.installment import Installment
from app.models.transaction import Transaction


def create_installment(db, data):
    if data.total_installments <= 0:
        raise ValueError("Número de parcelas deve ser maior que 0")
    if data.total_amount <= 0:
        raise ValueError("Valor deve ser maior que 0")

    if isinstance(data.start_date, str):
        start_date = date.fromisoformat(data.start_date)
    else:
        start_date = data.start_date

    installment = Installment(
        description=data.description,
        total_amount=data.total_amount,
        total_installments=data.total_installments,
        debt_type=getattr(data, "debt_type", "parcelamento")
    )

    db.add(installment)
    db.commit()
    db.refresh(installment)

    value_per_installment = round(data.total_amount / data.total_installments, 2)

    transactions = []
    for i in range(data.total_installments):
        transaction_date = start_date + relativedelta(months=i)
        transaction = Transaction(
            description=f"{data.description} ({i+1}/{data.total_installments})",
            amount=value_per_installment,
            type="expense",
            category_id=data.category_id,
            account_id=data.account_id,
            installment_id=installment.id,
            installment_number=i + 1,
            date=transaction_date,
            paid=False
        )
        transactions.append(transaction)

    db.add_all(transactions)
    db.commit()

    return installment


def create_installment_custom(db, data):
    """Cria parcelamento com parcelas de valores e datas personalizados"""
    if not data.installments:
        raise ValueError("Adicione pelo menos uma parcela")

    total_amount = sum(item.amount for item in data.installments)

    installment = Installment(
        description=data.description,
        total_amount=total_amount,
        total_installments=len(data.installments),
        debt_type=getattr(data, "debt_type", "parcelamento")
    )

    db.add(installment)
    db.commit()
    db.refresh(installment)

    transactions = []
    for i, item in enumerate(data.installments):
        if isinstance(item.date, str):
            transaction_date = date.fromisoformat(item.date)
        else:
            transaction_date = item.date

        transaction = Transaction(
            description=f"{data.description} ({i+1}/{len(data.installments)})",
            amount=item.amount,
            type="expense",
            category_id=data.category_id,
            account_id=data.account_id,
            installment_id=installment.id,
            installment_number=i + 1,
            date=transaction_date,
            paid=False
        )
        transactions.append(transaction)

    db.add_all(transactions)
    db.commit()

    return installment