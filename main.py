from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from pydantic import BaseModel, Field
import joblib

BASE_DIR = Path(__file__).resolve().parent

app = FastAPI(title="NYC Room Type Predictor")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

COLUMNS = [
    "latitude",
    "longitude",
    "price",
    "minimum_nights",
    "number_of_reviews",
    "reviews_per_month",
    "calculated_host_listings_count",
    "availability_365",
    "neighbourhood_group",
    "neighbourhood",
]

MODEL_PATH = BASE_DIR / "Model_Pipeline.pkl"
if not MODEL_PATH.exists():
    raise FileNotFoundError(f"Model file not found at: {MODEL_PATH}")

model = joblib.load(MODEL_PATH)


class Features(BaseModel):
    latitude: float = Field(..., ge=-90, le=90, description="Latitude coordinate")
    longitude: float = Field(..., ge=-180, le=180, description="Longitude coordinate")
    price: float = Field(..., gt=0, description="Price per night, must be positive")
    minimum_nights: int = Field(..., ge=1, le=365, description="Minimum nights required for booking")
    number_of_reviews: int = Field(..., ge=0, description="Total number of reviews")
    reviews_per_month: float = Field(..., ge=0, description="Average reviews per month")
    calculated_host_listings_count: int = Field(..., ge=0, description="Number of listings by this host")
    availability_365: int = Field(..., ge=0, le=365, description="Days available out of 365")
    neighbourhood_group: str = Field(..., min_length=1, description="Borough or neighbourhood group")
    neighbourhood: str = Field(..., min_length=1, description="Specific neighbourhood name")


@app.get("/")
def home():
    index_file = BASE_DIR / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return {"message": "NYC Room Type Predictor API is running"}


@app.get("/index.html")
def get_index():
    return home()


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": model is not None}


@app.get("/style.css")
def get_css():
    css_file = BASE_DIR / "style.css"
    if css_file.exists():
        return FileResponse(css_file, media_type="text/css")
    raise HTTPException(status_code=404, detail="style.css not found")


@app.get("/script.js")
def get_js():
    js_file = BASE_DIR / "script.js"
    if js_file.exists():
        return FileResponse(js_file, media_type="application/javascript")
    raise HTTPException(status_code=404, detail="script.js not found")


@app.get("/neigh_data.js")
def get_neigh_data():
    data_file = BASE_DIR / "neigh_data.js"
    if data_file.exists():
        return FileResponse(data_file, media_type="application/javascript")
    raise HTTPException(status_code=404, detail="neigh_data.js not found")


@app.post("/predict")
def predict(features: Features):
    try:
        data = features.model_dump() if hasattr(features, "model_dump") else features.dict()
        row = pd.DataFrame([data], columns=COLUMNS)
        prediction = model.predict(row)
        probability = model.predict_proba(row)

        return {
            "Predicted_room_type": str(prediction[0]),
            "Probability": probability.tolist()[0],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")
