#!/usr/bin/env python3
"""Regenerate data/scholarships.csv from data/scholarships.json.

Run this after editing the JSON database so the CSV mirror stays in sync:
    python3 scripts/build_csv.py
"""
import csv
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "data" / "scholarships.json"
DST = ROOT / "data" / "scholarships.csv"

FIELDS = [
    "id",
    "name",
    "provider",
    "amount_display",
    "amount_min",
    "amount_max",
    "deadline",
    "category",
    "field_of_study",
    "eligible_stage",
    "citizenship",
    "minority_group",
    "school_specific",
    "nomination_required",
    "nomination_notes",
    "candidate_a_fit",
    "candidate_b_fit",
    "notes",
    "url",
    "last_verified",
]


def join(value):
    if isinstance(value, list):
        return "; ".join(value)
    if value is None:
        return ""
    return value


def main():
    data = json.loads(SRC.read_text())
    with DST.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(FIELDS)
        for s in data["scholarships"]:
            writer.writerow([join(s.get(field)) for field in FIELDS])
    print(f"Wrote {DST} ({len(data['scholarships'])} rows)")


if __name__ == "__main__":
    main()
