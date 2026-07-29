# Stay Signal — frontend for your Airbnb room-type model

A dark-glassmorphism single-page frontend for your FastAPI `/predict` endpoint.
Vanilla HTML/CSS/JS, no build step.

## Files

```
templates/index.html      # the page (Jinja2-compatible, no template tags used)
static/css/style.css      # design system + styles
static/js/neigh_data.js   # borough → neighbourhood → avg lat/lon (derived from
                           # the training data, drives the dependent dropdowns)
static/js/script.js       # form logic, API calls, animations
```

## Wiring it into your existing `main.py`

Your current file only defines API routes. Add these three lines so FastAPI
serves the page and its assets:

```python
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi import Request

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

@app.get("/", response_class=None)
def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})
```

That replaces your current `greet()` route at `"/"` — the frontend calls
`GET /` only for a lightweight "is the API up" check (any 200 response is
fine), so if you'd rather keep `greet()` as JSON, mount the page at a
different path (e.g. `/app`) and update `API_BASE`/health-check target in
`static/js/script.js` accordingly.

Drop `templates/` and `static/` next to `main.py`, install
`jinja2` and `python-multipart` if not already present, then run:

```bash
uvicorn main:app --reload
```

and open `http://127.0.0.1:8000/`.

## Notes

- The form's field names and types exactly match your `Features` pydantic
  model, so payloads sent to `/predict` will validate as-is.
- Selecting a borough + neighbourhood auto-fills latitude/longitude from the
  historical average for that neighbourhood (both stay editable).
- The result panel reads `Predicted_room_type` and `Probability` from your
  response and assumes `Probability` is ordered
  `["Entire home/apt", "Private room", "Shared room"]` — the order your
  model's `classes_` attribute produced. If you retrain and the class order
  changes, update `classOrder` near the top of `renderResult()` in
  `static/js/script.js`.
- CORS is already wide open in your backend (`allow_origins=["*"]`), so this
  will also work if you serve the frontend separately and just point
  `API_BASE` in `script.js` at your API's URL.
