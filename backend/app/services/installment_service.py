from datetime import datetime, date
from dateutil.relativedelta import relativedelta
from app.models.installment import Installment
from app.models.transaction import Transaction


def create_installment(db, data):

    if data.total_installments <= 0:
        raise ValueError("Número de parcelas deve ser maior que 0")

    if data.total_amount <= 0:
        raise ValueError("Valor deve ser maior que 0")

    # 👇 converte string para date se necessário
    if isinstance(data.start_date, str):
        start_date = date.fromisoformat(data.start_date)
    else:
        start_date = data.start_date

    installment = Installment(
        description=data.description,
        total_amount=data.total_amount,
        total_installments=data.total_installments
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