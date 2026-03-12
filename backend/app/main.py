from fastapi import FastAPI
from app.database import Base, engine, SessionLocal
from app.models.category import Category
from app.models import transaction
from app.routes.transactions import router as transactions_router
from app.routes.categories import router as categories_router
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

def seed_categories():
    db = SessionLocal()
    try:
        has_any = db.query(Category).first() is not None
        if has_any:
            return

        defaults = [
            "Alimenta\u00e7\u00e3o",
            "Moradia",
            "Transporte",
            "Sa\u00fade",
            "Educa\u00e7\u00e3o",
            "Lazer",
            "Sal\u00e1rio",
            "Investimentos",
            "Outros",
        ]
        for name in defaults:
            db.add(Category(name=name))
        db.commit()
    finally:
        db.close()

seed_categories()

app.include_router(transactions_router)
app.include_router(categories_router)

@app.get("/")
def root():
    return {"message": "Finance API running"}
