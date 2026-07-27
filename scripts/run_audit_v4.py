#!/usr/bin/env python3
"""Lossless audit v4: also preserves Portuguese provider pages without direct media URLs."""
from __future__ import annotations

from dataclasses import asdict

import webcam_audit
import run_audit_v3


def preserving_inspect_v4(self, url: str, municipality: str, region: str):
    candidates = run_audit_v3._original_inspect(self, url, municipality, region)
    for candidate in candidates:
        municipality_confirmed = any("Municipality name appears" in item for item in candidate.evidence)
        has_reference = bool(candidate.media_url or candidate.source_url)
        needs_inventory = not municipality_confirmed or candidate.confidence < 90 or candidate.status != "new"
        if run_audit_v3.likely_portuguese(candidate) and has_reference and needs_inventory:
            row = asdict(candidate)
            row.update({
                "inventory_status": "location_pending" if not municipality_confirmed else "review_pending",
                "discovered_during_municipality": municipality,
                "assigned_municipality": municipality if municipality_confirmed else None,
                "assigned_region": region if municipality_confirmed else None,
                "first_seen_at": candidate.discovered_at,
                "last_seen_at": run_audit_v3.iso_now(),
                "reference_type": "direct_media" if candidate.media_url else "provider_page",
            })
            run_audit_v3._unassigned_candidates.append(row)
    return candidates


webcam_audit.AuditCrawler.inspect = preserving_inspect_v4

if __name__ == "__main__":
    raise SystemExit(run_audit_v3.main())
