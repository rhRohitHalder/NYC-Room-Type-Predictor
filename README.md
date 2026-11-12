# Stay Signal — NYC Airbnb Room Type Predictor

A dark-glassmorphism single-page web app and FastAPI service powered by a Random Forest machine learning pipeline trained on 40,000+ NYC Airbnb listings.

---

## Project Structure

```text
├── Model_Pipeline.pkl    # Pre-trained scikit-learn pipeline (ColumnTransformer + RandomForest)
├── main.py               # FastAPI backend (API + static page serving)
├── index.html            # Single-page frontend
├── style.css             # Glassmorphic design system & styling
├── script.js             # Form handling, predictions, animations & health check
├── neigh_data.js         # Borough-to-neighbourhood mapping with lat/lon centroids
├── requirements.txt      # Python dependencies
├── .python-version       # Python version specification for Render / pyenv (3.12.7)
├── runtime.txt           # Python version for Heroku compatibility
├── Procfile              # Process manager start command
└── render.yaml           # Render Infrastructure-as-Code Blueprint
```

---

## Local Development

1. **Activate virtual environment:**
   ```bash
   # Windows:
   .venv\Scripts\activate
   # Linux / macOS:
   source .venv/bin/activate
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the FastAPI server:**
   ```bash
   uvicorn main:app --reload --host 127.0.0.1 --port 8000
   ```

4. **Access the application:**
   - Web App UI: [http://127.0.0.1:8000/](http://127.0.0.1:8000/)
   - Interactive Swagger API docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
   - Health check: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

---

## Deployment (Render)

This repository is pre-configured for seamless deployment to **Render Web Services**:

1. **Repository Settings on Render**:
   - **Environment / Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Environment Variable**: `PYTHON_VERSION` = `3.12.7`

2. **Automatic Configuration Files Included**:
   - `.python-version`: Instructs Render's build system to use Python 3.12.7.
   - `Procfile`: Tells Render / Heroku to bind to `0.0.0.0` and dynamic `$PORT`.
   - `render.yaml`: Provides Blueprint deployment settings.
