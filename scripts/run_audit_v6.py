#!/usr/bin/env python3
"""Strict relevance layer for the daily Portugal webcam audit."""
from __future__ import annotations

from urllib.parse import urlparse

import webcam_audit
import run_audit_v5 as v5

v5.RELEVANCE_VERSION = 2


def strict_relevant_url(url: str, municipality: str, query: str) -> bool:
    parsed = urlparse(url)
    host = parsed.netloc.lower().split(":")[0]
    haystack = f"{host}{parsed.path}?{parsed.query}".lower()
    municipality_slug = webcam_audit.slugify(municipality)
    municipality_tokens = [token for token in municipality_slug.split("-") if len(token) >= 4]
    query_lower = query.lower()

    accepted = False
    if host in v5.NOISE_HOSTS:
        accepted = False
    elif query_lower.startswith("site:"):
        # Search engines may ignore site:. Only the requested host is valid.
        requested_host = query_lower.split()[0].removeprefix("site:").strip(".")
        accepted = host == requested_host or host.endswith("." + requested_host)
    elif host in v5.TRUSTED_HOSTS:
        # A trusted host is not enough: require a location signal in the URL.
        accepted = any(token in haystack for token in municipality_tokens)
    elif host.endswith(".pt") and any(hint in haystack for hint in v5.WEBCAM_HINTS):
        accepted = any(token in haystack for token in municipality_tokens)
    elif any(token in haystack for token in municipality_tokens) and any(hint in haystack for hint in v5.WEBCAM_HINTS):
        accepted = True

    v5._relevance_stats["accepted" if accepted else "rejected"] += 1
    return accepted


v5._relevant_url = strict_relevant_url


if __name__ == "__main__":
    v5.prepare_relevance_migration()
    try:
        raise SystemExit(v5.run_audit_v4.run_audit_v3.main())
    finally:
        v5.persist_provider_health()
