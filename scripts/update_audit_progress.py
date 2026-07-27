#!/usr/bin/env python3
"""Reconcile evidence files with the national webcam audit progress trackers."""
from __future__ import annotations

import csv
import json
import traceback
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
AUDIT = ROOT / "audit"
EVIDENCE = AUDIT / "evidence"
MUNICIPALITIES = AUDIT / "municipalities.csv"
PROGRESS = AUDIT / "progress-current.json"
VALIDATION_ERRORS = AUDIT / "logs" / "latest-validation-errors.json"


def now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def safe_int(value: Any, default: int = 0) -> int:
    """Convert audit values safely, including floats and numeric strings."""
    try:
        if value is None or value == "":
            return default
        return int(float(value))
    except (TypeError, ValueError, OverflowError):
        return default


def valid_evidence(record: dict) -> bool:
    checks = record.get("checks", [])
    if not isinstance(checks, list) or len(checks) != 16:
        return False
    allowed = {"new", "duplicate", "possible_duplicate", "offline", "not_public", "rejected"}
    for check in checks:
        if not isinstance(check, dict) or check.get("status") != "done" or not check.get("queries"):
            return False
        candidates = check.get("candidates_found", [])
        if not isinstance(candidates, list):
            return False
        for candidate in candidates:
            if not isinstance(candidate, dict) or candidate.get("status") not in allowed:
                return False
    return True


def main() -> None:
    with MUNICIPALITIES.open(encoding="utf-8", newline="") as fh:
        rows = list(csv.DictReader(fh))
        if not rows:
            raise RuntimeError("audit/municipalities.csv has no municipality rows")
        fieldnames = list(rows[0].keys())

    previous = json.loads(PROGRESS.read_text(encoding="utf-8")) if PROGRESS.exists() else {}
    completed_set = set(previous.get("completed", []))
    total_confirmed = safe_int(previous.get("confirmed_webcams_added_in_audit"))
    rejected = safe_int(previous.get("rejected_or_unverified_candidates"))
    offline = safe_int(previous.get("offline_historical_candidates"))
    validation_errors: list[dict[str, Any]] = []

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
            if not isinstance(record, dict):
                raise TypeError("Evidence root must be a JSON object")

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
                if not isinstance(candidates, list):
                    candidates = []
                confirmed = sum(
                    1 for candidate in candidates
                    if isinstance(candidate, dict)
                    and candidate.get("status") == "new"
                    and safe_int(candidate.get("confidence")) >= 85
                )
                row["webcams_found"] = str(confirmed)
                row["evidence_file"] = str(evidence_path.relative_to(ROOT))
                row["notes"] = f"Automated 16-check audit; {len(candidates)} candidate(s), {confirmed} high-confidence."
                completed_set.add(row["id"])
                if not was_completed:
                    total_confirmed += confirmed
                    rejected += sum(
                        1 for candidate in candidates
                        if isinstance(candidate, dict)
                        and candidate.get("status") in {"rejected", "possible_duplicate", "not_public"}
                    )
                    offline += sum(
                        1 for candidate in candidates
                        if isinstance(candidate, dict) and candidate.get("status") == "offline"
                    )
            elif record.get("status") == "blocked" and row["id"] not in completed_set:
                row["status"] = "blocked"
                row["notes"] = str(record.get("error", "Automated audit blocked"))
            elif row["id"] not in completed_set:
                row["status"] = "review"
                row["notes"] = "Evidence exists but did not pass all 16 validation checks"
        except Exception as exc:
            if row["id"] not in completed_set:
                row["status"] = "blocked"
                row["notes"] = f"Evidence validation error: {type(exc).__name__}: {exc}"
            validation_errors.append({
                "municipality_id": row["id"],
                "municipality": row.get("municipality", ""),
                "evidence_file": str(evidence_path.relative_to(ROOT)),
                "error_type": type(exc).__name__,
                "error": str(exc),
                "traceback": traceback.format_exc(),
            })
            print(f"VALIDATION ERROR {row['id']}: {type(exc).__name__}: {exc}")

    with MUNICIPALITIES.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    completed = [row["id"] for row in rows if row["id"] in completed_set]
    next_row = next((row for row in rows if row["id"] not in completed_set and row["status"] != "complete"), None)
    complete_count = len(completed)
    checks_complete = complete_count * 16
    last_row = max(
        (row for row in rows if row["id"] in completed_set),
        key=lambda row: safe_int(row.get("order")),
        default=None,
    )
    progress = {
        "updated_at": now(),
        "territory_total": len(rows),
        "checks_per_municipality": 16,
        "municipalities_complete": complete_count,
        "municipalities_in_review": sum(1 for row in rows if row["status"] == "review"),
        "municipalities_not_started": sum(1 for row in rows if row["status"] == "not_started"),
        "municipalities_blocked": sum(1 for row in rows if row["status"] == "blocked"),
        "checks_complete": checks_complete,
        "checks_total": len(rows) * 16,
        "territorial_progress_percent": round(complete_count / len(rows) * 100, 2),
        "operational_progress_percent": round(checks_complete / (len(rows) * 16) * 100, 2),
        "confirmed_webcams_added_in_audit": total_confirmed,
        "offline_historical_candidates": offline,
        "rejected_or_unverified_candidates": rejected,
        "validation_errors": len(validation_errors),
        "last_completed": ({
            "order": safe_int(last_row.get("order")),
            "municipality_id": last_row["id"],
            "municipality": last_row["municipality"],
        } if last_row else None),
        "next_municipality": ({
            "order": safe_int(next_row.get("order")),
            "municipality_id": next_row["id"],
            "municipality": next_row["municipality"],
        } if next_row else None),
        "completed": completed,
        "rule": "Historical completions are preserved. New automated results complete only after all 16 evidence checks pass the deterministic second-pass validator.",
    }
    PROGRESS.write_text(json.dumps(progress, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    VALIDATION_ERRORS.parent.mkdir(parents=True, exist_ok=True)
    VALIDATION_ERRORS.write_text(json.dumps(validation_errors, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(progress, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
