from fastapi import FastAPI
from app.database import Base, engine

from app.models import transaction

Base.metadata.create_all(bind=engine)

app = FastAPI()

@app.get("/")
def root():
    return {"message": "Finance API running"}