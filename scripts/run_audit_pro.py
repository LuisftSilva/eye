#!/usr/bin/env python3
"""Harden the existing webcam crawler without changing its evidence contract."""
from __future__ import annotations

import os
import random
import re
import time
from typing import Iterable
from urllib.parse import parse_qs, quote_plus, unquote, urljoin, urlparse

import requests
from bs4 import BeautifulSoup
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

import webcam_audit

CONNECT_TIMEOUT = float(os.getenv("AUDIT_CONNECT_TIMEOUT", "8"))
READ_TIMEOUT = float(os.getenv("AUDIT_READ_TIMEOUT", "20"))
RETRIES = int(os.getenv("AUDIT_RETRIES", "3"))
BACKOFF = float(os.getenv("AUDIT_RETRY_BACKOFF", "0.8"))
MAX_PAGE_BYTES = int(os.getenv("AUDIT_MAX_PAGE_BYTES", "3000000"))

EXTRA_MEDIA_RE = re.compile(
    r"https?://[^\s\"'<>\\]+?(?:\.m3u8|\.mpd|\.mjpg|\.mjpeg|snapshot(?:\.jpg)?|video\.cgi|videostream\.cgi|axis-cgi/mjpg/video\.cgi)(?:\?[^\s\"'<>\\]*)?",
    re.I,
)
SCRIPT_MEDIA_RE = re.compile(
    r"(?:src|url|file|stream|hls|manifest|playlist)\s*[:=]\s*[\"']([^\"']+(?:\.m3u8|\.mpd|\.mjpg|\.mjpeg|snapshot(?:\.jpg)?|video\.cgi)[^\"']*)[\"']",
    re.I,
)
PLAYER_HINTS = webcam_audit.IFRAME_HINTS + (
    "youtube-nocookie.com/embed", "ipcamlive.com", "webcamtaxi.com", "player.twitch.tv"
)
SEARCH_DOMAINS = {
    "bing.com", "www.bing.com", "duckduckgo.com", "html.duckduckgo.com",
    "lite.duckduckgo.com", "google.com", "www.google.com", "mojeek.com", "www.mojeek.com",
}

webcam_audit.KNOWN_PROVIDER_DOMAINS.update({
    "webcamtaxi.com": "WebcamTaxi",
    "www.webcamtaxi.com": "WebcamTaxi",
    "ipcamlive.com": "IPCamLive",
    "www.ipcamlive.com": "IPCamLive",
})


def unique_urls(urls: Iterable[str], limit: int | None = None) -> list[str]:
    result: list[str] = []
    seen: set[str] = set()
    for url in urls:
        if not isinstance(url, str) or not url.startswith(("http://", "https://")):
            continue
        if urlparse(url).netloc.lower() in SEARCH_DOMAINS:
            continue
        key = webcam_audit.normalize_url(url)
        if not key or key in seen:
            continue
        seen.add(key)
        result.append(url)
        if limit and len(result) >= limit:
            break
    return result


def hardened_init(self, delay: float = 0.6, max_results: int = 10, dry_run: bool = False):
    self.delay = max(0.0, delay)
    self.max_results = max(1, max_results)
    self.dry_run = dry_run
    self.session = requests.Session()
    retry = Retry(
        total=RETRIES,
        connect=RETRIES,
        read=RETRIES,
        status=RETRIES,
        backoff_factor=BACKOFF,
        status_forcelist=(408, 425, 429, 500, 502, 503, 504),
        allowed_methods=frozenset({"GET", "HEAD", "POST"}),
        respect_retry_after_header=True,
        raise_on_status=False,
    )
    adapter = HTTPAdapter(max_retries=retry, pool_connections=20, pool_maxsize=20)
    self.session.mount("https://", adapter)
    self.session.mount("http://", adapter)
    self.session.headers.update({
        "User-Agent": "Mozilla/5.0 (compatible; PortugalWebcamAudit/2.0; +https://github.com/LuisftSilva/eye)",
        "Accept-Language": "pt-PT,pt;q=0.9,en;q=0.7",
        "Accept": "text/html,application/xhtml+xml,application/json,application/vnd.apple.mpegurl,video/*;q=0.9,*/*;q=0.8",
        "Cache-Control": "no-cache",
    })
    self.seen_urls = set()
    self.published = self._load_published()


