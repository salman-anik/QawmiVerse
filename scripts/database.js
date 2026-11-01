import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

export async function loadDatabase(root) {
  const dataDirectory = path.join(root, "data");
  const core = JSON.parse(await readFile(path.join(dataDirectory, "knowledge_base.json"), "utf8"));
  const manifest = JSON.parse(await readFile(path.join(dataDirectory, "madrasas", "manifest.json"), "utf8"));
  const records = [];

  assert.ok(Array.isArray(manifest.partitions), "Madrasa manifest must contain partitions");
  for (const partition of manifest.partitions) {
    const partitionPath = path.join(dataDirectory, "madrasas", partition.file);
    const partitionRecords = JSON.parse(await readFile(partitionPath, "utf8"));
    assert.ok(Array.isArray(partitionRecords), `${partition.file} must contain a record array`);
    assert.equal(partitionRecords.length, partition.count, `${partition.file} record count does not match the manifest`);
    records.push(...partitionRecords);
  }

  records.sort((left, right) => left.id.localeCompare(right.id, "en", { numeric: true }));
  assert.equal(records.length, core.madrasa_directory?.imported_record_count, "Partitioned record count does not match the knowledge base");

  return {
    ...core,
    madrasa_directory: {
      ...core.madrasa_directory,
      records,
    },
  };
}
