# QawmiVerse — Bangladesh Education Guide & Directory

**QawmiVerse** is a bilingual educational guide to Qawmi madrasa education in Bangladesh. It combines a searchable, source-transcribed institution directory with guides to the education system, study stages, selected syllabi, history, governance, published estimates, and references.

The project is an independent educational resource. It is not affiliated with any madrasa board and does not claim that its directory is complete or independently verified.

## What is included

- **Madrasa directory:** search Bengali names, original addresses, affiliation/ilhak codes, and stable source IDs. Filter by source-stated gender, upazila/thana where given, affiliation code, and public contact availability.
- **Record profiles:** original IDs, source-stated details, source references, contact provenance, and explicit verification caveats.
- **Bilingual experience:** English is the default; Bengali pages are available under `/bn/`. Institution names and addresses remain in their original Bengali when no translation is present in the source.
- **Education & comparison:** overview, research-described stages, curriculum domains, the user-verified equivalency table, and a comparison with Alia and general education.
- **History and governance:** cited timeline, boards, and the scope of the supplied legal-recognition record.
- **Syllabus explorer:** the selected syllabus records actually present in the source database.
- **Statistics and resources:** counts from the imported records, published estimates with their limitations, sources, research notes, and dataset methodology.
- **Exam and career guidance:** links only to board websites included in the source; no student results or current result feed are fabricated.
- Responsive layout, dark mode, URL-persisted search filters, and a public issue link for reporting record corrections.

## Data integrity

The knowledge base is organized as [`data/knowledge_base.json`](./data/knowledge_base.json) plus [`data/madrasas/`](./data/madrasas/), which contains one record file per division and [`data/madrasas/by-division/unclassified.json`](./data/madrasas/by-division/unclassified.json) for addresses that cannot be assigned confidently. [`data/madrasas/manifest.json`](./data/madrasas/manifest.json) records each partition's filename and count. The app combines the files in memory in stable ID order, preserving each `qawmi_bd_####` ID and its source fields. The Qawmi stage, equivalency, duration and subject table is marked as checked by the user.

| Source field | Value |
|---|---:|
| Database version | 1.3.1 |
| Declared directory count | 1,979 |
| Imported records present | 1,972 |
| Records marked men | 140 |
| Records marked women | 236 |
| Records with gender unspecified | 1,596 |
| Records with publicly listed phone numbers | 2 |

The database itself reports different declared and imported counts; both figures are preserved rather than reconciled by guessing. There are four listed numbers across two records: one is explicitly historical, and the other record's numbers are not call-verified. Phone details are shown with those caveats.

Many directory records are transcribed but not independently verified. Location values are free-text addresses; division and district filters are inferred from those addresses, so some records remain unclassified and inferred locations can be incomplete. No coordinates or map locations are fabricated. Missing gender, English names, levels, facilities, and contacts are not inferred. Published population estimates come from different sources and years and are not presented as directly comparable counts.

Run the source-data checks before publishing:

```sh
npm run data:validate
```

To split a replacement full database JSON into the same structure:

```sh
npm run data:split -- path\to\complete-database.json
```

The split is based on the district named in each record's free-text address; ambiguous or missing locations remain in the unclassified file. The older `madrasas_list.json`, `data/madrasas.json`, supplemental lists, and legacy static pages are not loaded by the rebuilt React application.


## Run locally

Node.js and npm are required. From the repository root:

```sh
npm install
npm run dev
```

Create and preview a production build:

```sh
npm run build
npm run preview
```

The Vite application is rooted at `react/`; production files are written to `dist/`. Deploy `dist/` to a static host that supports the included SPA fallback in `public/_redirects`.

## SEO sitemap

Bangla is the default language at `/`; English pages use the `/en/` prefix. Page titles, descriptions, canonical URLs, language alternates and WebSite/WebPage structured data are set for both languages. Directory filter query strings are excluded from canonical URLs.

The deployment domain is intentionally not guessed. After deploying to the final HTTPS domain, generate localized routes and directory-record URLs:

```sh
# PowerShell
$env:SITE_URL = "https://your-deployed-domain"
npm run seo:sitemap
```

The command writes `public/sitemap.xml` for all knowledge pages and all 1,972 record profiles in both languages, with `hreflang` alternates, and adds the sitemap URL to `public/robots.txt`. The education and comparison content share `/education`; the previous `/compare` URL redirects there. Review and commit those generated files before deploying. Without `SITE_URL`, sitemap generation fails instead of publishing placeholder URLs.

After deployment, add and verify the site in [Google Search Console](https://search.google.com/search-console), submit `/sitemap.xml`, and inspect the important Bangla and English URLs with URL Inspection. Search Console verification requires access to the deployed domain or its DNS/HTML verification method; this repository cannot create that ownership proof automatically. Crawling and indexing timing is controlled by Google and is not guaranteed by metadata alone.

## Static-site limitations

This React/Vite project has no application server, database service, authentication, or private admin API. It does not expose a browser-only admin mode, store correction reports, geocode addresses, or collect student result credentials. Correction links open a public GitHub issue; visitors should not include private student or staff information.

## Main project files

```text
react/
  index.html
  src/App.jsx       # bilingual routes, directory, knowledge pages
  src/app.css       # responsive application styles
data/
  bangladesh-divisions.js            # shared district lookup and normalization
  knowledge_base.json                # education and reference content
  madrasas/
    manifest.json                    # partition names and counts
    by-division/                     # madrasa records grouped by division
  darsiyat_female_syllabus.json       # extracted syllabus tables
scripts/
  database.js
  split-madrasa-data.js
  validate-master-database.js
  generate-sitemap.js
public/
  _redirects
  robots.txt
```
