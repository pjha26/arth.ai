import os
import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
import uvicorn
from contextlib import asynccontextmanager

from features import extract_features
from pathlib import Path
import hashlib

MODEL_PATH = Path(__file__).with_name("model.pkl")
MODEL_VERSION = hashlib.sha256(MODEL_PATH.read_bytes()).hexdigest()[:12] if MODEL_PATH.exists() else "missing"
model = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global model
    if os.path.exists(MODEL_PATH):
        model = joblib.load(MODEL_PATH)
        print(f"Loaded ML model from {MODEL_PATH}")
    else:
        print(f"WARNING: Model file {MODEL_PATH} not found. Please run train.py first.")
    yield
    # No teardown needed

app = FastAPI(title="ML Lead Scoring API", lifespan=lifespan)

class SessionContext(BaseModel):
    messageIndex: int = Field(default=0, ge=0, le=100000)
    minutesSinceDelivery: float = Field(default=0.0, ge=0)

class ScoreRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    session_context: SessionContext = SessionContext()

class ScoreResponse(BaseModel):
    intent_probability: float
    model_version: str
    experimental: bool = True

@app.get("/health")
def health_check():
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    return {"status": "ok", "model_version": MODEL_VERSION, "experimental": True}

@app.post("/score", response_model=ScoreResponse)
def score_message(request: ScoreRequest):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    # Extract features using the same function from train.py
    session_context_dict = {
        "messageIndex": request.session_context.messageIndex,
        "minutesSinceDelivery": request.session_context.minutesSinceDelivery
    }
    
    features = extract_features(request.message, session_context_dict)
    
    # Convert to DataFrame
    df = pd.DataFrame([features])
    
    # Predict probability of class 1 (High Intent)
    prob = model.predict_proba(df)[0][1]
    
    return ScoreResponse(
        intent_probability=float(prob),
        model_version=MODEL_VERSION
    )

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run("app:app", host="0.0.0.0", port=port)
