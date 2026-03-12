from fastapi import FastAPI
from app.database import Base, engine, SessionLocal
from app.models.category import Category
from app.models import transaction
from app.routes.transactions import router as transactions_router
from app.routes.categories import router as categories_router
from app.routes.accounts import router as accounts_router
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

def seed_categories():

    db = SessionLocal()

    if db.query(Category).count() > 0:
        db.close()
        return

    categories = [

        Category(name="Salário", type="income"),
        Category(name="Freelance", type="income"),

        Category(name="Alimentação", type="expense"),
        Category(name="Aluguel", type="expense"),
        Category(name="Transporte", type="expense"),
        Category(name="Lazer", type="expense"),

    ]

    db.add_all(categories)
    db.commit()
    db.close()

seed_categories()

app.include_router(transactions_router)
app.include_router(categories_router)
app.include_router(accounts_router)

@app.get("/")
def root():
    return {"message": "Finance API running"}