def hardened_get(self, url: str):
    try:
        if self.delay:
            time.sleep(self.delay + random.uniform(0, min(0.25, self.delay / 2)))
        response = self.session.get(
            url,
            timeout=(CONNECT_TIMEOUT, READ_TIMEOUT),
            allow_redirects=True,
        )
        if response.status_code >= 400:
            return None
        return response
    except requests.RequestException:
        return None


def serper(self, query: str) -> list[str]:
    key = os.getenv("SERPER_API_KEY")
    if not key:
        return []
    try:
        response = self.session.post(
            "https://google.serper.dev/search",
            json={"q": query, "gl": "pt", "hl": "pt-pt", "num": self.max_results},
            headers={"X-API-KEY": key, "Content-Type": "application/json"},
            timeout=(CONNECT_TIMEOUT, READ_TIMEOUT),
        )
        response.raise_for_status()
        return unique_urls((row.get("link", "") for row in response.json().get("organic", [])), self.max_results)
    except (requests.RequestException, ValueError):
        return []


def bing(self, query: str) -> list[str]:
    response = self.get(f"https://www.bing.com/search?q={quote_plus(query)}&count={self.max_results}&setlang=pt-PT")
    if not response:
        return []
    soup = BeautifulSoup(response.text, "html.parser")
    return unique_urls((a.get("href", "") for a in soup.select("li.b_algo h2 a, #b_results h2 a")), self.max_results)


def duckduckgo(self, query: str) -> list[str]:
    endpoints = (
        f"https://html.duckduckgo.com/html/?q={quote_plus(query)}",
        f"https://lite.duckduckgo.com/lite/?q={quote_plus(query)}",
    )
    for endpoint in endpoints:
        response = self.get(endpoint)
        if not response:
            continue
        soup = BeautifulSoup(response.text, "html.parser")
        links: list[str] = []
        for anchor in soup.select("a.result__a, a.result-link, td.result-link a"):
            href = anchor.get("href", "")
            if "uddg=" in href:
                href = parse_qs(urlparse(href).query).get("uddg", [href])[0]
            href = unquote(href)
            if href.startswith("http"):
                links.append(href)
        found = unique_urls(links, self.max_results)
        if found:
            return found
    return []


def mojeek(self, query: str) -> list[str]:
    response = self.get(f"https://www.mojeek.com/search?q={quote_plus(query)}")
    if not response:
        return []
    soup = BeautifulSoup(response.text, "html.parser")
    return unique_urls((a.get("href", "") for a in soup.select("a.ob, ul.results-standard h2 a")), self.max_results)


def hardened_search(self, query: str, engine: str) -> list[str]:
    strategies = {
        "google": (serper, bing, duckduckgo, mojeek),
        "bing": (bing, duckduckgo, mojeek),
        "duckduckgo": (duckduckgo, bing, mojeek),
    }.get(engine, (bing, duckduckgo, mojeek))
    collected: list[str] = []
    for strategy in strategies:
        try:
            collected.extend(strategy(self, query))
        except Exception:
            continue
        collected = unique_urls(collected, self.max_results)
        if len(collected) >= self.max_results:
            break
    return collected


def validate_media(self, url: str) -> tuple[bool, str]:
    try:
        response = self.session.get(
            url,
            timeout=(CONNECT_TIMEOUT, READ_TIMEOUT),
            allow_redirects=True,
            stream=True,
            headers={"Range": "bytes=0-4095"},
        )
        if response.status_code >= 400:
            return False, ""
        ctype = response.headers.get("content-type", "").lower()
        valid = any(token in ctype for token in (
            "application/vnd.apple.mpegurl", "application/x-mpegurl", "application/dash+xml",
            "video/", "multipart/x-mixed-replace", "image/jpeg",
        )) or bool(EXTRA_MEDIA_RE.search(response.url))
        return valid, response.url
    except requests.RequestException:
        return False, ""


