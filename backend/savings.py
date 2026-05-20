import json
import fastapi
import os

savings_router = fastapi.APIRouter()
@savings_router.get("/savings")
def get_savings():
    if os.path.exists("savings.json"):
        with open("savings.json", "r") as f:
            return json.load(f)
    else:
        return {"total": 0, "entries": []}

@savings_router.post("/savings")
def add_saving(entry: dict):
    if os.path.exists("savings.json"):
        with open("savings.json", "r") as f:
            data = json.load(f)
        
    else:
        data = {"total": 0, "entries": []}
    data["entries"].append(entry)
    data["total"] += entry.get("amount", 0)
    with open("savings.json", "w") as f:
        json.dump(data, f, indent=4)
    return {"message": "Saving entry added successfully", "data": data}