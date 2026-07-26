#!/usr/bin/env python3
"""Run the webcam audit with structured diagnostics and a GitHub-friendly summary."""
from __future__ import annotations

import json
import os
import sys
import time
import traceback
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests

import webcam_audit

ROOT = Path(__file__).resolve().parents[1]
LOG_DIR = ROOT / "audit" / "logs"
HTTP_LOG = LOG_DIR / "latest-http.jsonl"
SUMMARY_JSON = LOG_DIR / "latest-run.json"
SUMMARY_MD = LOG_DIR / "latest-summary.md"


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def safe_url(url: str) -> str:
    """Avoid accidentally persisting obvious secrets in query strings."""
    try:
        from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

        parts = urlsplit(url)
        hidden = {"key", "api_key", "apikey", "token", "access_token", "auth", "signature"}
        query = [(k, "[REDACTED]" if k.lower() in hidden else v) for k, v in parse_qsl(parts.query, keep_blank_values=True)]
        return urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(query), parts.fragment))
    except Exception:
        return url


class Diagnostics:
    def __init__(self) -> None:
        self.started_at = utc_now()
        self.started_monotonic = time.monotonic()
        self.http_events: list[dict[str, Any]] = []
        self.search_events: list[dict[str, Any]] = []
        self.check_events: list[dict[str, Any]] = []
        self.exceptions: list[dict[str, Any]] = []

    def append_http(self, event: dict[str, Any]) -> None:
        self.http_events.append(event)
        with HTTP_LOG.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(event, ensure_ascii=False) + "\n")

    def exception(self, scope: str, exc: BaseException, **context: Any) -> None:
        self.exceptions.append({
            "at": utc_now(),
            "scope": scope,
            "type": type(exc).__name__,
            "message": str(exc),
            "traceback": traceback.format_exc(),
            **context,
        })

    def build_summary(self, exit_code: int) -> dict[str, Any]:
        elapsed = round(time.monotonic() - self.started_monotonic, 2)
        statuses = Counter(str(event.get("status", "error")) for event in self.http_events)
        errors = Counter(event.get("error_type", "unknown") for event in self.http_events if event.get("error_type"))
        domains = Counter(event.get("domain", "") for event in self.http_events if event.get("domain"))
        blocked = sum(count for status, count in statuses.items() if status in {"401", "403", "429"})
        server_errors = sum(count for status, count in statuses.items() if status.isdigit() and int(status) >= 500)
        empty_searches = sum(1 for event in self.search_events if event["results"] == 0)
        by_municipality: dict[str, dict[str, Any]] = defaultdict(lambda: {"checks": 0, "seconds": 0.0, "urls": 0, "candidates": 0, "failed_checks": 0})
        for event in self.check_events:
            row = by_municipality[event["municipality"]]
            row["checks"] += 1
            row["seconds"] = round(row["seconds"] + event["seconds"], 2)
            row["urls"] += event.get("urls", 0)
            row["candidates"] += event.get("candidates", 0)
            row["failed_checks"] += int(event.get("status") == "error")

        return {
            "started_at": self.started_at,
            "finished_at": utc_now(),
            "duration_seconds": elapsed,
            "exit_code": exit_code,
            "result": "success" if exit_code == 0 else "failure",
            "configuration": {
                "serper_configured": bool(os.getenv("SERPER_API_KEY")),
                "audit_delay": os.getenv("AUDIT_DELAY", "default"),
                "arguments": sys.argv[1:],
            },
            "http": {
                "requests": len(self.http_events),
                "status_counts": dict(statuses),
                "blocked_401_403_429": blocked,
                "server_errors_5xx": server_errors,
                "error_counts": dict(errors),
                "slowest": sorted(self.http_events, key=lambda x: x.get("seconds", 0), reverse=True)[:20],
                "top_domains": domains.most_common(20),
            },
            "searches": {
                "total": len(self.search_events),
                "empty": empty_searches,
                "with_results": len(self.search_events) - empty_searches,
                "by_engine": dict(Counter(event["engine"] for event in self.search_events)),
            },
            "checks": {
                "total": len(self.check_events),
                "failed": sum(1 for event in self.check_events if event.get("status") == "error"),
                "municipalities": dict(by_municipality),
                "slowest": sorted(self.check_events, key=lambda x: x.get("seconds", 0), reverse=True)[:20],
            },
            "exceptions": self.exceptions,
        }


