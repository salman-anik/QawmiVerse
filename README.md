# Bangladesh Qawmi Madrasa Directory | Madrasa Finder BD

**Madrasa Finder BD** is a bilingual, searchable directory of Qawmi madrasas in Bangladesh. Search madrasa names, locations, and Wifaq ilhak numbers, or browse listings by division, district, and upazila.

The directory currently contains **1,808 search records across 53 districts and 8 divisions**. It combines the **2019 result-related madrasa list of Wifaqul Madarisil Arabia Bangladesh** with user-provided madrasa lists for Dhaka, Mirpur, and Savar. Many supplemental entries do not include ilhak numbers. This is an independent search aid, not an official Wifaq website; addresses and other details may have changed.

## Features

- Bengali and English interfaces, with madrasa names shown in Bengali as listed in the source.
- Search by madrasa name, area, upazila, district, and division, with Bengali and English digit normalization.
- Search by Wifaq ilhak number in Bengali or English numerals.
- Filter by division, district, upazila, and branch type.
- Browse individual madrasa, division, and district routes rendered by React.
- Responsive layout with light and dark themes.
- Vite production build, client-side route fallback, XML sitemap, and `robots.txt`.

## Preview locally

Install dependencies and start the Vite development server:

```sh
npm install
npm run dev
```

Create and preview a production build:

```sh
npm run build
npm run preview
```

## Deploy

Deploy the generated `dist/` directory to a static host. For Cloudflare Pages, use `npm run build` as the build command and `dist` as the output directory. The `public/_redirects` file routes directory URLs to the React app entry point. The current configuration expects deployment at a domain root; a repository subpath requires setting Vite's `base` option and matching the router basename.

The React app downloads `data/madrasas.json` as a separate JSON asset at runtime. District, division, and madrasa pages are routed by React; the static host must support the included SPA fallback.

Before deploying under a real domain, replace the `https://example.com/` placeholder in `robots.txt` and `sitemap.xml` with the production origin. React updates page titles, descriptions, and canonical URLs as routes change.

## Project structure

```text
.
├── react/
│   ├── index.html          # Vite HTML entry
│   └── src/                # React application and styles
├── public/
│   ├── _redirects          # SPA route fallback for static hosts
│   └── assets/
├── vite.config.js
├── package.json
├── data/
│   ├── madrasas.json       # Search dataset used by React
│   ├── supplemental-mirpur.json
│   └── supplemental-savar.json
├── scripts/
│   └── import-supplemental-madrasas.js
├── assets/
│   ├── app.js              # Legacy static-page behavior
│   ├── style.css           # Shared site styles
│   └── favicon.svg
├── madrasas_list.json      # Source dataset (1,826 records)
├── sitemap.xml
└── robots.txt
```

## Data format

`data/madrasas.json` contains division and district lookup tables plus an `items` array of records. Each record includes `id`, `name`, `area`, `upazila`, `districtIndex`, `type`, `isWomen`, `ilhakCodes`, `level`, `levelCodes`, `phone`, and an optional `locationUnverified` flag. `level` and `phone` are `null` when not verified; historical numeric Wifaq stage values are retained separately in `levelCodes` and are not displayed as named levels. Do not infer a phone number or label a madrasa as Takmil without a supporting source.

`madrasas_list.json` is the source dataset (1,979 records); `data/madrasas.json` is the 1,808-entry search dataset. The 249 pasted Mirpur and Savar records yielded 153 new records after deduplication. Supplemental entries use empty ilhak-code arrays where the supplied sources did not contain codes. To re-import the checked-in Mirpur and Savar source lists idempotently, run `npm run data:import`; this updates both datasets and the sitemap.

## Data notes

- **Source year:** 2019
- **Coverage:** 1,808 search records, 53 districts, 8 divisions
- **Supplemental sources:** User-provided Dhaka women's, Mirpur, and Savar madrasa lists
- **Contact information:** Phone numbers and named levels are shown only when supported by a source.
- **Important:** This directory is not affiliated with or operated by Wifaqul Madarisil Arabia Bangladesh. Verify contact details and addresses before relying on them.

## Contributing

Improvements are welcome. Please keep Bengali and English pages consistent, preserve the static-hosting behavior, and clearly identify the source and year of any proposed data changes. Open an issue or pull request with a concise description of the change.
