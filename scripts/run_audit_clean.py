#!/usr/bin/env python3
"""Efficient comprehensive audit entrypoint.

Keeps the complete 16-check source matrix, but ensures each query is executed once
through the resilient meta-search layer instead of multiplying it across engines.
"""
from __future__ import annotations

from dataclasses import asdict

import webcam_audit
import run_audit_ultra_fixed  # noqa: F401 - installs comprehensive hardened profile


def efficient_run_check(self, check_id, templates, municipality, region):
    slug = webcam_audit.slugify(municipality)
    queries = [q.format(municipality=municipality, slug=slug) for q in templates]
    checked_urls = []
    candidates = []

    # One logical search per query. The hardened search function already performs
    # ordered fallbacks, so calling Bing and DuckDuckGo again only duplicates work.
    logical_engine = {
        "google": "google",
        "bing": "bing",
        "duckduckgo": "duckduckgo",
    }.get(check_id, "google")

    for query in queries:
        links = self.search(query, logical_engine)
        for link in links:
            if link in checked_urls:
                continue
            checked_urls.append(link)
            candidates.extend(self.inspect(link, municipality, region))

    candidates = self.dedupe(candidates)
    evidence = {
        "check_id": check_id,
        "status": "done",
        "queries": queries,
        "urls_checked": checked_urls,
        "candidates_found": [asdict(candidate) for candidate in candidates],
        "notes": f"{len(checked_urls)} unique URLs checked; {len(candidates)} candidate(s) classified.",
        "checked_at": webcam_audit.now(),
        "reviewer": "github-actions:webcam-audit-clean",
    }
    return evidence, candidates


webcam_audit.AuditCrawler.run_check = efficient_run_check

import run_audit_diagnostics

if __name__ == "__main__":
    raise SystemExit(run_audit_diagnostics.main())
