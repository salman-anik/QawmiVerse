import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DISTRICT_GROUPS, districtFromAddress } from "../data/bangladesh-divisions.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = process.argv[2] ? path.resolve(process.argv[2]) : null;
assert.ok(sourcePath, "Pass the complete source database JSON path as the first argument");
const source = JSON.parse(await readFile(sourcePath, "utf8"));
const divisions = DISTRICT_GROUPS.map(({ division }) => division);
const buckets = Object.fromEntries([...divisions.map(({ slug }) => [slug, []]), ["unclassified", []]]);

for (const record of source.madrasa_directory.records) {
  const district = districtFromAddress(record.address_original);
  buckets[district?.division || "unclassified"].push(record);
}

const dataDirectory = path.join(root, "data");
const madrasaDirectory = path.join(dataDirectory, "madrasas");
await mkdir(path.join(madrasaDirectory, "by-division"), { recursive: true });

const core = structuredClone(source);
delete core.madrasa_directory.records;
await writeFile(path.join(dataDirectory, "knowledge_base.json"), `${JSON.stringify(core, null, 2)}\n`, "utf8");

const labels = Object.fromEntries(divisions.map(({ slug, en, bn }) => [slug, { en, bn }]));
labels.unclassified = { en: "Unclassified address", bn: "ঠিকানা থেকে বিভাগ নির্ধারণ করা যায়নি" };
const partitions = [];
for (const [slug, records] of Object.entries(buckets)) {
  const file = `by-division/${slug}.json`;
  await writeFile(path.join(madrasaDirectory, file), `${JSON.stringify(records, null, 2)}\n`, "utf8");
  partitions.push({ slug, label: labels[slug], file, count: records.length });
}

assert.equal(
  partitions.reduce((total, partition) => total + partition.count, 0),
  source.madrasa_directory.records.length,
  "Partitioning changed the source record count",
);
await writeFile(
  path.join(madrasaDirectory, "manifest.json"),
  `${JSON.stringify({ version: 1, partitions }, null, 2)}\n`,
  "utf8",
);

console.log(`Split ${source.madrasa_directory.records.length} records into ${partitions.length} files.`);
for (const { slug, count } of partitions) console.log(`${slug}: ${count}`);
