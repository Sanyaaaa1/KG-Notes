import json
import fastapi
import os
import re
from collections import defaultdict

fetch_router = fastapi.APIRouter()

LINK_REGEX = re.compile(r"\[\[([^\]]+)\]\]")

def norm(title: str) -> str:
    return title.strip().lower()

@fetch_router.get("/graph")
def get_links():
    if not os.path.exists("notes.json"):
        return {"nodes": [], "edges_by_node": {}}

    with open("notes.json", "r") as f:
        data = json.load(f)

    # filter valid notes only
    notes = {
        note_id: note
        for note_id, note in data.items()
        if isinstance(note, dict)
        and "title" in note
        and "content" in note
    }

    # title -> id lookup
    title_to_id = {
        norm(note["title"]): note_id
        for note_id, note in notes.items()
    }

    # nodes
    nodes = [
        {"id": note_id, "label": note["title"]}
        for note_id, note in notes.items()
    ]
    
    # edges grouped by source node
    edges_by_node = defaultdict(list)

    for source_id, note in notes.items():
        content = note.get("content", "")
        links = LINK_REGEX.findall(content)

        for link_title in links:
            target_id = title_to_id.get(norm(link_title))

            if target_id and target_id != source_id:
                edges_by_node[source_id].append(target_id)

    return {
        "nodes": nodes,
        "edges_by_node": dict(edges_by_node)
    }