from fastapi import FastAPI
from app.database import Base, engine
from app.models import transaction
from app.routes.transactions import router as transactions_router

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.include_router(transactions_router)

@app.get("/")
def root():
    return {"message": "Finance API running"}