def hardened_inspect(self, url: str, municipality: str, region: str):
    key = webcam_audit.normalize_url(url)
    if key in self.seen_urls:
        return []
    self.seen_urls.add(key)
    response = self.get(url)
    if not response:
        return []
    final_url = response.url
    ctype = response.headers.get("content-type", "").lower()
    provider = webcam_audit.KNOWN_PROVIDER_DOMAINS.get(webcam_audit.domain(final_url), webcam_audit.domain(final_url) or "Unknown")
    direct = any(token in ctype for token in (
        "application/vnd.apple.mpegurl", "application/x-mpegurl", "application/dash+xml",
        "video/", "multipart/x-mixed-replace",
    )) or bool(EXTRA_MEDIA_RE.search(final_url))
    if direct:
        return [webcam_audit.Candidate(municipality, municipality, region, final_url, final_url, provider, "new", 100, ["Direct public media endpoint responded successfully."], webcam_audit.now())]
    if "html" not in ctype and not final_url.lower().endswith((".htm", ".html", "/")):
        return []

    text = response.text[:MAX_PAGE_BYTES]
    soup = BeautifulSoup(text, "html.parser")
    title = soup.title.get_text(" ", strip=True) if soup.title else municipality
    visible = webcam_audit.slugify(soup.get_text(" ", strip=True)).replace("-", " ")
    municipality_match = webcam_audit.slugify(municipality).replace("-", " ") in visible
    webcam_context = any(term in visible for term in ("webcam", "live cam", "camera ao vivo", "camara ao vivo", "direto"))

    media_urls = set(EXTRA_MEDIA_RE.findall(text))
    media_urls.update(urljoin(final_url, value) for value in SCRIPT_MEDIA_RE.findall(text))
    for tag in soup.find_all(["iframe", "video", "source", "img", "a"]):
        for attr in (tag.get("src"), tag.get("data-src"), tag.get("data-url"), tag.get("href"), tag.get("poster")):
            if not attr:
                continue
            absolute = urljoin(final_url, attr)
            if EXTRA_MEDIA_RE.search(absolute) or any(hint in absolute.lower() for hint in PLAYER_HINTS):
                media_urls.add(absolute)

    found = []
    for media in unique_urls(media_urls):
        score = 40
        evidence = [f"Media/player URL extracted from {final_url}."]
        if municipality_match:
            score += 20
            evidence.append("Municipality name appears in page content.")
        if webcam_audit.domain(final_url) in webcam_audit.KNOWN_PROVIDER_DOMAINS:
            score += 20
            evidence.append("Source belongs to an allow-listed webcam provider.")
        if EXTRA_MEDIA_RE.search(media):
            valid, resolved = validate_media(self, media)
            if valid:
                media = resolved or media
                score += 25
                evidence.append("Media endpoint responded with a compatible stream/image content type.")
            else:
                score -= 10
                evidence.append("Media signature found but endpoint validation failed.")
        elif any(hint in media.lower() for hint in PLAYER_HINTS):
            score += 15
            evidence.append("Known public embedded-player provider.")
        if not municipality_match and not webcam_context:
            score -= 20
        score = max(0, min(score, 100))
        status = "new" if score >= 90 else "possible_duplicate" if score >= 65 else "rejected"
        found.append(webcam_audit.Candidate(title[:140], municipality, region, final_url, media, provider, status, score, evidence, webcam_audit.now()))
    return found


webcam_audit.AuditCrawler.__init__ = hardened_init
webcam_audit.AuditCrawler.get = hardened_get
webcam_audit.AuditCrawler.search = hardened_search
webcam_audit.AuditCrawler.inspect = hardened_inspect
webcam_audit.TIMEOUT = max(CONNECT_TIMEOUT, READ_TIMEOUT)

# Raise publication confidence and require a verified playable media URL.
_original_save = webcam_audit.save_auto_cameras

def safe_save(candidates):
    filtered = [c for c in candidates if c.status == "new" and c.confidence >= 90 and c.media_url]
    return _original_save(filtered)

webcam_audit.save_auto_cameras = safe_save

import run_audit_diagnostics

if __name__ == "__main__":
    raise SystemExit(run_audit_diagnostics.main())