def markdown(summary: dict[str, Any]) -> str:
    http = summary["http"]
    searches = summary["searches"]
    checks = summary["checks"]
    icon = "✅" if summary["exit_code"] == 0 else "❌"
    lines = [
        f"# {icon} Portugal webcam audit",
        "",
        f"- **Result:** `{summary['result']}` (exit code `{summary['exit_code']}`)",
        f"- **Duration:** {summary['duration_seconds']} seconds",
        f"- **HTTP requests:** {http['requests']}",
        f"- **Blocked responses (401/403/429):** {http['blocked_401_403_429']}",
        f"- **Server errors (5xx):** {http['server_errors_5xx']}",
        f"- **Searches:** {searches['total']} ({searches['empty']} without results)",
        f"- **Checks:** {checks['total']} ({checks['failed']} failed)",
        f"- **SERPER configured:** {'yes' if summary['configuration']['serper_configured'] else 'no'}",
        "",
        "## Municipalities",
        "",
        "| Municipality | Checks | URLs | Candidates | Failed | Duration |",
        "|---|---:|---:|---:|---:|---:|",
    ]
    for municipality, data in checks["municipalities"].items():
        lines.append(f"| {municipality} | {data['checks']} | {data['urls']} | {data['candidates']} | {data['failed_checks']} | {data['seconds']}s |")
    lines.extend(["", "## HTTP status counts", "", "| Status | Count |", "|---|---:|"])
    for status, count in sorted(http["status_counts"].items()):
        lines.append(f"| {status} | {count} |")
    if summary["exceptions"]:
        lines.extend(["", "## Exceptions", ""])
        for item in summary["exceptions"][:20]:
            lines.append(f"- **{item['scope']} — {item['type']}:** {item['message']}")
    lines.extend(["", "Full request-level diagnostics are available in the workflow artifact and `audit/logs/latest-http.jsonl`.", ""])
    return "\n".join(lines)


def install_instrumentation(diag: Diagnostics) -> None:
    def diagnostic_get(self: webcam_audit.AuditCrawler, url: str):
        started = time.monotonic()
        event: dict[str, Any] = {"at": utc_now(), "method": "GET", "url": safe_url(url)}
        try:
            response = self.session.get(url, timeout=webcam_audit.TIMEOUT, allow_redirects=True)
            event.update({
                "status": response.status_code,
                "seconds": round(time.monotonic() - started, 3),
                "final_url": safe_url(response.url),
                "domain": requests.utils.urlparse(response.url).netloc.lower(),
                "content_type": response.headers.get("content-type", ""),
                "bytes": len(response.content),
            })
            diag.append_http(event)
            if response.status_code >= 400:
                print(f"HTTP {response.status_code} {event['seconds']}s {event['final_url']}", flush=True)
                return None
            return response
        except requests.RequestException as exc:
            event.update({
                "status": "error",
                "seconds": round(time.monotonic() - started, 3),
                "domain": requests.utils.urlparse(url).netloc.lower(),
                "error_type": type(exc).__name__,
                "error": str(exc),
            })
            diag.append_http(event)
            print(f"HTTP ERROR {event['error_type']} {event['seconds']}s {event['url']}: {exc}", flush=True)
            return None

    original_search = webcam_audit.AuditCrawler.search
    original_run_check = webcam_audit.AuditCrawler.run_check

    def diagnostic_search(self: webcam_audit.AuditCrawler, query: str, engine: str):
        started = time.monotonic()
        try:
            results = original_search(self, query, engine)
            event = {"at": utc_now(), "engine": engine, "query": query, "results": len(results), "seconds": round(time.monotonic() - started, 3)}
            diag.search_events.append(event)
            print(f"SEARCH {engine} results={len(results)} duration={event['seconds']}s query={query}", flush=True)
            return results
        except Exception as exc:
            diag.exception("search", exc, engine=engine, query=query)
            diag.search_events.append({"at": utc_now(), "engine": engine, "query": query, "results": 0, "seconds": round(time.monotonic() - started, 3), "error": repr(exc)})
            raise

    def diagnostic_run_check(self: webcam_audit.AuditCrawler, check_id: str, templates: list[str], municipality: str, region: str):
        started = time.monotonic()
        print(f"::group::{municipality} / {check_id}", flush=True)
        try:
            evidence, candidates = original_run_check(self, check_id, templates, municipality, region)
            event = {
                "at": utc_now(), "municipality": municipality, "region": region, "check_id": check_id,
                "status": "done", "seconds": round(time.monotonic() - started, 3),
                "urls": len(evidence.get("urls_checked", [])), "candidates": len(candidates),
            }
            diag.check_events.append(event)
            print(f"CHECK DONE urls={event['urls']} candidates={event['candidates']} duration={event['seconds']}s", flush=True)
            return evidence, candidates
        except Exception as exc:
            event = {"at": utc_now(), "municipality": municipality, "region": region, "check_id": check_id, "status": "error", "seconds": round(time.monotonic() - started, 3), "urls": 0, "candidates": 0, "error": repr(exc)}
            diag.check_events.append(event)
            diag.exception("check", exc, municipality=municipality, check_id=check_id)
            print(f"CHECK ERROR duration={event['seconds']}s error={exc!r}", flush=True)
            raise
        finally:
            print("::endgroup::", flush=True)

    webcam_audit.AuditCrawler.get = diagnostic_get
    webcam_audit.AuditCrawler.search = diagnostic_search
    webcam_audit.AuditCrawler.run_check = diagnostic_run_check


def main() -> int:
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    HTTP_LOG.write_text("", encoding="utf-8")
    diag = Diagnostics()
    install_instrumentation(diag)
    exit_code = 1
    try:
        exit_code = int(webcam_audit.main())
    except SystemExit as exc:
        exit_code = int(exc.code or 0)
    except Exception as exc:
        diag.exception("runner", exc)
        print(traceback.format_exc(), file=sys.stderr, flush=True)
        exit_code = 1
    finally:
        summary = diag.build_summary(exit_code)
        SUMMARY_JSON.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        SUMMARY_MD.write_text(markdown(summary), encoding="utf-8")
        print(f"Diagnostics written to {LOG_DIR}", flush=True)
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
