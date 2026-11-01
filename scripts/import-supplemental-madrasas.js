import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const searchPath = path.join(root, "data", "madrasas.json");
const sourcePath = path.join(root, "madrasas_list.json");
const sitemapPath = path.join(root, "sitemap.xml");
const publicSitemapPath = path.join(root, "public", "sitemap.xml");
const supplementPaths = [
  path.join(root, "data", "supplemental-mirpur.json"),
  path.join(root, "data", "supplemental-savar.json"),
];

const normalize = (value) =>
  String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");

const recordKey = (name, address) => `${normalize(name)}|${normalize(address)}`;
const typeNames = {
  men: "\u09aa\u09c1\u09b0\u09c1\u09b7",
  women: "\u09ae\u09b9\u09bf\u09b2\u09be",
};

const search = JSON.parse(await readFile(searchPath, "utf8"));
const source = JSON.parse(await readFile(sourcePath, "utf8"));
const supplements = await Promise.all(
  supplementPaths.map(async (file) => JSON.parse(await readFile(file, "utf8"))),
);
const sourceRecords = new Set(
  source.madrasas.map((record) =>
    recordKey(record.name, record.address),
  ),
);
const searchRecords = new Set(
  search.items.map((record) => recordKey(record.name, record.area)),
);
const dhakaIndex = search.districts.findIndex((district) => district.slug === "dhaka");
if (dhakaIndex < 0) throw new Error("Dhaka district is missing from the search data");

let nextId = Math.max(...search.items.map((record) => record.id)) + 1;
let added = 0;
const imports = supplements.flat();

for (const item of imports) {
  if (!item.name || !item.upazila || !typeNames[item.gender]) {
    throw new Error(`Invalid supplemental madrasa record: ${JSON.stringify(item)}`);
  }
  const key = recordKey(item.name, item.address);
  const existingSource = source.madrasas.find(
    (record) => recordKey(record.name, record.address) === key,
  );
  const existingSearch = search.items.find(
    (record) => recordKey(record.name, record.area) === key,
  );
  if (item.locationUnverified) {
    if (existingSource) existingSource.locationUnverified = true;
    if (existingSearch) existingSearch.locationUnverified = true;
  }
  if (sourceRecords.has(key) || existingSearch) {
    continue;
  }

  const isWomen = item.gender === "women";
  source.madrasas.push({
    name: item.name,
    address: item.address,
    gender: item.gender,
    upazila: item.upazila,
    ইলহাক: null,
    type: typeNames[item.gender],
    level: null,
    phone: null,
    locationUnverified: Boolean(item.locationUnverified),
  });
  search.items.push({
    id: nextId++,
    name: item.name,
    area: item.address,
    upazila: item.upazila,
    districtIndex: dhakaIndex,
    isWomen,
    type: typeNames[item.gender],
    level: null,
    levelCodes: [],
    phone: null,
    locationUnverified: Boolean(item.locationUnverified),
    ilhakCodes: [],
  });
  sourceRecords.add(key);
  searchRecords.add(key);
  added += 1;
}

source.count = source.madrasas.length;
source.schemaVersion = 2;
if (!source.source.includes("user-provided Mirpur and Savar directory lists")) {
  source.source = `${source.source}; user-provided Mirpur and Savar directory lists`;
}
await writeFile(sourcePath, JSON.stringify(source, null, 2), "utf8");
await writeFile(searchPath, JSON.stringify(search), "utf8");

const sitemap = await readFile(sitemapPath, "utf8");
const originMatch = sitemap.match(/<loc>(https?:\/\/[^/]+)\//);
if (!originMatch || !sitemap.includes("</urlset>")) {
  throw new Error("Could not determine the sitemap origin or closing urlset element");
}
const origin = originMatch[1];
const listedUrls = new Set(
  [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]),
);
const supplementalKeys = new Set(
  imports.map((item) => recordKey(item.name, item.address)),
);
const detailUrls = search.items
  .filter((record) => supplementalKeys.has(recordKey(record.name, record.area)))
  .flatMap((record) => [
    `${origin}/madrasa/${record.id}/`,
    `${origin}/en/madrasa/${record.id}/`,
  ])
  .filter((url) => !listedUrls.has(url));
const sitemapEntries = detailUrls
  .map((url) => `<url><loc>${url}</loc></url>`)
  .join("");
const updatedSitemap = sitemap.replace("</urlset>", `${sitemapEntries}</urlset>`);
await writeFile(sitemapPath, updatedSitemap, "utf8");
await writeFile(publicSitemapPath, updatedSitemap, "utf8");
console.log(
  JSON.stringify(
    {
      inputRecords: imports.length,
      addedRecords: added,
      searchRecords: search.items.length,
      sourceRecords: source.madrasas.length,
      sitemapPagesAdded: detailUrls.length,
    },
    null,
    2,
  ),
);
