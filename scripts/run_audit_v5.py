#!/usr/bin/env python3
"""Efficient and relevance-filtered daily Portugal webcam audit."""
from __future__ import annotations

import csv
import json
import os
import time
from dataclasses import asdict
from pathlib import Path
from urllib.parse import parse_qs, quote_plus, urlparse
from xml.etree import ElementTree

from bs4 import BeautifulSoup

import webcam_audit
import run_audit_v4
import run_audit_v3

ROOT = Path(__file__).resolve().parents[1]
AUDIT = ROOT / "audit"
HEALTH_PATH = AUDIT / "logs" / "search-providers.json"
CYCLE_PATH = AUDIT / "cycle.json"
LAST_RUN_PATH = AUDIT / "last-automated-run.json"
MUNICIPALITIES_PATH = AUDIT / "municipalities.csv"
RELEVANCE_VERSION = 1

webcam_audit.CHECKS = [
    ("official", ["site:cm-{slug}.pt webcam {municipality}", "site:{slug}.pt webcam {municipality}"]),
    ("general", ["webcam {municipality} Portugal", "câmara ao vivo {municipality}"]),
    ("providers", ["site:beachcam.meo.pt {municipality}", "site:portugalwebcams.pt {municipality}"]),
    ("tourism_coast", ["{municipality} turismo webcam", "{municipality} praia surf webcam"]),
    ("transport_weather", ["{municipality} trânsito meteorologia webcam", "{municipality} porto marina aeroporto webcam"]),
    ("technical_video", ["{municipality} live stream m3u8", "site:youtube.com/live {municipality} Portugal"]),
]

TRUSTED_HOSTS = {
    "beachcam.meo.pt", "back-office.beachcam.pt", "portugalwebcams.pt", "www.portugalwebcams.pt",
    "spotazores.com", "www.spotazores.com", "netmadeira.com", "www.netmadeira.com",
    "madeiracams.com", "www.madeiracams.com", "youtube.com", "www.youtube.com", "youtu.be",
}
NOISE_HOSTS = {
    "webcamtests.com", "webcamtoy.com", "webcam.org", "iriun.com", "weather.com",
    "www.weather.com", "accuweather.com", "www.accuweather.com", "easeweather.com",
    "www.easeweather.com", "weatherworld.com", "www.weatherworld.com",
}
WEBCAM_HINTS = ("webcam", "livecam", "live-cam", "camera", "camara", "stream", "m3u8", "beachcam")
_provider_stats: dict[str, dict[str, float | int | str]] = {}
_relevance_stats = {"accepted": 0, "rejected": 0}


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
        response = self.session.post("https://google.serper.dev/search", json={"q": query, "gl": "pt", "hl": "pt-pt", "num": self.max_results}, headers={"X-API-KEY": key}, timeout=12)
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
        response = self.session.get("https://www.bing.com/search?format=rss&q=" + quote_plus(query), timeout=(5, 10))
        response.raise_for_status()
        root = ElementTree.fromstring(response.content)
        links = [item.findtext("link") for item in root.findall(".//item") if item.findtext("link") and item.findtext("link").startswith("http")]
        _record("bing_rss", time.monotonic() - started, len(links))
        return links[: self.max_results]
    except Exception as exc:
        _record("bing_rss", time.monotonic() - started, 0, repr(exc))
        return []


def _duckduckgo(self, query: str) -> list[str]:
    started = time.monotonic()
    try:
        response = self.session.get("https://html.duckduckgo.com/html/?q=" + quote_plus(query), timeout=(5, 10))
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
    providers = ([_serper] if engine == "google" else []) + [_bing_rss, _duckduckgo]
    seen: set[str] = set()
    for provider in providers:
        links = []
        for url in provider(self, query):
            if url not in seen:
                seen.add(url)
                links.append(url)
        if links:
            return links[: self.max_results]
    return []


run_audit_v3._original_search = resilient_search


