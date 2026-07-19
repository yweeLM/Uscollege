(function () {
  "use strict";

  const CATEGORY_CLASS = {
    "General / Merit": "tag-general",
    "School-Specific (Brown)": "tag-school",
    "School-Specific (other)": "tag-school",
    "Major / Field-Specific (Business/Finance)": "tag-major",
    "Major / Field-Specific (Neuroscience/STEM)": "tag-major",
    "Major / Field-Specific (Neuroscience/Psychology)": "tag-major",
    "Major / Field-Specific (STEM)": "tag-major",
    "Major / Field-Specific (Study Abroad)": "tag-major",
    "Minority / Heritage": "tag-minority",
    "Leadership": "tag-leadership",
    "International / UK-Specific": "tag-intl"
  };

  function tagClass(cat) {
    return CATEGORY_CLASS[cat] || "tag-general";
  }

  function fitClass(text) {
    if (!text) return "fit-na";
    const t = text.toLowerCase();
    if (t.startsWith("not applicable")) return "fit-na";
    if (t.startsWith("directly") || t.startsWith("strong")) return "fit-strong";
    return "fit-future";
  }

  let DATA = null;
  let META = null;

  fetch("data/scholarships.json")
    .then((r) => r.json())
    .then((json) => {
      META = json.meta;
      DATA = json.scholarships;
      init();
    })
    .catch((err) => {
      document.getElementById("tableBody").innerHTML =
        '<tr><td colspan="11">Could not load data/scholarships.json — ' +
        "if you're viewing this file directly from disk, serve it over " +
        "HTTP (e.g. <code>python3 -m http.server</code>) or view it via GitHub Pages. (" +
        String(err) +
        ")</td></tr>";
    });

  function init() {
    document.getElementById("disclaimerText").textContent = META.disclaimer;
    document.getElementById("lastUpdated").textContent = META.last_updated;
    renderCandidateCards();
    populateFilterOptions();
    wireControls();
    render();
  }

  function renderCandidateCards() {
    const wrap = document.getElementById("candidateCards");
    const cards = [
      ["A", META.candidates.A],
      ["B", META.candidates.B]
    ];
    wrap.innerHTML = cards
      .map(
        ([key, c]) => `
      <div class="candidate-card">
        <h3><span class="badge-dot ${key.toLowerCase()}">${key}</span> ${escapeHtml(c.label)}</h3>
        <p>${escapeHtml(c.description)}</p>
      </div>`
      )
      .join("");
  }

  function populateFilterOptions() {
    const categories = new Set();
    const fields = new Set();
    const minorities = new Set();

    DATA.forEach((s) => {
      (s.category || []).forEach((c) => categories.add(c));
      (s.field_of_study || []).forEach((f) => fields.add(f));
      if (s.minority_group) minorities.add(s.minority_group);
    });

    fillSelect("filterCategory", categories, "All categories");
    fillSelect("filterField", fields, "All fields");

    const minoritySelect = document.getElementById("filterMinority");
    [...minorities].sort().forEach((m) => {
      const opt = document.createElement("option");
      opt.value = m;
      opt.textContent = m;
      minoritySelect.appendChild(opt);
    });
  }

  function fillSelect(id, valuesSet, placeholder) {
    const select = document.getElementById(id);
    [...valuesSet].sort().forEach((v) => {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v;
      select.appendChild(opt);
    });
  }

  function wireControls() {
    [
      "searchBox",
      "filterCandidate",
      "filterCategory",
      "filterMinority",
      "filterField",
      "filterNomination",
      "sortBy"
    ].forEach((id) => {
      const el = document.getElementById(id);
      el.addEventListener(el.tagName === "INPUT" ? "input" : "change", render);
    });
    document.getElementById("filterMin5k").addEventListener("change", render);

    document.getElementById("resetFilters").addEventListener("click", () => {
      document.getElementById("searchBox").value = "";
      document.getElementById("filterCandidate").value = "";
      document.getElementById("filterCategory").value = "";
      document.getElementById("filterMinority").value = "";
      document.getElementById("filterField").value = "";
      document.getElementById("filterNomination").value = "";
      document.getElementById("filterMin5k").checked = true;
      document.getElementById("sortBy").value = "name";
      render();
    });

    document.getElementById("downloadCsv").addEventListener("click", () => {
      downloadCsv(getFilteredSorted());
    });
  }

  function getFilteredSorted() {
    const search = document.getElementById("searchBox").value.trim().toLowerCase();
    const candidate = document.getElementById("filterCandidate").value;
    const category = document.getElementById("filterCategory").value;
    const minority = document.getElementById("filterMinority").value;
    const field = document.getElementById("filterField").value;
    const nomination = document.getElementById("filterNomination").value;
    const min5k = document.getElementById("filterMin5k").checked;
    const sortBy = document.getElementById("sortBy").value;

    let rows = DATA.filter((s) => {
      if (min5k && !(s.amount_max >= 5000)) return false;

      if (candidate === "A" && s.candidate_a_fit.toLowerCase().startsWith("not applicable")) return false;
      if (candidate === "B" && s.candidate_b_fit.toLowerCase().startsWith("not applicable")) return false;

      if (category && !(s.category || []).includes(category)) return false;
      if (field && !(s.field_of_study || []).includes(field)) return false;

      if (minority === "__any__" && !s.minority_group) return false;
      if (minority && minority !== "__any__" && s.minority_group !== minority) return false;

      if (nomination === "yes" && !s.nomination_required) return false;
      if (nomination === "no" && s.nomination_required) return false;

      if (search) {
        const hay = [
          s.name,
          s.provider,
          s.notes,
          s.field_of_study && s.field_of_study.join(" "),
          s.category && s.category.join(" "),
          s.minority_group,
          s.candidate_a_fit,
          s.candidate_b_fit
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(search)) return false;
      }

      return true;
    });

    rows.sort((a, b) => {
      switch (sortBy) {
        case "amount_max_desc":
          return b.amount_max - a.amount_max;
        case "amount_min_asc":
          return a.amount_min - b.amount_min;
        case "deadline":
          return (a.deadline || "").localeCompare(b.deadline || "");
        default:
          return a.name.localeCompare(b.name);
      }
    });

    return rows;
  }

  function render() {
    const rows = getFilteredSorted();
    const tbody = document.getElementById("tableBody");
    const noResults = document.getElementById("noResults");
    const table = document.getElementById("scholarshipTable");

    document.getElementById("resultCount").textContent =
      rows.length + (rows.length === 1 ? " scholarship" : " scholarships") + ` (of ${DATA.length} total)`;

    if (rows.length === 0) {
      tbody.innerHTML = "";
      table.hidden = true;
      noResults.hidden = false;
      return;
    }
    table.hidden = false;
    noResults.hidden = true;

    tbody.innerHTML = rows.map(rowHtml).join("");
  }

  function rowHtml(s) {
    const catTags = (s.category || [])
      .map((c) => `<span class="tag ${tagClass(c)}">${escapeHtml(c)}</span>`)
      .join(" ");

    const fields = (s.field_of_study || []).join(", ");

    const nomHtml = s.nomination_required
      ? `<span class="nom-yes">Yes</span>${s.nomination_notes ? `<span class="sch-notes">${escapeHtml(s.nomination_notes)}</span>` : ""}`
      : `<span class="nom-no">No</span>`;

    return `
      <tr>
        <td>
          <span class="sch-name">${escapeHtml(s.name)}</span>
          <span class="sch-notes">${escapeHtml(s.notes || "")}</span>
        </td>
        <td>${escapeHtml(s.provider)}</td>
        <td class="amount">${escapeHtml(s.amount_display)}</td>
        <td>${escapeHtml(s.deadline)}</td>
        <td>${catTags}</td>
        <td>${escapeHtml(fields)}</td>
        <td>${escapeHtml((s.eligible_stage || []).join("; "))}</td>
        <td>${nomHtml}</td>
        <td><span class="fit-text ${fitClass(s.candidate_a_fit)}">${escapeHtml(s.candidate_a_fit)}</span></td>
        <td><span class="fit-text ${fitClass(s.candidate_b_fit)}">${escapeHtml(s.candidate_b_fit)}</span></td>
        <td><a class="website-link" href="${escapeAttr(s.url)}" target="_blank" rel="noopener noreferrer">Visit site ↗</a></td>
      </tr>`;
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeAttr(str) {
    return escapeHtml(str);
  }

  function downloadCsv(rows) {
    const headers = [
      "Name",
      "Provider",
      "Amount",
      "Deadline",
      "Category",
      "Field of Study",
      "Eligible Stage",
      "Nomination Required",
      "Candidate A Fit",
      "Candidate B Fit",
      "URL"
    ];

    const csvRows = rows.map((s) => [
      s.name,
      s.provider,
      s.amount_display,
      s.deadline,
      (s.category || []).join("; "),
      (s.field_of_study || []).join("; "),
      (s.eligible_stage || []).join("; "),
      s.nomination_required ? "Yes" : "No",
      s.candidate_a_fit,
      s.candidate_b_fit,
      s.url
    ]);

    const csv = [headers, ...csvRows]
      .map((row) => row.map(csvEscape).join(","))
      .join("\r\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "scholarships-filtered.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function csvEscape(val) {
    const str = val === null || val === undefined ? "" : String(val);
    if (/[",\n]/.test(str)) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }
})();
