#!/usr/bin/env python3
"""Provider-aware search fallback for the Portugal webcam audit."""
from __future__ import annotations

import json
from dataclasses import asdict
from pathlib import Path

import webcam_audit
import run_audit_v5 as v5
import run_audit_v6 as v6

ROOT = Path(__file__).resolve().parents[1]
DURABLE_HEALTH_PATH = ROOT / "audit" / "search-health-latest.json"
v5.RELEVANCE_VERSION = 3


def provider_aware_run_check(self, check_id: str, templates: list[str], municipality: str, region: str):
    slug = webcam_audit.slugify(municipality)
    queries = [template.format(municipality=municipality, slug=slug) for template in templates]
    checked_urls: list[str] = []
    candidates = []
    query_diagnostics = []

    for query in queries:
        relevant_for_query: list[str] = []
        providers = ([v5._serper] if __import__("os").getenv("SERPER_API_KEY") else []) + [v5._bing_rss, v5._duckduckgo]
        provider_rows = []
        seen: set[str] = set()

        for provider in providers:
            raw_links = provider(self, query)
            accepted_links = []
            for link in raw_links:
                if link in seen:
                    continue
                seen.add(link)
                if v6.strict_relevant_url(link, municipality, query):
                    accepted_links.append(link)
                    relevant_for_query.append(link)
            provider_rows.append({"provider": provider.__name__.lstrip("_"), "raw": len(raw_links), "accepted": len(accepted_links)})
            if len(relevant_for_query) >= self.max_results:
                break

        relevant_for_query = list(dict.fromkeys(relevant_for_query))[: self.max_results]
        checked_urls.extend(relevant_for_query)
        for link in relevant_for_query:
            candidates.extend(self.inspect(link, municipality, region))
        query_diagnostics.append({"query": query, "providers": provider_rows, "accepted": len(relevant_for_query)})

    candidates = [candidate for candidate in self.dedupe(candidates) if candidate.status != "rejected"]
    unique_urls = list(dict.fromkeys(checked_urls))
    return {
        "check_id": check_id,
        "status": "done" if unique_urls else "empty",
        "queries": queries,
        "urls_checked": unique_urls,
        "candidates_found": [asdict(candidate) for candidate in candidates],
        "notes": f"{len(unique_urls)} relevant URLs checked; {len(candidates)} actionable candidate(s).",
        "query_diagnostics": query_diagnostics,
        "checked_at": webcam_audit.now(),
        "reviewer": "github-actions:webcam-audit-v7-provider-aware",
    }, candidates


webcam_audit.AuditCrawler.run_check = provider_aware_run_check


def persist_health() -> None:
    v5.persist_provider_health()
    source = v5.HEALTH_PATH
    if source.exists():
        doc = json.loads(source.read_text(encoding="utf-8"))
        doc["profile"] = "v7-provider-aware"
        doc["diagnosis"] = "Fallback continues when a provider returns only irrelevant links."
        DURABLE_HEALTH_PATH.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    v5.prepare_relevance_migration()
    try:
        raise SystemExit(v5.run_audit_v4.run_audit_v3.main())
    finally:
        persist_health()
