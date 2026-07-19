# Scholarship Opportunity Dashboard

A queryable, filterable database of scholarship opportunities built for two
student profiles — with columns for award amount, deadline, category
(school-specific / industry-major / minority-heritage / general), whether the
high school must formally nominate the student, and a direct link to the
official scholarship website.

**[Live view →](index.html)** (open via GitHub Pages once enabled, see below)

## Who this is built for

- **Candidate A** — First-year student entering Brown University in Fall
  2026. U.S. citizen, first time living/resident in the U.S. Admitted as
  Undeclared, intending Cognitive Neuroscience. Nigerian origin.
- **Candidate B** — Dual American/British citizen residing in the UK,
  entering 11th grade (Year 12). Interested in Business, Psychology, and
  Finance. Nigerian origin.

Every row is tagged with a plain-English "fit" note for each candidate —
whether it's directly actionable now, a future opportunity to plan toward, or
not applicable — instead of silently omitting scholarships that don't apply
to their current class year.

## What's in the box

```
index.html              the dashboard (open this)
assets/style.css         styling (light/dark aware, responsive)
assets/app.js             filtering, sorting, search, CSV export
data/scholarships.json   the database (source of truth, 38 entries)
data/scholarships.csv    spreadsheet-friendly mirror of the same data
scripts/build_csv.py     regenerates the CSV from the JSON
```

No build step, no server, no dependencies — it's plain HTML/CSS/JS that reads
`data/scholarships.json` with `fetch()`.

## Running it locally

Because the page loads `data/scholarships.json` via `fetch()`, opening
`index.html` directly from disk (`file://`) will be blocked by the browser's
CORS rules. Serve it over local HTTP instead:

```bash
python3 -m http.server 8000
# then open http://localhost:8000/
```

## Publishing on GitHub Pages

1. Push this repository to GitHub (already done if you're reading this from
   the repo).
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Pick the branch this content lives on and the **/ (root)** folder, then
   save.
5. GitHub will publish the site at
   `https://<your-username>.github.io/<repo-name>/` within a minute or two.

## How to use the dashboard

- **Search** matches scholarship name, provider, notes, field of study, and
  eligibility text.
- **Candidate match** filters to rows tagged as applicable (now or in the
  future) to Candidate A or Candidate B.
- **Category** filters by School-Specific, Major/Field-Specific,
  Minority/Heritage, or General/Merit.
- **Minority / heritage focus** isolates scholarships tied to a specific
  heritage or identity group (e.g. Black/African-descent, which Nigerian-
  origin students commonly qualify for).
- **Nomination required** isolates the scholarships where the high school
  (not the student) must formally submit a nomination — e.g. Cameron Impact
  Scholarship, United States Senate Youth Program, Posse Foundation, NSHSS
  membership, Carson Scholars Fund.
- **Award can reach $5,000+** is checked by default, matching the requested
  floor with no ceiling — uncheck it to see smaller awards that were kept in
  the database for completeness (e.g. junior-year "pipeline" scholarships).
- **Download CSV (current view)** exports exactly the filtered/sorted rows
  you're looking at.

## Important: verify before applying

**This is a curated starter database, not a live feed.** Every entry lists
an official `url` and a `last_verified` date, but scholarship amounts,
deadlines, and eligibility rules typically shift every year. Before either
candidate applies:

1. Open the official URL for that scholarship.
2. Confirm the current cycle's deadline, amount, and eligibility rules.
3. Pay special attention to residency/citizenship nuances flagged in the
   `residency_notes` field — several U.S. nomination-based programs (Posse,
   U.S. Senate Youth Program, Carson Scholars Fund) route nominations through
   *U.S.*-based high schools, which needs to be confirmed given Candidate B's
   UK residence.

## Extending the database

Add a new object to the `scholarships` array in `data/scholarships.json`
following the existing schema (see any entry for the full field list —
`amount_min`/`amount_max`, `deadline`, `category`, `field_of_study`,
`citizenship`, `minority_group`, `nomination_required`, `candidate_a_fit`,
`candidate_b_fit`, `url`, etc.), then regenerate the CSV mirror:

```bash
python3 scripts/build_csv.py
```

The dashboard's filter dropdowns (category, field of study, minority group)
are populated automatically from whatever values exist in the JSON — no
other code changes needed to add a new category or field tag.

## Research sources

Entries were researched against each scholarship provider's own site
(foundation pages, university financial-aid pages, professional-society
pages) in July 2026. A few figures (e.g. Jack Kent Cooke's per-year award,
Brown's total cost of attendance) were cross-checked against multiple current
sources to resolve conflicting numbers reported across secondary scholarship
directories.
