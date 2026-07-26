#!/usr/bin/env python3
"""Reconcile evidence files with the national webcam audit progress trackers."""
from __future__ import annotations

import csv
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AUDIT = ROOT / "audit"
EVIDENCE = AUDIT / "evidence"
MUNICIPALITIES = AUDIT / "municipalities.csv"
PROGRESS = AUDIT / "progress-current.json"


def now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def valid_evidence(record: dict) -> bool:
    checks = record.get("checks", [])
    if len(checks) != 16:
        return False
    allowed = {"new", "duplicate", "possible_duplicate", "offline", "not_public", "rejected"}
    for check in checks:
        if check.get("status") != "done" or not check.get("queries"):
            return False
        for candidate in check.get("candidates_found", []):
            if candidate.get("status") not in allowed:
                return False
    return True


def main() -> None:
    with MUNICIPALITIES.open(encoding="utf-8", newline="") as fh:
        rows = list(csv.DictReader(fh))
        fieldnames = list(rows[0].keys())

    previous = json.loads(PROGRESS.read_text(encoding="utf-8")) if PROGRESS.exists() else {}
    completed_set = set(previous.get("completed", []))
    total_confirmed = int(previous.get("confirmed_webcams_added_in_audit", 0))
    rejected = int(previous.get("rejected_or_unverified_candidates", 0))
    offline = int(previous.get("offline_historical_candidates", 0))

    # Preserve historical completions even where the older evidence schema predates this validator.
    for row in rows:
        if row["id"] in completed_set:
            row["status"] = "complete"
            row["checks_completed"] = "16"
            row["checks_total"] = "16"

    for row in rows:
        evidence_path = EVIDENCE / f"{row['id']}.json"
        if not evidence_path.exists():
            continue
        try:
            record = json.loads(evidence_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            if row["id"] not in completed_set:
                row["status"] = "blocked"
                row["notes"] = "Invalid evidence JSON"
            continue

        if valid_evidence(record):
            was_completed = row["id"] in completed_set
            record["status"] = "complete"
            record["reviewed_at"] = now()
            record["reviewer_second_pass"] = "github-actions:evidence-validator"
            evidence_path.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            row["status"] = "complete"
            row["checks_completed"] = "16"
            row["checks_total"] = "16"
            row["last_reviewed_at"] = record["reviewed_at"]
            row["reviewed_by"] = "github-actions:webcam-audit"
            candidates = record.get("candidates", [])
            confirmed = sum(1 for c in candidates if c.get("status") == "new" and int(c.get("confidence", 0)) >= 85)
            row["webcams_found"] = str(confirmed)
            row["evidence_file"] = str(evidence_path.relative_to(ROOT))
            row["notes"] = f"Automated 16-check audit; {len(candidates)} candidate(s), {confirmed} high-confidence."
            completed_set.add(row["id"])
            if not was_completed:
                total_confirmed += confirmed
                rejected += sum(1 for c in candidates if c.get("status") in {"rejected", "possible_duplicate", "not_public"})
                offline += sum(1 for c in candidates if c.get("status") == "offline")
        elif record.get("status") == "blocked" and row["id"] not in completed_set:
            row["status"] = "blocked"
            row["notes"] = record.get("error", "Automated audit blocked")
        elif row["id"] not in completed_set:
            row["status"] = "review"

    with MUNICIPALITIES.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    completed = [r["id"] for r in rows if r["id"] in completed_set]
    next_row = next((r for r in rows if r["id"] not in completed_set and r["status"] != "complete"), None)
    complete_count = len(completed)
    checks_complete = complete_count * 16
    last_row = max((r for r in rows if r["id"] in completed_set), key=lambda r: int(r["order"]), default=None)
    progress = {
        "updated_at": now(),
        "territory_total": len(rows),
        "checks_per_municipality": 16,
        "municipalities_complete": complete_count,
        "municipalities_in_review": sum(1 for r in rows if r["status"] == "review"),
        "municipalities_not_started": sum(1 for r in rows if r["status"] == "not_started"),
        "municipalities_blocked": sum(1 for r in rows if r["status"] == "blocked"),
        "checks_complete": checks_complete,
        "checks_total": len(rows) * 16,
        "territorial_progress_percent": round(complete_count / len(rows) * 100, 2),
        "operational_progress_percent": round(checks_complete / (len(rows) * 16) * 100, 2),
        "confirmed_webcams_added_in_audit": total_confirmed,
        "offline_historical_candidates": offline,
        "rejected_or_unverified_candidates": rejected,
        "last_completed": ({
            "order": int(last_row["order"]),
            "municipality_id": last_row["id"],
            "municipality": last_row["municipality"],
        } if last_row else None),
        "next_municipality": ({
            "order": int(next_row["order"]),
            "municipality_id": next_row["id"],
            "municipality": next_row["municipality"],
        } if next_row else None),
        "completed": completed,
        "rule": "Historical completions are preserved. New automated results complete only after all 16 evidence checks pass the deterministic second-pass validator."
    }
    PROGRESS.write_text(json.dumps(progress, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(progress, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
