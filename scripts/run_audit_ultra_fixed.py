#!/usr/bin/env python3
"""Validated entrypoint for the comprehensive 16-check webcam audit profile."""
from __future__ import annotations

import webcam_audit
import run_audit_ultra  # noqa: F401 - installs source matrix and hardened crawler

raw = {
    check_id: [template.replace("{region}", "Portugal") for template in templates]
    for check_id, templates in webcam_audit.CHECKS
}

# Preserve the audit contract of exactly 16 checks while retaining every expanded query.
webcam_audit.CHECKS = [
    ("official_municipality", raw["official_municipality"]),
    ("official_tourism", raw["official_tourism"]),
    ("google", raw["google"]),
    ("bing", raw["bing"]),
    ("duckduckgo", raw["duckduckgo"]),
    ("aggregators", raw["aggregators"] + raw["regional_webcam_networks"]),
    ("beaches_surf", raw["beaches_surf"]),
    ("ports_marinas_nautical", raw["ports_marinas_nautical"]),
    ("airports_aerodromes", raw["airports_aerodromes"]),
    ("traffic_transport_rail", raw["traffic_transport_rail"]),
    ("nature_mountains_parks_dams", raw["nature_mountains_parks_dams"]),
    ("hotels_resorts_lodging", raw["hotels_resorts_lodging"]),
    ("sports_golf_ski", raw["sports_golf_ski"]),
    ("weather_universities_observatories", raw["weather_observatories"] + raw["universities_science"]),
    ("social_video", raw["social_video"]),
    ("technical_discovery", raw["technical_discovery"]),
]

import run_audit_diagnostics

if __name__ == "__main__":
    raise SystemExit(run_audit_diagnostics.main())
