import os
import json
import joblib
import pandas as pd
import numpy as np
from dotenv import load_dotenv
import google.generativeai as genai
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score

load_dotenv(dotenv_path='../.env.local')

def get_gemini_data():
    genai.configure(api_key=os.environ.get('GEMINI_API_KEY'))
    model = genai.GenerativeModel('gemini-2.5-flash')
    
    prompt = """
    Generate a JSON array of 60 B2B SaaS prospect messages in a chat interface.
    30 MUST BE HIGH INTENT (label: 1): asking about pricing, integration, onboarding, competitor vs, team size.
    30 MUST BE LOW INTENT (label: 0): casual curiosity, one-word replies, off-topic.
    Return ONLY a valid JSON array of objects with exactly two keys: 'message' (string) and 'label' (int 0 or 1).
    Do not wrap in markdown or backticks.
    """
    
    print("Generating data from Gemini...")
    response = model.generate_content(prompt)
    try:
        text = response.text.strip()
        if text.startswith('```json'):
            text = text[7:]
        elif text.startswith('```'):
            text = text[3:]
        if text.endswith('```'):
            text = text[:-3]
            
        data = json.loads(text.strip())
        df = pd.DataFrame(data)
        return df
    except Exception as e:
        print("Failed to parse Gemini output", e)
        print("Raw output:", response.text)
        return pd.DataFrame(columns=["message", "label"])

def extract_features(message, session_context=None):
    if session_context is None:
        session_context = {"messageIndex": 0, "minutesSinceDelivery": 0.0}
    
    if not isinstance(message, str):
        message = ""
        
    lower_msg = message.lower()
    
    return {
        "char_length": len(message),
        "word_count": len(message.split()),
        "question_count": message.count('?'),
        "exclamation_count": message.count('!'),
        "has_pricing": int(any(w in lower_msg for w in ["pricing", "cost", "budget", "price", "pay"])),
        "has_competitor": int(any(w in lower_msg for w in ["competitor", "alternative", "vs", "versus", "compare"])),
        "has_integration": int(any(w in lower_msg for w in ["integrate", "api", "connect", "plugin"])),
        "has_timeline": int(any(w in lower_msg for w in ["timeline", "onboard", "start", "when", "how long"])),
        "has_team": int(any(w in lower_msg for w in ["team", "seats", "users", "licenses"])),
        "message_index": session_context.get("messageIndex", 0),
        "minutes_since_delivery": session_context.get("minutesSinceDelivery", 0.0)
    }

def build_features_df(df):
    features_list = []
    np.random.seed(42)
    for i, row in df.iterrows():
        # High intent typically occurs later or earlier, just add noise for robustness
        session_context = {
            "messageIndex": np.random.randint(0, 10),
            "minutesSinceDelivery": np.random.uniform(0, 100)
        }
        features = extract_features(row['message'], session_context)
        features_list.append(features)
        
    X = pd.DataFrame(features_list)
    y = df['label'].astype(int)
    return X, y

def train():
    data_file = 'data.csv'
    if not os.path.exists(data_file):
        df = get_gemini_data()
        if len(df) > 0:
            df.to_csv(data_file, index=False)
            print(f"Saved {len(df)} samples to {data_file}")
        else:
            print("No data generated.")
            return
    else:
        df = pd.read_csv(data_file)
        print(f"Loaded {len(df)} samples from {data_file}")

    print("Extracting features...")
    X, y = build_features_df(df)
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print("Training Logistic Regression model...")
    model = LogisticRegression(max_iter=1000)
    model.fit(X_train, y_train)
    
    preds = model.predict(X_test)
    acc = accuracy_score(y_test, preds)
    print(f"Model accuracy on test set: {acc:.2f}")
    
    joblib.dump(model, 'model.pkl')
    print("Model serialized to model.pkl")

if __name__ == "__main__":
    train()