def _relevant_url(url: str, municipality: str, query: str) -> bool:
    global _relevance_stats
    parsed = urlparse(url)
    host = parsed.netloc.lower().split(":")[0]
    haystack = f"{host}{parsed.path}?{parsed.query}".lower()
    municipality_slug = webcam_audit.slugify(municipality)
    municipality_tokens = [token for token in municipality_slug.split("-") if len(token) >= 4]
    query_lower = query.lower()

    accepted = False
    if host in NOISE_HOSTS:
        accepted = False
    elif host in TRUSTED_HOSTS:
        accepted = True
    elif host.endswith(".pt") and any(hint in haystack for hint in WEBCAM_HINTS):
        accepted = True
    elif any(token in haystack for token in municipality_tokens) and any(hint in haystack for hint in WEBCAM_HINTS):
        accepted = True
    elif query_lower.startswith("site:"):
        requested_host = query_lower.split()[0].removeprefix("site:")
        accepted = host == requested_host or host.endswith("." + requested_host)

    _relevance_stats["accepted" if accepted else "rejected"] += 1
    return accepted


def efficient_run_check(self, check_id: str, templates: list[str], municipality: str, region: str):
    slug = webcam_audit.slugify(municipality)
    queries = [template.format(municipality=municipality, slug=slug) for template in templates]
    checked_urls: list[str] = []
    candidates = []
    for query in queries:
        for link in self.search(query, "google"):
            if not _relevant_url(link, municipality, query):
                continue
            checked_urls.append(link)
            candidates.extend(self.inspect(link, municipality, region))
    candidates = [candidate for candidate in self.dedupe(candidates) if candidate.status != "rejected"]
    unique_urls = list(dict.fromkeys(checked_urls))
    return {
        "check_id": check_id,
        "status": "done" if unique_urls else "empty",
        "queries": queries,
        "urls_checked": unique_urls,
        "candidates_found": [asdict(candidate) for candidate in candidates],
        "notes": f"{len(unique_urls)} relevant URLs checked; {len(candidates)} actionable candidate(s).",
        "checked_at": webcam_audit.now(),
        "reviewer": "github-actions:webcam-audit-v5-relevance-1",
    }, candidates


webcam_audit.AuditCrawler.run_check = efficient_run_check


def prepare_relevance_migration() -> None:
    try:
        cycle = json.loads(CYCLE_PATH.read_text(encoding="utf-8"))
    except Exception:
        return
    if int(cycle.get("relevance_filter_version", 0) or 0) >= RELEVANCE_VERSION:
        return
    try:
        last_run = json.loads(LAST_RUN_PATH.read_text(encoding="utf-8"))
        affected = {str(row.get("id")) for row in last_run.get("municipalities", []) if row.get("id")}
    except Exception:
        affected = set()
    if affected and MUNICIPALITIES_PATH.exists():
        with MUNICIPALITIES_PATH.open(newline="", encoding="utf-8") as handle:
            rows = list(csv.DictReader(handle))
            fieldnames = list(rows[0].keys()) if rows else []
        for row in rows:
            if row.get("id") in affected:
                row.update({"status": "not_started", "checks_completed": "0", "webcams_found": "0", "evidence_file": "", "last_reviewed_at": "", "reviewed_by": "", "notes": "Repeated after relevance-filter fix"})
        with MUNICIPALITIES_PATH.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.DictWriter(handle, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)
    cycle["relevance_filter_version"] = RELEVANCE_VERSION
    cycle["relevance_filter_applied_at"] = webcam_audit.now()
    CYCLE_PATH.write_text(json.dumps(cycle, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def persist_provider_health() -> None:
    HEALTH_PATH.parent.mkdir(parents=True, exist_ok=True)
    total_results = sum(int(row.get("results", 0)) for row in _provider_stats.values())
    HEALTH_PATH.write_text(json.dumps({"generated_at": webcam_audit.now(), "providers": _provider_stats, "search_results": total_results, "relevance": _relevance_stats, "healthy": total_results > 0}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    prepare_relevance_migration()
    try:
        raise SystemExit(run_audit_v4.run_audit_v3.main())
    finally:
        persist_provider_health()
