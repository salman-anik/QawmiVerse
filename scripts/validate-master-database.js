import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadDatabase } from "./database.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const database = await loadDatabase(root);
const records = database.madrasa_directory?.records;
const sources = database.sources;

assert.ok(Array.isArray(records), "madrasa_directory.records must be an array");
assert.ok(Array.isArray(sources), "sources must be an array");
assert.equal(records.length, database.madrasa_directory.imported_record_count, "Imported record count does not match records.length");

const sourceIds = new Set(sources.map((source) => source.id));
const recordIds = new Set();
const genders = new Set(["men", "women", "unspecified"]);
let contactNumbers = 0;

for (const [index, record] of records.entries()) {
  const label = `records[${index}]`;
  assert.match(record.id, /^qawmi_bd_\d{4}$/, `${label}.id must preserve the stable source ID`);
  assert.ok(!recordIds.has(record.id), `Duplicate record ID: ${record.id}`);
  recordIds.add(record.id);
  assert.equal(typeof record.name_bn, "string", `${label}.name_bn must be a string`);
  assert.ok(record.address_original === null || typeof record.address_original === "string", `${label}.address_original must be a string or null`);
  assert.ok(genders.has(record.gender), `${label}.gender has an unsupported value`);
  assert.ok(sourceIds.has(record.source_id), `${label}.source_id does not match a source record`);
  assert.ok(Array.isArray(record.contact_numbers), `${label}.contact_numbers must be an array`);
  assert.ok(Array.isArray(record.contact_sources), `${label}.contact_sources must be an array`);

  for (const contact of record.contact_numbers) {
    assert.equal(typeof contact.number, "string", `${label} contains a contact without a number`);
    contactNumbers += 1;
  }
}

console.log(`Validated database v${database.metadata.version}: ${records.length} records, ${recordIds.size} unique IDs, ${contactNumbers} listed phone numbers.`);
if (records.length !== database.madrasa_directory.declared_record_count) {
  console.warn(`Source declares ${database.madrasa_directory.declared_record_count} records but imports ${records.length}; preserving both source figures.`);
}
