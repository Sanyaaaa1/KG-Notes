from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import savings
import notes
import fetch

app = FastAPI(redirect_slashes=False)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
# app.include_router(savings.savings_router, prefix="/api")
app.include_router(notes.notes_router, prefix="/api")
app.include_router(fetch.fetch_router, prefix="/api")
# Mount static files
app.mount("/", StaticFiles(directory="./main", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)