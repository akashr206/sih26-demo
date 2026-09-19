from dotenv import load_dotenv
# Load environment variables from .env file BEFORE importing routes
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router as api_router

app = FastAPI(
    title="AI-Powered Criminal Network Analysis API",
    description="Backend service for extracting and analyzing criminal networks from raw data.",
    version="0.1.0"
)

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the exact origins (e.g., ["http://localhost:3000"])
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the API router
app.include_router(api_router, prefix="/api")

@app.get("/")
def read_root():
    return {"message": "Welcome to the Criminal Network Analysis API. Use /docs to view the Swagger UI."}
