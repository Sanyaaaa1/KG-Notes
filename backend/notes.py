import json
import fastapi
import os
from typing import Dict, Any
import tempfile

notes_router = fastapi.APIRouter()

NOTES_FILE = "notes.json"

def load_notes() -> Dict[str, Any]:
    if os.path.exists(NOTES_FILE):
        with open(NOTES_FILE, "r") as f:
            return json.load(f)
    return {}

def save_notes(notes: Dict[str, Any]):
    dir = os.path.dirname(NOTES_FILE) or "."
    with tempfile.NamedTemporaryFile("w", dir=dir, delete=False, suffix=".tmp") as f:
        json.dump(notes, f, indent=4)
        tmp = f.name
    os.replace(tmp, NOTES_FILE)

@notes_router.get("/notes")
def get_notes():
    return load_notes()

@notes_router.post("/notes")
def save_all_notes(notes: Dict[str, Any]):
    save_notes(notes)
    return {"message": "Notes saved successfully"}

@notes_router.delete("/notes/{note_id}")
def delete_note(note_id: str):
    notes = load_notes()
    if note_id in notes:
        del notes[note_id]
        save_notes(notes)
        return {"message": "Note deleted successfully"}
    return {"error": "Note not found"}