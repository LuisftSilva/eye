#!/usr/bin/env python3
"""Automated, evidence-first webcam discovery for Portuguese municipalities.

The crawler processes municipalities sequentially, records every check, detects media
endpoints, deduplicates against the published database, and only auto-publishes
high-confidence feeds from allow-listed providers or direct public media URLs.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import re
import sys
import time
import unicodedata
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable
from urllib.parse import parse_qs, quote_plus, urljoin, urlparse, urlunparse

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
AUDIT = ROOT / "audit"
EVIDENCE = AUDIT / "evidence"
DATA = ROOT / "data"
USER_AGENT = "PortugalWebcamAudit/1.0 (+https://github.com/LuisftSilva/eye)"
TIMEOUT = 18
MEDIA_RE = re.compile(r"https?://[^\s\"'<>]+?(?:\.m3u8|\.mpd|\.mjpg|\.mjpeg|snapshot(?:\.jpg)?|video\.cgi)(?:\?[^\s\"'<>]*)?", re.I)
IFRAME_HINTS = ("youtube.com/embed", "player.vimeo.com", "earthcam", "skylinewebcams", "beachcam", "windy.com/embed")
KNOWN_PROVIDER_DOMAINS = {
    "back-office.beachcam.pt": "MEO Beachcam",
    "beachcam.meo.pt": "MEO Beachcam",
    "spotazores.com": "SpotAzores",
    "www.spotazores.com": "SpotAzores",
    "netmadeira.com": "NetMadeira",
    "www.netmadeira.com": "NetMadeira",
    "skylinewebcams.com": "SkylineWebcams",
    "www.skylinewebcams.com": "SkylineWebcams",
    "earthcam.com": "EarthCam",
    "www.earthcam.com": "EarthCam",
    "portugalwebcams.pt": "PortugalWebcams",
    "www.portugalwebcams.pt": "PortugalWebcams",
}
SEARCH_TEMPLATES = [
    '"webcam" "{municipality}"', '"web cam" "{municipality}"',
    '"live cam" "{municipality}"', '"câmara ao vivo" "{municipality}"',
    '"camera ao vivo" "{municipality}"', '"transmissão em direto" "{municipality}"',
    '"live stream" "{municipality}" Portugal', 'site:.pt webcam "{municipality}"',
    'site:youtube.com live "{municipality}" Portugal', '"Axis" "{municipality}" camera',
    '"Mobotix" "{municipality}" camera', '"HLS" "{municipality}" webcam',
    '"mjpg" "{municipality}"', '"snapshot.jpg" "{municipality}"',
]
CHECKS = [
    ("official_municipality", ["site:cm-{slug}.pt webcam {municipality}", "site:{slug}.pt webcam {municipality}"]),
    ("tourism", ["turismo {municipality} webcam", "visit {municipality} live cam"]),
    ("google", SEARCH_TEMPLATES[:4]),
    ("bing", SEARCH_TEMPLATES[4:8]),
    ("duckduckgo", SEARCH_TEMPLATES[8:]),
    ("aggregators", ["site:portugalwebcams.pt {municipality}", "site:webcamgalore.com {municipality} Portugal", "site:skylinewebcams.com {municipality}", "site:earthcam.com {municipality}"]),
    ("beaches_surf", ["{municipality} praia webcam", "{municipality} surf webcam", "site:beachcam.pt {municipality}", "site:back-office.beachcam.pt/livecams {municipality}"]),
    ("ports_marinas", ["{municipality} porto marina webcam", "{municipality} clube náutico live cam"]),
    ("airports", ["{municipality} aeroporto aeródromo webcam"]),
    ("transport", ["{municipality} trânsito estrada webcam", "{municipality} estação ferrovia camera live"]),
    ("nature", ["{municipality} serra parque barragem miradouro webcam"]),
    ("hotels", ["{municipality} hotel resort webcam live"]),
    ("sports_golf", ["{municipality} golf ski desporto webcam"]),
    ("weather_observatories", ["{municipality} meteorologia observatório webcam", "site:ipma.pt {municipality} camera"]),
    ("social_video", ["site:youtube.com/watch {municipality} live webcam", "site:facebook.com {municipality} webcam live"]),
    ("technical", ["{municipality} m3u8 webcam", "{municipality} mjpeg camera", "{municipality} snapshot.jpg", "{municipality} iframe live"]),
]


def now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def slugify(value: str) -> str:
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", value).strip("-")


def normalize_url(url: str) -> str:
    try:
        p = urlparse(url.strip())
        host = p.netloc.lower().removeprefix("www.")
        path = re.sub(r"/+", "/", p.path).rstrip("/") or "/"
        query = parse_qs(p.query, keep_blank_values=False)
        for key in list(query):
            if key.lower().startswith("utm_") or key.lower() in {"fbclid", "gclid", "ref"}:
                query.pop(key, None)
        q = "&".join(f"{quote_plus(k)}={quote_plus(v)}" for k in sorted(query) for v in sorted(query[k]))
        return urlunparse((p.scheme.lower() or "https", host, path, "", q, ""))
    except Exception:
        return url.strip()


def domain(url: str) -> str:
    return urlparse(url).netloc.lower()


@dataclass
class Candidate:
    name: str
    municipality: str
    region: str
    source_url: str
    media_url: str
    provider: str
    status: str
    confidence: int
    evidence: list[str]
    discovered_at: str

    @property
    def key(self) -> str:
        return normalize_url(self.media_url or self.source_url)


class AuditCrawler:
    def __init__(self, delay: float = 1.2, max_results: int = 8, dry_run: bool = False):
        self.delay = delay
        self.max_results = max_results
        self.dry_run = dry_run
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": USER_AGENT, "Accept-Language": "pt-PT,pt;q=0.9,en;q=0.7"})
        self.seen_urls: set[str] = set()
        self.published = self._load_published()

    def _load_published(self) -> dict[str, dict]:
        result: dict[str, dict] = {}
        path = DATA / "cameras.json"
        if path.exists():
            for cam in json.loads(path.read_text(encoding="utf-8")):
                for key in (cam.get("embedUrl"), cam.get("sourceUrl")):
                    if key:
                        result[normalize_url(key)] = cam
        auto = AUDIT / "auto-cameras.json"
        if auto.exists():
            for cam in json.loads(auto.read_text(encoding="utf-8")):
                for key in (cam.get("embedUrl"), cam.get("sourceUrl")):
                    if key:
                        result[normalize_url(key)] = cam
        return result

    def get(self, url: str) -> requests.Response | None:
        try:
            time.sleep(self.delay)
            response = self.session.get(url, timeout=TIMEOUT, allow_redirects=True)
            if response.status_code >= 400:
                return None
            return response
        except requests.RequestException:
            return None

    def search(self, query: str, engine: str) -> list[str]:
        if engine == "google" and os.getenv("SERPER_API_KEY"):
            try:
                r = self.session.post("https://google.serper.dev/search", json={"q": query, "gl": "pt", "hl": "pt-pt", "num": self.max_results}, headers={"X-API-KEY": os.environ["SERPER_API_KEY"]}, timeout=TIMEOUT)
                r.raise_for_status()
                return [x["link"] for x in r.json().get("organic", []) if x.get("link")]
            except requests.RequestException:
                return []
        if engine == "bing":
            url = "https://www.bing.com/search?q=" + quote_plus(query) + "&count=" + str(self.max_results)
            selector = "li.b_algo h2 a"
        else:
            url = "https://html.duckduckgo.com/html/?q=" + quote_plus(query)
            selector = "a.result__a"
        r = self.get(url)
        if not r:
            return []
        soup = BeautifulSoup(r.text, "html.parser")
        links = []
        for a in soup.select(selector):
            href = a.get("href", "")
            if engine != "bing" and "uddg=" in href:
                href = parse_qs(urlparse(href).query).get("uddg", [href])[0]
            if href.startswith("http"):
                links.append(href)
        return links[: self.max_results]

    def inspect(self, url: str, municipality: str, region: str) -> list[Candidate]:
        nurl = normalize_url(url)
        if nurl in self.seen_urls:
            return []
        self.seen_urls.add(nurl)
        r = self.get(url)
        if not r:
            return []
        final_url = r.url
        ctype = r.headers.get("content-type", "").lower()
        provider = KNOWN_PROVIDER_DOMAINS.get(domain(final_url), domain(final_url) or "Unknown")
        direct_media = any(x in ctype for x in ("application/vnd.apple.mpegurl", "video/", "multipart/x-mixed-replace")) or MEDIA_RE.search(final_url)
        if direct_media:
            return [Candidate(municipality, municipality, region, final_url, final_url, provider, "new", 100, ["Direct public media endpoint responded successfully."], now())]
        if "html" not in ctype and not final_url.lower().endswith((".htm", ".html", "/")):
            return []
        text = r.text[:2_000_000]
        soup = BeautifulSoup(text, "html.parser")
        title = soup.title.get_text(" ", strip=True) if soup.title else municipality
        visible = soup.get_text(" ", strip=True).lower()
        municipality_match = slugify(municipality).replace("-", " ") in slugify(visible).replace("-", " ")
        found: list[Candidate] = []
        media_urls = set(MEDIA_RE.findall(text))
        for tag in soup.find_all(["iframe", "video", "source", "img"]):
            attr = tag.get("src") or tag.get("data-src") or tag.get("data-url")
            if not attr:
                continue
            absolute = urljoin(final_url, attr)
            if MEDIA_RE.search(absolute) or any(h in absolute.lower() for h in IFRAME_HINTS):
                media_urls.add(absolute)
        for media in media_urls:
            score = 45
            evidence = [f"Media or player URL extracted from {final_url}."]
            if municipality_match:
                score += 20
                evidence.append("Municipality name appears in page content.")
            if domain(final_url) in KNOWN_PROVIDER_DOMAINS:
                score += 25
                evidence.append("Source belongs to an allow-listed webcam provider.")
            if MEDIA_RE.search(media):
                score += 15
                evidence.append("Extracted URL has a direct streaming/snapshot signature.")
            score = min(score, 100)
            status = "new" if score >= 85 else "possible_duplicate" if score >= 65 else "rejected"
            found.append(Candidate(title[:140], municipality, region, final_url, media, provider, status, score, evidence, now()))
        if not found and domain(final_url) in KNOWN_PROVIDER_DOMAINS and municipality_match and any(k in visible for k in ("webcam", "livecam", "direto", "ao vivo")):
            found.append(Candidate(title[:140], municipality, region, final_url, "", provider, "new", 86, ["Allow-listed provider page identifies the municipality and a live webcam."], now()))
        return found

    def dedupe(self, candidates: Iterable[Candidate]) -> list[Candidate]:
        unique: dict[str, Candidate] = {}
        for c in candidates:
            if c.key in self.published:
                c.status = "duplicate"
                c.evidence.append(f"Matches published camera {self.published[c.key].get('id', '')}.")
            current = unique.get(c.key)
            if not current or c.confidence > current.confidence:
                unique[c.key] = c
        return list(unique.values())

    def run_check(self, check_id: str, templates: list[str], municipality: str, region: str) -> tuple[dict, list[Candidate]]:
        slug = slugify(municipality)
        queries = [q.format(municipality=municipality, slug=slug) for q in templates]
        checked_urls: list[str] = []
        candidates: list[Candidate] = []
        for query in queries:
            engines = ["bing", "duckduckgo"]
            if check_id == "google":
                engines = ["google"] if os.getenv("SERPER_API_KEY") else ["duckduckgo"]
            elif check_id == "bing":
                engines = ["bing"]
            elif check_id == "duckduckgo":
                engines = ["duckduckgo"]
            for engine in engines:
                for link in self.search(query, engine):
                    checked_urls.append(link)
                    candidates.extend(self.inspect(link, municipality, region))
        candidates = self.dedupe(candidates)
        evidence = {
            "check_id": check_id,
            "status": "done",
            "queries": queries,
            "urls_checked": list(dict.fromkeys(checked_urls)),
            "candidates_found": [asdict(c) for c in candidates],
            "notes": f"{len(checked_urls)} URLs checked; {len(candidates)} candidate(s) classified.",
            "checked_at": now(),
            "reviewer": "github-actions:webcam-audit",
        }
        return evidence, candidates


def read_municipalities() -> list[dict[str, str]]:
    with (AUDIT / "municipalities.csv").open(encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def completed_ids() -> set[str]:
    p = AUDIT / "progress-current.json"
    if p.exists():
        return set(json.loads(p.read_text(encoding="utf-8")).get("completed", []))
    return set()


def camera_from_candidate(c: Candidate, index: int) -> dict:
    digest = hashlib.sha1(c.key.encode()).hexdigest()[:10]
    return {
        "id": f"auto-{slugify(c.municipality)}-{digest}", "name": c.name or c.municipality,
        "city": c.municipality, "region": c.region, "country": "Portugal",
        "lat": None, "lng": None, "category": "other", "status": "online",
        "provider": c.provider, "sourceUrl": c.source_url, "embedUrl": c.media_url,
        "description": "Webcam pública descoberta e validada automaticamente; coordenadas pendentes quando não fornecidas pela origem.",
        "verifiedAt": c.discovered_at[:10], "verification": "automated-high-confidence",
        "uniqueFeed": True, "tags": [c.region, c.municipality, "automated", c.provider],
    }


def save_auto_cameras(candidates: list[Candidate]) -> int:
    path = AUDIT / "auto-cameras.json"
    existing = json.loads(path.read_text(encoding="utf-8")) if path.exists() else []
    keys = {normalize_url(x.get("embedUrl") or x.get("sourceUrl", "")) for x in existing}
    added = 0
    for i, c in enumerate(candidates):
        if c.status == "new" and c.confidence >= 85 and c.key not in keys:
            existing.append(camera_from_candidate(c, i)); keys.add(c.key); added += 1
    path.write_text(json.dumps(existing, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return added


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=3, help="Maximum municipalities per run")
    parser.add_argument("--municipality-id")
    parser.add_argument("--delay", type=float, default=float(os.getenv("AUDIT_DELAY", "1.2")))
    parser.add_argument("--max-results", type=int, default=8)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    rows = read_municipalities(); done = completed_ids()
    targets = [r for r in rows if r["id"] not in done]
    if args.municipality_id:
        targets = [r for r in rows if r["id"] == args.municipality_id]
    targets = targets[: args.limit]
    if not targets:
        print("No municipalities left to process."); return 0
    crawler = AuditCrawler(args.delay, args.max_results, args.dry_run)
    all_candidates: list[Candidate] = []
    run_summary = {"started_at": now(), "municipalities": [], "errors": []}
    for row in targets:
        municipality = row["municipality"]; region = row["region"]
        record = {"municipality_id": row["id"], "order": int(row["order"]), "municipality": municipality,
                  "district": region, "status": "review", "started_at": now(),
                  "reviewer": "github-actions:webcam-audit", "checks": [], "candidates": []}
        try:
            municipality_candidates: list[Candidate] = []
            for check_id, templates in CHECKS:
                ev, found = crawler.run_check(check_id, templates, municipality, region)
                record["checks"].append(ev); municipality_candidates.extend(found)
            municipality_candidates = crawler.dedupe(municipality_candidates)
            record["candidates"] = [asdict(c) for c in municipality_candidates]
            record["checks_completed"] = len(record["checks"]); record["checks_total"] = len(CHECKS)
            record["finished_at"] = now(); all_candidates.extend(municipality_candidates)
            (EVIDENCE / f"{row['id']}.json").write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            run_summary["municipalities"].append({"id": row["id"], "candidates": len(municipality_candidates)})
        except Exception as exc:
            record["status"] = "blocked"; record["error"] = repr(exc)
            (EVIDENCE / f"{row['id']}.json").write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            run_summary["errors"].append({"id": row["id"], "error": repr(exc)})
    added = save_auto_cameras(crawler.dedupe(all_candidates))
    run_summary["finished_at"] = now(); run_summary["auto_published"] = added
    (AUDIT / "last-automated-run.json").write_text(json.dumps(run_summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(run_summary, ensure_ascii=False, indent=2))
    return 1 if run_summary["errors"] else 0

if __name__ == "__main__":
    sys.exit(main())
