# Qawmi Knowledge — Bangladesh Education Guide & Directory

**Qawmi Knowledge** is a bilingual educational guide to Qawmi madrasa education in Bangladesh. It combines a searchable, source-transcribed institution directory with guides to the education system, study stages, selected syllabi, history, governance, published estimates, and references.

The project is an independent educational resource. It is not affiliated with any madrasa board and does not claim that its directory is complete or independently verified.

## What is included

- **Madrasa directory:** search Bengali names, original addresses, affiliation/ilhak codes, and stable source IDs. Filter by source-stated gender, upazila/thana where given, affiliation code, and public contact availability.
- **Record profiles:** original IDs, source-stated details, source references, contact provenance, and explicit verification caveats.
- **Bilingual experience:** English is the default; Bengali pages are available under `/bn/`. Institution names and addresses remain in their original Bengali when no translation is present in the source.
- **Education guide:** overview, research-described stages, curriculum domains, and the source's transcribed equivalency material.
- **History and governance:** cited timeline, boards, and the scope of the supplied legal-recognition record.
- **Syllabus explorer:** the selected syllabus records actually present in the source database.
- **Comparison page:** distinguishes supported facts from information that the supplied source does not cover; it does not invent a full General/Alia comparison.
- **Statistics and resources:** counts from the imported records, published estimates with their limitations, sources, research notes, and dataset methodology.
- **Exam and career guidance:** links only to board websites included in the source; no student results or current result feed are fabricated.
- Responsive layout, dark mode, URL-persisted search filters, and a public issue link for reporting record corrections.

## Data integrity

The canonical input is [`data/qawmi_madrasa_database_v1_3_1.json`](./data/qawmi_madrasa_database_v1_3_1.json). The application reads its nested `madrasa_directory.records` collection directly and preserves the stable `qawmi_bd_####` IDs and source fields.

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

Many records are transcribed but not independently verified. Location values are often only free-text addresses; the database does not provide complete division/district fields or verified coordinates. Therefore the application does not fabricate geographic filters or a map. Missing gender, English names, levels, facilities, and contacts are not inferred. Published population estimates come from different sources and years and are not presented as directly comparable counts.

Run the source-data checks before publishing:

```sh
npm run data:validate
```

The older `madrasas_list.json`, `data/madrasas.json`, supplemental lists, and legacy static pages are not loaded by the rebuilt React application.

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

The deployment domain is intentionally not guessed. After choosing the actual site URL, generate localized routes and directory-record URLs:

```sh
# PowerShell
$env:SITE_URL = "https://your-deployed-domain"
npm run seo:sitemap
```

The command writes `public/sitemap.xml` for all knowledge pages and all 1,972 record profiles in both languages, and adds the sitemap URL to `public/robots.txt`. Review and commit those generated files before deploying. Without `SITE_URL`, sitemap generation fails instead of publishing placeholder URLs.

## Static-site limitations

This React/Vite project has no application server, database service, authentication, or private admin API. It does not expose a browser-only admin mode, store correction reports, geocode addresses, or collect student result credentials. Correction links open a public GitHub issue; visitors should not include private student or staff information.

## Main project files

```text
react/
  index.html
  src/App.jsx       # bilingual routes, directory, knowledge pages
  src/app.css       # responsive application styles
data/
  qawmi_madrasa_database_v1_3_1.json  # canonical source data
scripts/
  validate-master-database.js
  generate-sitemap.js
public/
  _redirects
  robots.txt
```
