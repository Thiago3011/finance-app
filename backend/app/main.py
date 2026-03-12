from fastapi import FastAPI
from app.database import Base, engine
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

app.include_router(transactions_router)
app.include_router(categories_router)

@app.get("/")
def root():
    return {"message": "Finance API running"}