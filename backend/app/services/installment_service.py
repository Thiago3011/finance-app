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

    debt_type = getattr(data, "debt_type", "parcelamento")
    is_consignado = debt_type == "emprestimo_consignado"

    installment = Installment(
        description=data.description,
        total_amount=data.total_amount,
        total_installments=data.total_installments,
        debt_type=debt_type,
    )
    db.add(installment)
    db.commit()
    db.refresh(installment)

    value_per = round(data.total_amount / data.total_installments, 2)
    today = date.today()

    transactions = []
    for i in range(data.total_installments):
        transaction_date = start_date + relativedelta(months=i)
        paid = is_consignado and transaction_date <= today
        transactions.append(Transaction(
            description=f"{data.description} ({i+1}/{data.total_installments})",
            amount=value_per,
            type="expense",
            category_id=data.category_id,
            account_id=data.account_id,
            installment_id=installment.id,
            installment_number=i + 1,
            date=transaction_date,
            paid=paid,
        ))

    db.add_all(transactions)
    db.commit()
    return installment


def create_installment_custom(db, data):
    """
    Cria parcelamento com valores e datas individuais por parcela.
    ✅ Fix item 3: respeita total_amount_override se fornecido,
    caso contrário usa a soma real das parcelas.
    """
    if not data.installments:
        raise ValueError("Adicione pelo menos uma parcela")

    debt_type = getattr(data, "debt_type", "parcelamento")
    is_consignado = debt_type == "emprestimo_consignado"
    today = date.today()

    # ✅ Usa o total informado pelo usuário se existir, senão soma as parcelas
    total_amount = getattr(data, "total_amount_override", None) or sum(item.amount for item in data.installments)

    installment = Installment(
        description=data.description,
        total_amount=total_amount,
        total_installments=len(data.installments),
        debt_type=debt_type,
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

        paid = is_consignado and transaction_date <= today

        transactions.append(Transaction(
            description=f"{data.description} ({i+1}/{len(data.installments)})",
            amount=item.amount,
            type="expense",
            category_id=data.category_id,
            account_id=data.account_id,
            installment_id=installment.id,
            installment_number=i + 1,
            date=transaction_date,
            paid=paid,
        ))

    db.add_all(transactions)
    db.commit()
    return installment