#!/usr/bin/env python3
"""Weekly automated check for data/scholarships.json.

Verifies that each scholarship's URL still resolves and flags entries whose
`last_verified` date is more than STALE_DAYS old. This script never edits
scholarships.json — it only writes check-report.md for a human (or a future
Claude Code session) to act on. Amounts and deadlines require reading and
understanding each provider's page, which this script does not attempt.
"""
import json
import os
import pathlib
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "scholarships.json"
REPORT = ROOT / "check-report.md"

STALE_DAYS = 180
TIMEOUT = 12
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36 "
    "ScholarshipDashboardLinkChecker/1.0"
)

# Some providers' WAFs (Cloudflare, etc.) reject automated requests with
# these codes even when the page is genuinely fine, so they're reported
# separately from confirmed-dead links rather than lumped in as "broken".
BOT_BLOCK_CODES = {401, 403, 429, 503}


def check_url(url):
    """Return (status_code_or_None, error_message_or_None)."""
    for method in ("HEAD", "GET"):
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT}, method=method)
        try:
            with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
                return resp.status, None
        except urllib.error.HTTPError as e:
            if method == "HEAD" and e.code in (405, 403):
                continue  # some sites reject HEAD; retry with GET
            return e.code, str(e)
        except Exception as e:  # noqa: BLE001 - deliberately broad for a network probe
            if method == "HEAD":
                continue
            return None, str(e)
    return None, "unreachable"


def main():
    data = json.loads(DATA.read_text())
    scholarships = data["scholarships"]
    today = datetime.now(timezone.utc).date()

    broken = []
    uncertain = []
    stale = []

    for s in scholarships:
        status, err = check_url(s["url"])
        if status is not None and 200 <= status < 400:
            pass
        elif status in BOT_BLOCK_CODES:
            uncertain.append((s["id"], s["name"], s["url"], status))
        else:
            broken.append((s["id"], s["name"], s["url"], status, err))

        try:
            verified = datetime.strptime(s["last_verified"], "%Y-%m-%d").date()
            age_days = (today - verified).days
        except (KeyError, ValueError):
            age_days = None
        if age_days is not None and age_days > STALE_DAYS:
            stale.append((s["id"], s["name"], s["url"], age_days))

    lines = [
        f"# Scholarship Data Check — {today.isoformat()}",
        "",
        f"Checked **{len(scholarships)}** entries in `data/scholarships.json`.",
        "",
        "This is an automated mechanical check (link status + data age). It does "
        "**not** verify whether amounts, deadlines, or eligibility rules are still "
        "correct — that needs a human (or a re-research pass) reading the actual "
        "page. Review flagged rows against their official URL before relying on "
        "them.",
        "",
        f"## 🔗 Confirmed broken links ({len(broken)})",
        "",
    ]

    if broken:
        lines += ["| ID | Name | URL | Status |", "|---|---|---|---|"]
        lines += [
            f"| {id_} | {name} | {url} | {status if status else (err or 'error')} |"
            for id_, name, url, status, err in broken
        ]
    else:
        lines.append("None.")
    lines.append("")

    lines += [f"## ⚠️ Blocked or uncertain — needs a manual look ({len(uncertain)})", ""]
    if uncertain:
        lines.append(
            "These returned a status commonly caused by bot-blocking (Cloudflare, "
            "rate limits, etc.), not necessarily a dead page. Open each one by hand."
        )
        lines.append("")
        lines += ["| ID | Name | URL | Status |", "|---|---|---|---|"]
        lines += [f"| {id_} | {name} | {url} | {status} |" for id_, name, url, status in uncertain]
    else:
        lines.append("None.")
    lines.append("")

    lines += [f"## 🕒 Not re-verified in {STALE_DAYS}+ days ({len(stale)})", ""]
    if stale:
        lines += ["| ID | Name | URL | Days since last_verified |", "|---|---|---|---|"]
        lines += [f"| {id_} | {name} | {url} | {age} |" for id_, name, url, age in stale]
    else:
        lines.append("None.")
    lines.append("")

    report = "\n".join(lines)
    REPORT.write_text(report)
    print(report)

    output_file = os.environ.get("GITHUB_OUTPUT")
    if output_file:
        with open(output_file, "a") as f:
            f.write(f"broken_count={len(broken)}\n")
            f.write(f"uncertain_count={len(uncertain)}\n")
            f.write(f"stale_count={len(stale)}\n")

    return 0


if __name__ == "__main__":
    sys.exit(main())
