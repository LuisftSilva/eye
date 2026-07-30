#!/usr/bin/env python3
"""Efficient audit profile for reliable daily batches of 15 municipalities.

The previous profile executed every query against multiple engines and could spend more
than two hours on only three municipalities. This profile:
- uses a compact set of high-value query groups;
- tries search providers as a fallback chain instead of duplicating every query;
- adds Bing RSS parsing, which is less brittle than scraping the normal result page;
- records provider health and latency in the diagnostics artifact;
- keeps all persistence and lossless candidate handling from v4.
"""
from __future__ import annotations

import json
import os
import time
from dataclasses import asdict
from pathlib import Path
from urllib.parse import quote_plus, urlparse, parse_qs
from xml.etree import ElementTree

from bs4 import BeautifulSoup

import webcam_audit
import run_audit_v4
import run_audit_v3

ROOT = Path(__file__).resolve().parents[1]
HEALTH_PATH = ROOT / "audit" / "logs" / "search-providers.json"

# Twelve focused queries per municipality instead of dozens of duplicated searches.
webcam_audit.CHECKS = [
    ("official", ["site:cm-{slug}.pt webcam {municipality}", "site:{slug}.pt webcam {municipality}"]),
    ("general", ["webcam {municipality} Portugal", "câmara ao vivo {municipality}"]),
    ("providers", ["site:beachcam.meo.pt {municipality}", "site:portugalwebcams.pt {municipality}"]),
    ("tourism_coast", ["{municipality} turismo webcam", "{municipality} praia surf webcam"]),
    ("transport_weather", ["{municipality} trânsito meteorologia webcam", "{municipality} porto marina aeroporto webcam"]),
    ("technical_video", ["{municipality} live stream m3u8", "site:youtube.com/live {municipality} Portugal"]),
]

_provider_stats: dict[str, dict[str, float | int | str]] = {}


def _record(provider: str, elapsed: float, count: int, error: str = "") -> None:
    row = _provider_stats.setdefault(provider, {"requests": 0, "results": 0, "seconds": 0.0, "errors": 0, "last_error": ""})
    row["requests"] = int(row["requests"]) + 1
    row["results"] = int(row["results"]) + count
    row["seconds"] = round(float(row["seconds"]) + elapsed, 3)
    if error:
        row["errors"] = int(row["errors"]) + 1
        row["last_error"] = error[:300]


def _serper(self, query: str) -> list[str]:
    key = os.getenv("SERPER_API_KEY")
    if not key:
        return []
    started = time.monotonic()
    try:
        response = self.session.post(
            "https://google.serper.dev/search",
            json={"q": query, "gl": "pt", "hl": "pt-pt", "num": self.max_results},
            headers={"X-API-KEY": key},
            timeout=12,
        )
        response.raise_for_status()
        links = [item.get("link") for item in response.json().get("organic", []) if item.get("link")]
        _record("serper", time.monotonic() - started, len(links))
        return links[: self.max_results]
    except Exception as exc:
        _record("serper", time.monotonic() - started, 0, repr(exc))
        return []


def _bing_rss(self, query: str) -> list[str]:
    started = time.monotonic()
    try:
        response = self.session.get(
            "https://www.bing.com/search?format=rss&q=" + quote_plus(query),
            timeout=(5, 10),
        )
        response.raise_for_status()
        root = ElementTree.fromstring(response.content)
        links = []
        for item in root.findall(".//item"):
            link = item.findtext("link")
            if link and link.startswith("http"):
                links.append(link)
        _record("bing_rss", time.monotonic() - started, len(links))
        return links[: self.max_results]
    except Exception as exc:
        _record("bing_rss", time.monotonic() - started, 0, repr(exc))
        return []


def _duckduckgo(self, query: str) -> list[str]:
    started = time.monotonic()
    try:
        response = self.session.get(
            "https://html.duckduckgo.com/html/?q=" + quote_plus(query),
            timeout=(5, 10),
        )
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")
        links = []
        for anchor in soup.select("a.result__a"):
            href = anchor.get("href", "")
            if "uddg=" in href:
                href = parse_qs(urlparse(href).query).get("uddg", [href])[0]
            if href.startswith("http"):
                links.append(href)
        _record("duckduckgo", time.monotonic() - started, len(links))
        return links[: self.max_results]
    except Exception as exc:
        _record("duckduckgo", time.monotonic() - started, 0, repr(exc))
        return []


def resilient_search(self, query: str, engine: str) -> list[str]:
    # The requested engine is only a preference. A zero result immediately falls back,
    # because a blocked engine must not be interpreted as "no webcam exists".
    providers = []
    if engine == "google":
        providers.append(_serper)
    providers.extend([_bing_rss, _duckduckgo])
    seen = set()
    for provider in providers:
        links = [url for url in provider(self, query) if url not in seen and not seen.add(url)]
        if links:
            return links[: self.max_results]
    return []


# run_audit_v3.cached_search calls this variable dynamically.
run_audit_v3._original_search = resilient_search


def efficient_run_check(self, check_id: str, templates: list[str], municipality: str, region: str):
    slug = webcam_audit.slugify(municipality)
    queries = [template.format(municipality=municipality, slug=slug) for template in templates]
    checked_urls: list[str] = []
    candidates = []
    for query in queries:
        # One cached logical lookup; resilient_search handles provider fallback.
        links = self.search(query, "google")
        for link in links:
            checked_urls.append(link)
            candidates.extend(self.inspect(link, municipality, region))
    candidates = self.dedupe(candidates)
    unique_urls = list(dict.fromkeys(checked_urls))
    return {
        "check_id": check_id,
        "status": "done" if unique_urls else "empty",
        "queries": queries,
        "urls_checked": unique_urls,
        "candidates_found": [asdict(candidate) for candidate in candidates],
        "notes": f"{len(unique_urls)} unique URLs checked; {len(candidates)} candidate(s) classified.",
        "checked_at": webcam_audit.now(),
        "reviewer": "github-actions:webcam-audit-v5",
    }, candidates


webcam_audit.AuditCrawler.run_check = efficient_run_check


def persist_provider_health() -> None:
    HEALTH_PATH.parent.mkdir(parents=True, exist_ok=True)
    total_results = sum(int(row.get("results", 0)) for row in _provider_stats.values())
    HEALTH_PATH.write_text(json.dumps({
        "generated_at": webcam_audit.now(),
        "providers": _provider_stats,
        "total_results": total_results,
        "healthy": total_results > 0,
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    try:
        raise SystemExit(run_audit_v4.run_audit_v3.main())
    finally:
        persist_provider_health()
