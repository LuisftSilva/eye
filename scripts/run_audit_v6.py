#!/usr/bin/env python3
"""Compatibility entrypoint for the current Portugal webcam audit profile."""
from __future__ import annotations

import runpy

if __name__ == "__main__":
    runpy.run_module("run_audit_v7", run_name="__main__")
