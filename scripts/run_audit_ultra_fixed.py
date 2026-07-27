#!/usr/bin/env python3
"""Validated entrypoint for the comprehensive webcam audit profile."""
from __future__ import annotations

import webcam_audit
import run_audit_ultra  # noqa: F401 - installs source matrix and hardened crawler

# The base evidence runner supports municipality and slug placeholders. Normalize any
# optional profile placeholders here so a future source-list edit cannot abort a run.
webcam_audit.CHECKS = [
    (check_id, [template.replace("{region}", "Portugal") for template in templates])
    for check_id, templates in webcam_audit.CHECKS
]

import run_audit_diagnostics

if __name__ == "__main__":
    raise SystemExit(run_audit_diagnostics.main())
