#!/usr/bin/env python3
from __future__ import annotations

import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AUDIT = ROOT / "audit"
CYCLE = AUDIT / "cycle.json"
MUNICIPALITIES = AUDIT / "municipalities.csv"
PROGRESS = AUDIT / "progress-current.json"


def main() -> None:
    cycle = json.loads(CYCLE.read_text(encoding="utf-8"))
    if cycle.get("initialized"):
        print(f"Audit cycle {cycle['cycle_id']} already initialized.")
        return

    with MUNICIPALITIES.open(encoding="utf-8", newline="") as fh:
        rows = list(csv.DictReader(fh))
        if not rows:
            raise RuntimeError("audit/municipalities.csv is empty")
        fieldnames = list(rows[0].keys())

    for row in rows:
        row.update({
            "status": "not_started",
            "checks_completed": "0",
            "checks_total": "16",
            "webcams_found": "0",
            "evidence_file": "",
            "last_reviewed_at": "",
            "reviewed_by": "",
            "notes": "",
        })

    with MUNICIPALITIES.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    progress = json.loads(PROGRESS.read_text(encoding="utf-8"))
    progress.update({
        "municipalities_complete": 0,
        "municipalities_in_review": 0,
        "municipalities_not_started": len(rows),
        "municipalities_blocked": 0,
        "checks_complete": 0,
        "territorial_progress_percent": 0.0,
        "operational_progress_percent": 0.0,
        "last_completed": None,
        "next_municipality": {
            "order": int(rows[0]["order"]),
            "municipality_id": rows[0]["id"],
            "municipality": rows[0]["municipality"],
        },
        "completed": [],
    })
    PROGRESS.write_text(json.dumps(progress, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    cycle["initialized"] = True
    cycle["initialized_by"] = "scripts/prepare_audit_cycle.py"
    CYCLE.write_text(json.dumps(cycle, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Initialized audit cycle {cycle['cycle_id']} from {rows[0]['municipality']}.")


if __name__ == "__main__":
    main()
