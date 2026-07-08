import os
import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn
from contextlib import asynccontextmanager

from train import extract_features

MODEL_PATH = "model.pkl"
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
    messageIndex: int = 0
    minutesSinceDelivery: float = 0.0

class ScoreRequest(BaseModel):
    message: str
    session_context: SessionContext = SessionContext()

class ScoreResponse(BaseModel):
    intent_probability: float
    delta: int

@app.get("/health")
def health_check():
    return {"status": "ok"}

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
    
    # Calculate delta
    delta = 2
    if request.message and len(request.message) > 50:
        delta += 3
        
    # High intent threshold
    if prob > 0.75:
        delta += 10
        
    return ScoreResponse(
        intent_probability=float(prob),
        delta=delta
    )

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run("app:app", host="0.0.0.0", port=port)
