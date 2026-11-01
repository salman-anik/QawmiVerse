import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadDatabase } from "./database.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const siteUrl = process.env.SITE_URL;

if (!siteUrl) {
  throw new Error("Set SITE_URL to the deployed site origin before generating the sitemap.");
}

const parsedSiteUrl = new URL(siteUrl);
if (parsedSiteUrl.protocol !== "https:" && parsedSiteUrl.hostname !== "localhost") {
  throw new Error("SITE_URL must use HTTPS, except for local development.");
}
if (parsedSiteUrl.search || parsedSiteUrl.hash) {
  throw new Error("SITE_URL must not include a query string or fragment.");
}

const database = await loadDatabase(root);
const baseUrl = `${parsedSiteUrl.origin}${parsedSiteUrl.pathname.replace(/\/+$/, "")}`;
const lastmod = database.metadata.updated_at || database.metadata.created_at;
const pagePaths = [
  "/",
  "/madrasas",
  "/education",
  "/history",
  "/syllabus",
  "/statistics",
  "/resources",
  "/results",
  "/careers",
  "/about",
  ...database.madrasa_directory.records.map((record) => `/madrasa/${record.id}`),
];
const escapeXml = (value) => String(value).replace(/[<>&'"]/g, (character) => ({
  "<": "&lt;",
  ">": "&gt;",
  "&": "&amp;",
  "'": "&apos;",
  '"': "&quot;",
})[character]);
const localizedPath = (locale, route) => {
  const normalized = route === "/" ? "" : route;
  return `${baseUrl}${locale === "en" ? "/en" : ""}${normalized || "/"}`;
};
const entries = pagePaths.flatMap((route) => {
  const english = localizedPath("en", route);
  const bengali = localizedPath("bn", route);
  const alternates = [
    `<xhtml:link rel="alternate" hreflang="en" href="${escapeXml(english)}"/>`,
    `<xhtml:link rel="alternate" hreflang="bn-BD" href="${escapeXml(bengali)}"/>`,
    `<xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(bengali)}"/>`,
  ].join("");
  return [english, bengali].map((url) => `<url><loc>${escapeXml(url)}</loc><lastmod>${escapeXml(lastmod)}</lastmod>${alternates}</url>`);
}).join("");
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${entries}</urlset>\n`;
await writeFile(path.join(root, "public", "sitemap.xml"), xml, "utf8");
const robotsPath = path.join(root, "public", "robots.txt");
const robots = (await readFile(robotsPath, "utf8"))
  .replace(/^[ \t]*Sitemap:[^\r\n]*\r?\n?/gim, "")
  .trimEnd();
await writeFile(robotsPath, `${robots}\nSitemap: ${baseUrl}/sitemap.xml\n`, "utf8");
console.log(`Generated sitemap for ${pagePaths.length} pages in English and Bengali at ${baseUrl}.`);
