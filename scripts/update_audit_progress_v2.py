#!/usr/bin/env python3
"""Reconcile only evidence generated in the current national audit cycle."""
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
CYCLE = AUDIT / "cycle.json"
VALIDATION_ERRORS = AUDIT / "logs" / "latest-validation-errors.json"


def now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def parse_dt(value: str) -> datetime | None:
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return None


def safe_int(value: Any, default: int = 0) -> int:
    try:
        return int(float(value)) if value not in (None, "") else default
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
        if any(not isinstance(c, dict) or c.get("status") not in allowed for c in candidates):
            return False
    return True


def in_current_cycle(record: dict, cycle_started: datetime) -> bool:
    stamp = parse_dt(record.get("finished_at") or record.get("started_at") or "")
    return bool(stamp and stamp >= cycle_started)


def main() -> None:
    cycle = json.loads(CYCLE.read_text(encoding="utf-8"))
    cycle_id = str(cycle["cycle_id"])
    cycle_started = parse_dt(cycle["started_at"])
    if cycle_started is None:
        raise RuntimeError("audit/cycle.json has an invalid started_at")

    with MUNICIPALITIES.open(encoding="utf-8", newline="") as fh:
        rows = list(csv.DictReader(fh))
        if not rows:
            raise RuntimeError("audit/municipalities.csv has no municipality rows")
        fieldnames = list(rows[0].keys())

    # Recompute the current cycle from scratch. Historical evidence remains on disk but is ignored.
    for row in rows:
        row.update({
            "status": "not_started", "checks_completed": "0", "checks_total": "16",
            "webcams_found": "0", "evidence_file": "", "last_reviewed_at": "",
            "reviewed_by": "", "notes": "",
        })

    completed_set: set[str] = set()
    total_confirmed = rejected = offline = 0
    validation_errors: list[dict[str, Any]] = []

    for row in rows:
        evidence_path = EVIDENCE / f"{row['id']}.json"
        if not evidence_path.exists():
            continue
        try:
            record = json.loads(evidence_path.read_text(encoding="utf-8"))
            if not isinstance(record, dict) or not in_current_cycle(record, cycle_started):
                continue
            if valid_evidence(record):
                reviewed_at = now()
                record.update({
                    "status": "complete", "reviewed_at": reviewed_at,
                    "reviewer_second_pass": "github-actions:evidence-validator",
                    "audit_cycle_id": cycle_id,
                })
                evidence_path.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
                candidates = record.get("candidates", []) if isinstance(record.get("candidates"), list) else []
                confirmed = sum(1 for c in candidates if isinstance(c, dict) and c.get("status") == "new" and safe_int(c.get("confidence")) >= 85)
                rejected += sum(1 for c in candidates if isinstance(c, dict) and c.get("status") in {"rejected", "possible_duplicate", "not_public"})
                offline += sum(1 for c in candidates if isinstance(c, dict) and c.get("status") == "offline")
                total_confirmed += confirmed
                completed_set.add(row["id"])
                row.update({
                    "status": "complete", "checks_completed": "16", "webcams_found": str(confirmed),
                    "evidence_file": str(evidence_path.relative_to(ROOT)), "last_reviewed_at": reviewed_at,
                    "reviewed_by": "github-actions:webcam-audit",
                    "notes": f"Audit cycle {cycle_id}; {len(candidates)} candidate(s), {confirmed} high-confidence.",
                })
            elif record.get("status") == "blocked":
                row["status"] = "blocked"
                row["notes"] = str(record.get("error", "Automated audit blocked"))
            else:
                row["status"] = "review"
                row["notes"] = "Current-cycle evidence did not pass all 16 validation checks"
        except Exception as exc:
            row["status"] = "blocked"
            row["notes"] = f"Evidence validation error: {type(exc).__name__}: {exc}"
            validation_errors.append({
                "municipality_id": row["id"], "municipality": row.get("municipality", ""),
                "evidence_file": str(evidence_path.relative_to(ROOT)), "error_type": type(exc).__name__,
                "error": str(exc), "traceback": traceback.format_exc(),
            })

    with MUNICIPALITIES.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=fieldnames)
        writer.writeheader(); writer.writerows(rows)

    completed = [row["id"] for row in rows if row["id"] in completed_set]
    next_row = next((row for row in rows if row["id"] not in completed_set and row["status"] != "complete"), None)
    last_row = max((row for row in rows if row["id"] in completed_set), key=lambda r: safe_int(r.get("order")), default=None)
    complete_count = len(completed)
    checks_complete = complete_count * 16
    progress = {
        "audit_cycle_id": cycle_id,
        "audit_cycle_started_at": cycle["started_at"],
        "updated_at": now(), "territory_total": len(rows), "checks_per_municipality": 16,
        "municipalities_complete": complete_count,
        "municipalities_in_review": sum(1 for r in rows if r["status"] == "review"),
        "municipalities_not_started": sum(1 for r in rows if r["status"] == "not_started"),
        "municipalities_blocked": sum(1 for r in rows if r["status"] == "blocked"),
        "checks_complete": checks_complete, "checks_total": len(rows) * 16,
        "territorial_progress_percent": round(complete_count / len(rows) * 100, 2),
        "operational_progress_percent": round(checks_complete / (len(rows) * 16) * 100, 2),
        "confirmed_webcams_added_in_audit": total_confirmed,
        "offline_historical_candidates": offline,
        "rejected_or_unverified_candidates": rejected,
        "validation_errors": len(validation_errors),
        "last_completed": ({"order": safe_int(last_row.get("order")), "municipality_id": last_row["id"], "municipality": last_row["municipality"]} if last_row else None),
        "next_municipality": ({"order": safe_int(next_row.get("order")), "municipality_id": next_row["id"], "municipality": next_row["municipality"]} if next_row else None),
        "completed": completed,
        "rule": "Only evidence created after the current audit-cycle start counts as complete; historical evidence is retained but ignored.",
    }
    PROGRESS.write_text(json.dumps(progress, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    VALIDATION_ERRORS.parent.mkdir(parents=True, exist_ok=True)
    VALIDATION_ERRORS.write_text(json.dumps(validation_errors, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(progress, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
