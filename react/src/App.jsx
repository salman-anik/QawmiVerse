import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import darsiyatFemaleSyllabus from "../../data/darsiyat_female_syllabus.json";
import {
  BANGLADESH_DISTRICTS,
  BANGLADESH_DIVISIONS,
  districtFromAddress,
  normalizeDigits,
  normalizeText,
} from "../../data/bangladesh-divisions.js";
import knowledgeBaseUrl from "../../data/knowledge_base.json?url";
import madrasaManifestUrl from "../../data/madrasas/manifest.json?url";
import barishalRecordsUrl from "../../data/madrasas/by-division/barishal.json?url";
import chattogramRecordsUrl from "../../data/madrasas/by-division/chattogram.json?url";
import dhakaRecordsUrl from "../../data/madrasas/by-division/dhaka.json?url";
import khulnaRecordsUrl from "../../data/madrasas/by-division/khulna.json?url";
import mymensinghRecordsUrl from "../../data/madrasas/by-division/mymensingh.json?url";
import rajshahiRecordsUrl from "../../data/madrasas/by-division/rajshahi.json?url";
import rangpurRecordsUrl from "../../data/madrasas/by-division/rangpur.json?url";
import sylhetRecordsUrl from "../../data/madrasas/by-division/sylhet.json?url";
import unclassifiedRecordsUrl from "../../data/madrasas/by-division/unclassified.json?url";

const DatabaseContext = createContext(null);
const EMPTY = "—";
const recordPartitionUrls = {
  barishal: barishalRecordsUrl,
  chattogram: chattogramRecordsUrl,
  dhaka: dhakaRecordsUrl,
  khulna: khulnaRecordsUrl,
  mymensingh: mymensinghRecordsUrl,
  rajshahi: rajshahiRecordsUrl,
  rangpur: rangpurRecordsUrl,
  sylhet: sylhetRecordsUrl,
  unclassified: unclassifiedRecordsUrl,
};

function useDatabase() {
  const value = useContext(DatabaseContext);
  if (!value) throw new Error("Knowledge-base data is not available");
  return value;
}

function getLocalized(value, english) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const preferred = value[english ? "en" : "bn"];
    return preferred ?? value.en ?? value.bn ?? "";
  }
  return value ?? "";
}

function usePageMeta(title, description, robots = "index, follow") {
  const location = useLocation();
  useEffect(() => {
    const english = /^\/en(?:\/|$)/.test(location.pathname);
    const locale = english ? "en" : "bn-BD";
    const normalizedPath = contentPath(location.pathname).replace(/\/+$/, "") || "/";
    const englishPath = `/en${normalizedPath === "/" ? "/" : normalizedPath}`;
    const bengaliPath = normalizedPath === "/" ? "/" : normalizedPath;
    const englishUrl = `${window.location.origin}${englishPath}`;
    const bengaliUrl = `${window.location.origin}${bengaliPath}`;
    const canonicalUrl = english ? englishUrl : bengaliUrl;

    document.documentElement.lang = locale;
    if (title) document.title = title;
    const setMeta = (selector, attributes, content) => {
      let tag = document.head.querySelector(selector);
      if (!tag) {
        tag = document.createElement("meta");
        Object.entries(attributes).forEach(([key, value]) => tag.setAttribute(key, value));
        document.head.appendChild(tag);
      }
      tag.content = content;
    };
    if (description) {
      let tag = document.querySelector('meta[name="description"]');
      if (!tag) {
        tag = document.createElement("meta");
        tag.name = "description";
        document.head.appendChild(tag);
      }
      tag.content = description;
    }
    setMeta('meta[property="og:title"]', { property: "og:title" }, title || "");
    setMeta('meta[property="og:description"]', { property: "og:description" }, description || "");
    setMeta('meta[property="og:url"]', { property: "og:url" }, canonicalUrl);
    setMeta('meta[property="og:site_name"]', { property: "og:site_name" }, english ? "Qawmi Knowledge" : "কওমি জ্ঞানভান্ডার");
    setMeta('meta[property="og:locale"]', { property: "og:locale" }, english ? "en_US" : "bn_BD");
    setMeta('meta[property="og:locale:alternate"]', { property: "og:locale:alternate" }, english ? "bn_BD" : "en_US");
    setMeta('meta[name="twitter:title"]', { name: "twitter:title" }, title || "");
    setMeta('meta[name="twitter:description"]', { name: "twitter:description" }, description || "");
    setMeta('meta[name="robots"]', { name: "robots" }, robots);
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;

    const setAlternate = (language, href) => {
      let alternate = document.head.querySelector(`link[rel="alternate"][hreflang="${language}"]`);
      if (!alternate) {
        alternate = document.createElement("link");
        alternate.rel = "alternate";
        alternate.hreflang = language;
        document.head.appendChild(alternate);
      }
      alternate.href = href;
    };
    setAlternate("bn-BD", bengaliUrl);
    setAlternate("en", englishUrl);
    setAlternate("x-default", bengaliUrl);

    const structuredData = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebSite",
          "@id": `${window.location.origin}/#website`,
          url: `${window.location.origin}/`,
          name: "কওমি জ্ঞানভান্ডার",
          alternateName: "Qawmi Knowledge",
          inLanguage: ["bn-BD", "en"],
          potentialAction: {
            "@type": "SearchAction",
            target: `${window.location.origin}/madrasas?q={search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        },
        {
          "@type": "WebPage",
          "@id": `${canonicalUrl}#webpage`,
          url: canonicalUrl,
          name: title,
          description,
          inLanguage: locale,
          isPartOf: { "@id": `${window.location.origin}/#website` },
        },
      ],
    };
    let jsonLd = document.getElementById("page-structured-data");
    if (!jsonLd) {
      jsonLd = document.createElement("script");
      jsonLd.id = "page-structured-data";
      jsonLd.type = "application/ld+json";
      document.head.appendChild(jsonLd);
    }
    jsonLd.textContent = JSON.stringify(structuredData).replace(/</g, "\\u003c");
  }, [description, location.pathname, robots, title]);
}

function pagePrefix(english) {
  return english ? "/en" : "";
}

function contentPath(pathname) {
  return pathname.replace(/^\/(?:bn|en)(?=\/|$)/, "") || "/";
}

function SiteHeader({ english, path }) {
  const location = useLocation();
  const otherLanguage = `${english ? "" : "/en"}${path}${location.search}`;
  const prefix = pagePrefix(english);
  const links = [
    ["/madrasas", english ? "Directory" : "মাদরাসা"],
    ["/education", english ? "Education & comparison" : "শিক্ষাব্যবস্থা ও তুলনা"],
    ["/history", english ? "History & boards" : "ইতিহাস ও বোর্ড"],
    ["/syllabus", english ? "Syllabi" : "সিলেবাস"],
    ["/statistics", english ? "Data & statistics" : "তথ্য ও পরিসংখ্যান"],
    ["/resources", english ? "Sources" : "তথ্যসূত্র"],
  ];

  return (
    <header className="top">
      <div className="site-bar">
        <Link className="brand" to={`${prefix}/`}>
          <span className="brand-mark" aria-hidden="true">ق</span>
          <span className="brand-text">
            <b>{english ? "Qawmi Knowledge" : "কওমি জ্ঞানভান্ডার"}</b>
            <small>{english ? "Bangladesh · learning, sources, directory" : "বাংলাদেশ · শিক্ষা, তথ্যসূত্র ও ডিরেক্টরি"}</small>
          </span>
        </Link>
        <nav className="menu" aria-label={english ? "Main navigation" : "প্রধান নেভিগেশন"}>
          {links.map(([href, label]) => {
            const isActive = location.pathname === `${prefix}${href}` || (href !== "/" && location.pathname.startsWith(`${prefix}${href}`));
            return (
              <Link key={href} to={`${prefix}${href}`} className={isActive ? "active" : ""}>{label}</Link>
            );
          })}
          <Link className="lang" to={otherLanguage} title={english ? "বাংলা সংস্করণে যান" : "Switch to English"}>
            <span className="lang-icon" aria-hidden="true">🌐</span> {english ? "বাংলা" : "EN"}
          </Link>
          <button
            className="icon theme-toggle-btn"
            type="button"
            aria-label={english ? "Toggle dark mode" : "ডার্ক মোড"}
            onClick={() => {
              const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
              document.documentElement.dataset.theme = next;
              localStorage.setItem("theme", next);
            }}
          >
            <span className="theme-toggle-icon" aria-hidden="true">◐</span>
          </button>
        </nav>
      </div>
    </header>
  );
}

function SiteFooter({ english }) {
  const prefix = pagePrefix(english);
  return (
    <footer className="foot">
      <div className="footer-grid">
        <div>
          <b>{english ? "Qawmi Knowledge" : "কওমি জ্ঞানভান্ডার"}</b>
          <p>{english
            ? "An independent, source-led guide to Qawmi education in Bangladesh."
            : "বাংলাদেশের কওমি শিক্ষাব্যবস্থা নিয়ে একটি স্বতন্ত্র, তথ্যসূত্রভিত্তিক নির্দেশিকা।"}</p>
        </div>
        <div>
          <b>{english ? "Explore" : "আরও জানুন"}</b>
          <Link to={`${prefix}/madrasas`}>{english ? "Madrasa directory" : "মাদরাসা ডিরেক্টরি"}</Link>
          <Link to={`${prefix}/education`}>{english ? "Education & comparison" : "শিক্ষাব্যবস্থা ও তুলনা"}</Link>
          <Link to={`${prefix}/resources`}>{english ? "Sources & data" : "তথ্যসূত্র ও ডেটা"}</Link>
        </div>
        <div>
          <b>{english ? "Use with care" : "সতর্কতার সঙ্গে ব্যবহার করুন"}</b>
          <p>{english
            ? "Directory records are transcribed from cited sources, not independently verified. Confirm details directly before relying on them."
            : "ডিরেক্টরির তথ্যসূত্রভিত্তিক রেকর্ডগুলো স্বাধীনভাবে যাচাই করা হয়নি। নির্ভর করার আগে সংশ্লিষ্ট প্রতিষ্ঠানের সঙ্গে মিলিয়ে নিন।"}</p>
        </div>
      </div>
      <p className="fine">
        {english ? "Knowledge base v1.3.1 · Independent educational resource" : "তথ্যভান্ডার v1.3.1 · স্বতন্ত্র শিক্ষামূলক উদ্যোগ"}
      </p>
    </footer>
  );
}

function Breadcrumb({ english, items }) {
  const prefix = pagePrefix(english);
  return (
    <nav className="crumbs" aria-label={english ? "Breadcrumb" : "অবস্থান"}>
      <Link to={`${prefix}/`}>{english ? "Home" : "হোম"}</Link>
      {items.map(([label, href], index) => (
        <span key={`${label}-${index}`}>
          <span aria-hidden="true"> / </span>
          {href ? <Link to={`${prefix}${href}`}>{label}</Link> : <span aria-current="page">{label}</span>}
        </span>
      ))}
    </nav>
  );
}

function LocalizedText({ value, english }) {
  const text = getLocalized(value, english);
  return text ? <>{String(text)}</> : <>{EMPTY}</>;
}

function Metric({ value, label, detail }) {
  return (
    <div className="metric">
      <strong>{Number(value).toLocaleString("en")}</strong>
      <span>{label}</span>
      {detail && <small>{detail}</small>}
    </div>
  );
}

function SectionHeading({ eyebrow, title, description, action }) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
        {description && <p className="muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

function PageIntro({ english, eyebrow, title, description, crumbs = [] }) {
  return (
    <>
      {crumbs.length > 0 && <Breadcrumb english={english} items={crumbs} />}
      <section className="page-intro">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p className="lead">{description}</p>}
      </section>
    </>
  );
}

function SearchHero({ english }) {
  const { database } = useDatabase();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const prefix = pagePrefix(english);
  const suggestions = [
    ...database.education_system.stages_as_reported_in_research.map((stage) => getLocalized({ en: stage.name, bn: stage.bn }, english)),
    ...database.terminology.map((term) => getLocalized(term.term, english) || term.term_en || term.term_bn),
    ...database.madrasa_directory.records.slice(0, 8).map((record) => record.name_bn),
  ].filter(Boolean);
  const submit = (event) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    navigate(`${prefix}/search${params.size ? `?${params}` : ""}`);
  };
  return (
    <form className="hero-search" onSubmit={submit}>
      <label htmlFor="hero-query">
        <span className="search-label-icon" aria-hidden="true">🔍</span>
        {english ? "Find a madrasa or explore the Qawmi education system" : "মাদরাসা খুঁজুন অথবা কওমি শিক্ষাব্যবস্থা সম্পর্কে জানুন"}
      </label>
      <div className="search-control">
        <div className="search-input-wrapper">
          <svg className="search-icon-svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18" aria-hidden="true">
            <circle cx="8.5" cy="8.5" r="5.5" />
            <path d="M13 13l4.5 4.5" strokeLinecap="round" />
          </svg>
          <input
            id="hero-query"
            type="search"
            list="knowledge-suggestions"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={english ? "Name, address, ilhak number…" : "নাম, ঠিকানা বা ইলহাক নম্বর…"}
          />
          {query && (
            <button type="button" className="search-clear-btn" onClick={() => setQuery("")} aria-label={english ? "Clear" : "মুছুন"}>✕</button>
          )}
        </div>
        <datalist id="knowledge-suggestions">
          {[...new Set(suggestions)].map((suggestion) => <option value={suggestion} key={suggestion} />)}
        </datalist>
        <button className="btn btn-primary" type="submit">
          <span>{english ? "Search everything" : "সবখানে খুঁজুন"}</span>
          <span aria-hidden="true">→</span>
        </button>
      </div>
      <div className="hero-search-footer">
        <span className="hero-search-note">
          {english
            ? `${database.madrasa_directory.imported_record_count.toLocaleString("en")} source records · Bengali & English search`
            : `${database.madrasa_directory.imported_record_count.toLocaleString("bn-BD")}টি তথ্যসূত্রভিত্তিক রেকর্ড · বাংলা ও ইংরেজি নম্বরে প্রযোজ্য`}
        </span>
        <div className="quick-tags">
          <span className="quick-label">{english ? "Quick search:" : "দ্রুত অনুসন্ধান:"}</span>
          {suggestions.slice(0, 4).map((item) => (
            <button
              key={item}
              type="button"
              className="quick-chip"
              onClick={() => {
                setQuery(item);
                const params = new URLSearchParams();
                params.set("q", item);
                navigate(`${prefix}/search?${params}`);
              }}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
    </form>
  );
}

function HomePage({ english }) {
  const { database, records } = useDatabase();
  const genderCounts = records.reduce((counts, record) => {
    counts[record.gender] = (counts[record.gender] || 0) + 1;
    return counts;
  }, {});
  const telephoneCount = records.reduce((count, record) => count + record.contact_numbers.length, 0);
  const sourceDate = database.metadata.updated_at || database.metadata.created_at;
  usePageMeta(
    english ? "Qawmi Knowledge | Bangladesh Education Guide & Directory" : "কওমি জ্ঞানভান্ডার | শিক্ষা নির্দেশিকা ও মাদরাসা ডিরেক্টরি",
    english
      ? "Explore Qawmi education in Bangladesh with a sourced madrasa directory, education guides, history, syllabi, statistics and references."
      : "তথ্যসূত্রভিত্তিক মাদরাসা ডিরেক্টরি, শিক্ষাব্যবস্থা, ইতিহাস, সিলেবাস, পরিসংখ্যান ও সূত্রের মাধ্যমে বাংলাদেশের কওমি শিক্ষা জানুন।",
  );
  const sections = [
    { href: "/madrasas", icon: "⌕", title: english ? "Find a madrasa" : "মাদরাসা খুঁজুন", text: english ? "Search source records by name, address, affiliation code and the details available in each listing." : "নাম, ঠিকানা, ইলহাক কোড ও প্রতিটি তালিকায় থাকা তথ্য দিয়ে খুঁজুন।" },
    { href: "/education", icon: "⌘", title: english ? "Education & comparison" : "শিক্ষাব্যবস্থা ও তুলনা", text: english ? "Explore Qawmi stages and curriculum, the verified level table, system comparisons and cited legal recognition." : "কওমি শিক্ষার ধাপ ও পাঠ্যক্রম, যাচাইকৃত স্তর-সারণি, শিক্ষাধারার তুলনা ও আইনি স্বীকৃতি জানুন।" },
    { href: "/history", icon: "◷", title: english ? "History & governance" : "ইতিহাস ও পরিচালনা", text: english ? "Explore a cited timeline, education boards and the scope of legal recognition." : "তথ্যসূত্রসহ সময়রেখা, শিক্ষা বোর্ড ও আইনি স্বীকৃতির পরিধি জানুন।" },
    { href: "/syllabus", icon: "▤", title: english ? "Explore syllabi" : "সিলেবাস দেখুন", text: english ? "Review the specialist syllabus records and their source and verification notes." : "বিশেষায়িত সিলেবাস এবং সেগুলোর উৎস ও যাচাই-সংক্রান্ত নোট দেখুন।" },
    { href: "/statistics", icon: "▥", title: english ? "Read the data" : "পরিসংখ্যান জানুন", text: english ? "See what the directory contains and why published national estimates differ." : "ডিরেক্টরির তথ্যের পরিসর ও বিভিন্ন জাতীয় হিসাবের পার্থক্য বুঝুন।" },
    { href: "/results", icon: "↗", title: english ? "Exam & results" : "পরীক্ষা ও ফলাফল", text: english ? "Find board-listed websites and learn how to verify current result notices." : "বোর্ডের তালিকাভুক্ত ওয়েবসাইট দেখুন এবং ফলাফলের বিজ্ঞপ্তি যাচাই করুন।" },
    { href: "/careers", icon: "⌁", title: english ? "Further study & careers" : "উচ্চশিক্ষা ও পেশা", text: english ? "Explore research-described next steps, with clear qualification cautions." : "গবেষণায় উল্লিখিত পরবর্তী ধাপ ও যোগ্যতা-সংক্রান্ত সতর্কতা জানুন।" },
    { href: "/resources", icon: "↗", title: english ? "Sources & resources" : "তথ্যসূত্র ও রিসোর্স", text: english ? "Inspect the underlying references, data notes and limitations before drawing conclusions." : "সিদ্ধান্তে পৌঁছানোর আগে মূল সূত্র, ডেটা নোট ও সীমাবদ্ধতা যাচাই করুন।" },
  ];
  return (
    <>
      <section className="home-hero">
        <div className="hero-copy">
          <div className="hero-pill-badge">
            <span className="hero-pill-dot" />
            <span>{english ? "Independent Guide to Qawmi Education in Bangladesh" : "বাংলাদেশের কওমি শিক্ষার স্বতন্ত্র তথ্যনির্দেশিকা"}</span>
          </div>
          <h1>{english ? <>Learn the system.<br /><em>Find the sources.</em></> : <>শিক্ষাব্যবস্থা জানুন।<br /><em>তথ্যসূত্র খুঁজুন।</em></>}</h1>
          <p className="lead">
            {english
              ? "An independent knowledge platform bringing together a searchable madrasa directory and carefully sourced guides to Qawmi education."
              : "অনুসন্ধানযোগ্য মাদরাসা ডিরেক্টরি এবং তথ্যসূত্রনির্ভর শিক্ষামূলক নির্দেশিকা—একটি স্বতন্ত্র জ্ঞানভান্ডারে।"}
          </p>
          <div className="hero-links">
            <Link className="btn btn-primary" to={`${pagePrefix(english)}/madrasas`}>
              <span>{english ? "Explore directory" : "ডিরেক্টরি দেখুন"}</span>
              <span aria-hidden="true">→</span>
            </Link>
            <Link className="btn btn-secondary" to={`${pagePrefix(english)}/education`}>
              <span>{english ? "System overview" : "শিক্ষাব্যবস্থার রূপরেখা"}</span>
              <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>
        <div className="hero-aside" aria-label={english ? "Knowledge base record" : "তথ্যভান্ডারের পরিচিতি"}>
          <div className="aside-glow" aria-hidden="true" />
          <div className="aside-badge">
            <span className="live-dot" />
            <span>{english ? "KNOWLEDGE BASE" : "তথ্যভান্ডার"}</span>
          </div>
          <div className="aside-main">
            <strong>Qawmi<br />Education</strong>
          </div>
          <div className="aside-rule" />
          <div className="aside-tags">
            <span>{english ? "Directory" : "ডিরেক্টরি"}</span>
            <span>·</span>
            <span>{english ? "History" : "ইতিহাস"}</span>
            <span>·</span>
            <span>{english ? "Study" : "পাঠ্যক্রম"}</span>
            <span>·</span>
            <span>{english ? "Sources" : "সূত্র"}</span>
          </div>
          <div className="aside-footer">
            <small>{english ? `Version ${database.metadata.version} · ${sourceDate}` : `সংস্করণ ${database.metadata.version} · ${sourceDate}`}</small>
          </div>
        </div>
      </section>
      <SearchHero english={english} />
      <section className="metrics-strip" aria-label={english ? "Directory snapshot" : "ডিরেক্টরির সারসংক্ষেপ"}>
        <Metric value={records.length} label={english ? "source records" : "তথ্যসূত্রের রেকর্ড"} detail={english ? "Not a national census" : "জাতীয় জরিপ নয়"} />
        <Metric value={genderCounts.men || 0} label={english ? "marked men" : "পুরুষ হিসেবে চিহ্নিত"} detail={english ? "Source-stated only" : "শুধু উৎসে উল্লিখিত"} />
        <Metric value={genderCounts.women || 0} label={english ? "marked women" : "মহিলা হিসেবে চিহ্নিত"} detail={english ? "Source-stated only" : "শুধু উৎসে উল্লিখিত"} />
        <Metric value={telephoneCount} label={english ? "listed numbers" : "তালিকাভুক্ত ফোন নম্বর"} detail={english ? "Some may be historical" : "কিছু নম্বর পুরোনো হতে পারে"} />
      </section>
      <section className="trust-note">
        <span className="trust-icon" aria-hidden="true">i</span>
        <p>
          <strong>{english ? "A directory is not a census." : "ডিরেক্টরিটি জাতীয় জরিপ নয়।"}</strong>{" "}
          {english
            ? "These records preserve the supplied source wording. Many entries have not been independently verified, and missing details are left blank."
            : "রেকর্ডগুলো সরবরাহকৃত সূত্রের ভাষা অক্ষুণ্ণ রাখে। অনেক তথ্য স্বাধীনভাবে যাচাই করা হয়নি; অনুপস্থিত তথ্য ফাঁকা রাখা হয়েছে।"}
        </p>
        <Link to={`${pagePrefix(english)}/resources`} className="trust-link">{english ? "Read data notes" : "ডেটা নোট পড়ুন"} →</Link>
      </section>
      <section className="explore-section">
        <SectionHeading
          eyebrow={english ? "EXPLORE THE KNOWLEDGE BASE" : "জ্ঞানভান্ডার ঘুরে দেখুন"}
          title={english ? "More than a directory" : "ডিরেক্টরির চেয়েও বেশি"}
          description={english ? "Start with a topic, follow its sources, and understand what the evidence can—and cannot—say." : "একটি বিষয় থেকে শুরু করুন, সূত্র অনুসরণ করুন, এবং তথ্য কী বলতে পারে—কী পারে না—তা বুঝুন।"}
        />
        <div className="explore-grid">
          {sections.map((section) => (
            <Link className="explore-card" key={section.href} to={`${pagePrefix(english)}${section.href}`}>
              <div className="explore-header">
                <span className="explore-icon" aria-hidden="true">{section.icon}</span>
                <span className="explore-arrow" aria-hidden="true">↗</span>
              </div>
              <span className="explore-title">{section.title}</span>
              <span className="explore-text">{section.text}</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

function MadrasaCard({ record, english }) {
  const gender = record.gender === "women"
    ? (english ? "Women" : "মহিলা")
    : record.gender === "men"
      ? (english ? "Men" : "পুরুষ")
      : (english ? "Gender not stated" : "ধরন উল্লেখ নেই");
  return (
    <article className="madrasa-card">
      <div className="madrasa-card-header">
        <span className="record-id">{record.id}</span>
        <span className={`tag ${record.gender === "women" ? "tag-women" : record.gender === "men" ? "tag-men" : ""}`}>{gender}</span>
      </div>
      <Link className="madrasa-name" to={`${pagePrefix(english)}/madrasa/${record.id}`}>
        {record.name_bn}
      </Link>
      <p className="madrasa-address">
        <svg className="location-pin" viewBox="0 0 20 20" fill="currentColor" width="14" height="14" aria-hidden="true">
          <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.273 1.765 11.842 11.842 0 00.976.544l.062.029.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clipRule="evenodd" />
        </svg>
        <span>{record.address_original || (english ? "Address not stated in source" : "তথ্যসূত্রে ঠিকানা উল্লেখ নেই")}</span>
      </p>
      <div className="tag-row">
        {record.affiliation_code && <span className="tag tag-code">{english ? "Ilhak" : "ইলহাক"} · {record.affiliation_code}</span>}
        {record.contact_numbers.length > 0 && <span className="tag tag-contact">{english ? "Contact listed" : "যোগাযোগ আছে"}</span>}
        {record.possible_duplicate_of?.length > 0 && <span className="tag tag-duplicate">{english ? "Possible duplicate · review" : "সম্ভাব্য সদৃশ · যাচাই বাকি"}</span>}
      </div>
      <div className="card-action">
        <span>{english ? "View record profile" : "রেকর্ড প্রোফাইল দেখুন"}</span>
        <span className="card-arrow" aria-hidden="true">→</span>
      </div>
    </article>
  );
}

function DirectoryPage({ english }) {
  const { database, records, sources } = useDatabase();
  const [searchParams, setSearchParams] = useSearchParams();
  const [visibleCount, setVisibleCount] = useState(30);
  const query = searchParams.get("q") ?? "";
  const gender = searchParams.get("gender") ?? "";
  const upazila = searchParams.get("upazila") ?? "";
  const division = searchParams.get("division") ?? "";
  const district = searchParams.get("district") ?? "";
  const locality = searchParams.get("locality") ?? "";
  const contactOnly = searchParams.get("contact") === "1";
  const normalizedQuery = normalizeText(query.trim());
  const recordsWithLocations = useMemo(
    () => records.map((record) => ({ record, district: districtFromAddress(record.address_original) })),
    [records],
  );
  const districtCounts = useMemo(() => {
    const counts = new Map();
    for (const entry of recordsWithLocations) {
      if (entry.district) counts.set(entry.district.slug, (counts.get(entry.district.slug) || 0) + 1);
    }
    return counts;
  }, [recordsWithLocations]);
  const districtOptions = BANGLADESH_DISTRICTS.filter((entry) =>
    districtCounts.has(entry.slug) && (!division || entry.division === division),
  );
  const classifiedCount = [...districtCounts.values()].reduce((sum, count) => sum + count, 0);
  const unclassifiedCount = records.length - classifiedCount;
  const countForDivision = (slug) => BANGLADESH_DISTRICTS
    .filter((entry) => entry.division === slug)
    .reduce((sum, entry) => sum + (districtCounts.get(entry.slug) || 0), 0);
  const upazilas = useMemo(
    () => [...new Set(recordsWithLocations
      .filter(({ district: matchedDistrict }) => {
        if (district === "unclassified") return !matchedDistrict;
        if (district) return matchedDistrict?.slug === district;
        if (division === "unclassified") return !matchedDistrict;
        if (division) return matchedDistrict?.division === division;
        return true;
      })
      .map(({ record }) => record.upazila_original)
      .filter(Boolean))]
      .sort((a, b) => a.localeCompare(b)),
    [district, division, recordsWithLocations],
  );
  const affiliation = searchParams.get("affiliation") ?? "";
  const normalizedLocality = normalizeText(locality.trim());
  const results = useMemo(() => recordsWithLocations
    .filter(({ record, district: matchedDistrict }) => {
    if (gender && record.gender !== gender) return false;
    if (division === "unclassified" && matchedDistrict) return false;
    if (division && division !== "unclassified" && matchedDistrict?.division !== division) return false;
    if (district === "unclassified" && matchedDistrict) return false;
    if (district && district !== "unclassified" && matchedDistrict?.slug !== district) return false;
    if (upazila && record.upazila_original !== upazila) return false;
    if (affiliation && normalizeText(record.affiliation_code || "") !== normalizeText(affiliation)) return false;
    if (contactOnly && record.contact_numbers.length === 0) return false;
    const locationText = normalizeText(`${record.address_original || ""} ${record.upazila_original || ""}`);
    if (normalizedLocality && !locationText.includes(normalizedLocality)) return false;
    if (!normalizedQuery) return true;
    const haystack = normalizeText([
      record.name_bn,
      record.address_original,
      record.upazila_original,
      record.affiliation_code,
      record.id,
      record.source_id,
      record.original_as_submitted,
    ].filter(Boolean).join(" "));
    const code = normalizeText(record.affiliation_code || "");
    return haystack.includes(normalizedQuery) || code.includes(normalizedQuery);
  })
    .map(({ record }) => record), [affiliation, contactOnly, district, division, gender, normalizedLocality, normalizedQuery, recordsWithLocations, upazila]);
  const source = sources.get(database.madrasa_directory.records[0]?.source_id);
  usePageMeta(
    english ? "Madrasa Directory | Qawmi Knowledge" : "মাদরাসা ডিরেক্টরি | কওমি জ্ঞানভান্ডার",
    english
      ? "Search source-transcribed Qawmi madrasa records by name, address, ilhak code, gender or recorded upazila."
      : "নাম, ঠিকানা, ইলহাক কোড, ধরন অথবা উল্লিখিত উপজেলা দিয়ে তথ্যসূত্রভিত্তিক কওমি মাদরাসার তথ্য খুঁজুন।",
  );

  function updateFilters(changes) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      for (const [key, value] of Object.entries(changes)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      return next;
    }, { replace: true });
    setVisibleCount(30);
  }

  return (
    <>
      <PageIntro
        english={english}
        eyebrow={english ? "SOURCE-TRANSCRIBED LISTINGS" : "তথ্যসূত্র থেকে সংকলিত তালিকা"}
        title={english ? "Madrasa directory" : "মাদরাসা ডিরেক্টরি"}
        description={english
          ? `${records.length.toLocaleString("en")} imported entries from the supplied v${database.metadata.version} knowledge base. This is a source collection, not an exhaustive or independently verified national register.`
          : `সরবরাহকৃত v${database.metadata.version} তথ্যভান্ডার থেকে ${records.length.toLocaleString("bn-BD")}টি রেকর্ড। এটি সূত্রভিত্তিক সংকলন—সম্পূর্ণ বা স্বাধীনভাবে যাচাইকৃত জাতীয় তালিকা নয়।`}
      />
      <section className="directory-tools">
        <label className="sr-only" htmlFor="directory-query">{english ? "Search directory" : "ডিরেক্টরিতে খুঁজুন"}</label>
        <div className="directory-search-wrapper">
          <svg className="search-icon-svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18" aria-hidden="true">
            <circle cx="8.5" cy="8.5" r="5.5" />
            <path d="M13 13l4.5 4.5" strokeLinecap="round" />
          </svg>
          <input
            id="directory-query"
            type="search"
            value={query}
            onChange={(event) => updateFilters({ q: event.target.value })}
            placeholder={english ? "Search name, address, ilhak code or record ID…" : "নাম, ঠিকানা, ইলহাক কোড বা রেকর্ড আইডি লিখুন…"}
          />
          {query && (
            <button type="button" className="search-clear-btn" onClick={() => updateFilters({ q: "" })} aria-label={english ? "Clear" : "মুছুন"}>✕</button>
          )}
        </div>
        <div className="directory-quick-bar">
          <span className="quick-bar-label">{english ? "Gender:" : "ধরন:"}</span>
          <div className="quick-pill-group">
            {[
              ["", english ? "All" : "সব"],
              ["men", english ? "Men" : "পুরুষ"],
              ["women", english ? "Women" : "মহিলা"],
              ["unspecified", english ? "Unspecified" : "অনির্দিষ্ট"],
            ].map(([val, label]) => (
              <button
                key={val}
                type="button"
                className={`quick-pill ${gender === val ? "active" : ""}`}
                onClick={() => updateFilters({ gender: val })}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="check-filter-pill">
            <input type="checkbox" checked={contactOnly} onChange={(event) => updateFilters({ contact: event.target.checked ? "1" : "" })} />
            <span>📞 {english ? "Phone listed" : "ফোন নম্বর আছে"}</span>
          </label>
        </div>
        <div className="directory-filters">
          <label>
            <span className="filter-label-text">{english ? "Division" : "বিভাগ"}</span>
            <select value={division} onChange={(event) => updateFilters({ division: event.target.value, district: "", upazila: "" })}>
              <option value="">{english ? "All divisions" : "সব বিভাগ"}</option>
              {BANGLADESH_DIVISIONS.map((entry) => (
                <option value={entry.slug} key={entry.slug}>
                  {entry[english ? "en" : "bn"]} ({countForDivision(entry.slug).toLocaleString(english ? "en" : "bn-BD")})
                </option>
              ))}
              <option value="unclassified">
                {english ? "Unclassified address" : "অশ্রেণিবদ্ধ ঠিকানা"} ({unclassifiedCount.toLocaleString(english ? "en" : "bn-BD")})
              </option>
            </select>
          </label>
          <label>
            <span className="filter-label-text">{english ? "District" : "জেলা"}</span>
            <select value={district} onChange={(event) => updateFilters({ district: event.target.value, upazila: "" })}>
              <option value="">{english ? "All districts" : "সব জেলা"}</option>
              {districtOptions.map((entry) => (
                <option value={entry.slug} key={entry.slug}>
                  {entry[english ? "en" : "bn"]} ({districtCounts.get(entry.slug).toLocaleString(english ? "en" : "bn-BD")})
                </option>
              ))}
              {(!division || division === "unclassified") && (
                <option value="unclassified">
                  {english ? "Unclassified" : "অশ্রেণিবদ্ধ"} ({unclassifiedCount.toLocaleString(english ? "en" : "bn-BD")})
                </option>
              )}
            </select>
          </label>
          <label>
            <span className="filter-label-text">{english ? "Upazila / thana" : "উপজেলা / থানা"}</span>
            <select value={upazila} onChange={(event) => updateFilters({ upazila: event.target.value })}>
              <option value="">{english ? "All stated areas" : "সব এলাকা"}</option>
              {upazilas.map((area) => <option value={area} key={area}>{area}</option>)}
            </select>
          </label>
          <label>
            <span className="filter-label-text">{english ? "Union / village / locality" : "ইউনিয়ন / গ্রাম / এলাকা"}</span>
            <input
              type="search"
              value={locality}
              onChange={(event) => updateFilters({ locality: event.target.value })}
              placeholder={english ? "Search within original address" : "মূল ঠিকানায় খুঁজুন"}
            />
          </label>
          <label>
            <span className="filter-label-text">{english ? "Affiliation / ilhak code" : "অধিভুক্তি / ইলহাক কোড"}</span>
            <input
              type="search"
              value={affiliation}
              onChange={(event) => updateFilters({ affiliation: event.target.value })}
              placeholder={english ? "Enter exact code" : "সঠিক কোড লিখুন"}
            />
          </label>
          {(query || division || district || gender || upazila || locality || affiliation || contactOnly) && (
            <button className="ghost clear-all-btn" type="button" onClick={() => updateFilters({ q: "", division: "", district: "", gender: "", upazila: "", locality: "", affiliation: "", contact: "" })}>
              ✕ {english ? "Reset filters" : "ফিল্টার মুছুন"}
            </button>
          )}
        </div>
        <div className="results-meta" aria-live="polite">
          <div className="results-count">
            <strong>{results.length.toLocaleString(english ? "en" : "bn-BD")}</strong> {english ? "matching records" : "টি মিল পাওয়া রেকর্ড"}
          </div>
          <span className="results-url-note">{english ? "Filters synced to URL" : "ফিল্টার URL-এ সংরক্ষিত"}</span>
        </div>
        <p className="filter-note">
          {english
            ? "Division and district are matched only when the original address contains a recognizable district name. Records without a reliable match remain unclassified; locality searches use original address text."
            : "মূল ঠিকানায় শনাক্তযোগ্য জেলার নাম থাকলেই বিভাগ ও জেলা মেলানো হয়। নির্ভরযোগ্য মিল না পাওয়া রেকর্ড অশ্রেণিবদ্ধ থাকে; স্থানীয় এলাকা মূল ঠিকানার লেখায় খোঁজা হয়।"}
        </p>
      </section>
      {results.length > 0 ? (
        <div className="madrasa-grid">
          {results.slice(0, visibleCount).map((record) => <MadrasaCard key={record.id} record={record} english={english} />)}
        </div>
      ) : (
        <div className="empty-state">{english ? "No records match these filters." : "এই ফিল্টারে কোনো রেকর্ড পাওয়া যায়নি।"}</div>
      )}
      {visibleCount < results.length && (
        <div className="more">
          <button className="btn btn-secondary" type="button" onClick={() => setVisibleCount((count) => count + 30)}>
            {english ? `Show 30 more (${(results.length - visibleCount).toLocaleString("en")} remaining)` : `আরও ৩০টি দেখুন (বাকি ${(results.length - visibleCount).toLocaleString("bn-BD")}টি)`}
          </button>
        </div>
      )}
      {source && (
        <p className="data-footnote">
          {english ? "Directory source:" : "ডিরেক্টরির উৎস:"} {source.title?.en || source.title || source.name} · {english ? "See" : "দেখুন"} <Link to={`${pagePrefix(english)}/resources`}>{english ? "sources and data notes" : "তথ্যসূত্র ও ডেটা নোট"}</Link>.
        </p>
      )}
      <section className="callout map-note">
        <strong>{english ? "Location map not available for this dataset" : "এই ডেটাসেটে অবস্থানের মানচিত্র নেই"}</strong>
        <p>{english
          ? "The source contains address text but no verified geographic coordinates or complete division/district fields. A map would imply location precision the data does not provide."
          : "সূত্রে ঠিকানার লেখা আছে, কিন্তু যাচাইকৃত স্থানাঙ্ক বা পূর্ণাঙ্গ বিভাগ/জেলা তথ্য নেই। মানচিত্র দেখালে ডেটার চেয়ে বেশি নির্ভুলতার ধারণা তৈরি হবে।"}</p>
      </section>
    </>
  );
}

function GlobalSearchPage({ english }) {
  const { database, records } = useDatabase();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const normalizedQuery = normalizeText(query.trim());
  const prefix = pagePrefix(english);
  const items = useMemo(() => {
    const directoryItems = records.map((record) => ({
      category: english ? "Madrasa" : "মাদরাসা",
      title: record.name_bn,
      description: record.address_original,
      href: `${prefix}/madrasa/${record.id}`,
      content: [record.name_bn, record.address_original, record.upazila_original, record.affiliation_code, record.id].filter(Boolean).join(" "),
    }));
    const timelineItems = database.history.timeline.map((event) => ({
      category: english ? "History" : "ইতিহাস",
      title: event.date,
      description: english ? (event.event || event.event_bn) : (event.event_bn || event.event),
      href: `${prefix}/history`,
      content: JSON.stringify(event),
    }));
    const stageItems = database.education_system.stages_as_reported_in_research.map((stage) => ({
      category: english ? "Education stage" : "শিক্ষার ধাপ",
      title: stage.name,
      description: stage.bn,
      href: `${prefix}/education`,
      content: JSON.stringify(stage),
    }));
    const syllabusItems = database.specialized_syllabi.map((syllabus) => ({
      category: english ? "Syllabus" : "সিলেবাস",
      title: getLocalized(syllabus.title, english) || syllabus.title,
      description: getLocalized(syllabus.audience, english),
      href: `${prefix}/syllabus`,
      content: JSON.stringify(syllabus),
    }));
    const boardItems = database.boards_and_governance.map((board) => ({
      category: english ? "Organization" : "সংগঠন",
      title: getLocalized(board.name, english) || board.short_name || board.id,
      description: getLocalized(board.description, english) || board.note_bn,
      href: `${prefix}/history`,
      content: JSON.stringify(board),
    }));
    const sourceItems = database.sources.map((source) => ({
      category: english ? "Source" : "তথ্যসূত্র",
      title: getLocalized(source.title, english) || source.name || source.id,
      description: source.publisher || source.description,
      href: `${prefix}/resources`,
      content: JSON.stringify(source),
    }));
    const termItems = database.terminology.map((term) => ({
      category: english ? "Term" : "পরিভাষা",
      title: getLocalized(term.term, english) || term.term_en || term.term_bn,
      description: getLocalized(term.definition, english) || term.definition,
      href: `${prefix}/education`,
      content: JSON.stringify(term),
    }));
    const domainItems = database.education_system.curriculum_domains.map((domain) => ({
      category: english ? "Curriculum" : "পাঠ্যক্রম",
      title: getLocalized(domain.name, english),
      description: getLocalized(domain.topics, english),
      href: `${prefix}/education`,
      content: JSON.stringify(domain),
    }));
    const careerItems = database.career_and_further_study.common_pathways.map((pathway) => ({
      category: english ? "Further study & careers" : "উচ্চশিক্ষা ও পেশা",
      title: getLocalized(pathway, english),
      description: "",
      href: `${prefix}/careers`,
      content: JSON.stringify(pathway),
    }));
    const lawItems = database.law_and_recognition.map((law) => ({
      category: english ? "Recognition & policy" : "স্বীকৃতি ও নীতি",
      title: getLocalized(law.title, english),
      description: getLocalized(law.key_effect, english),
      href: `${prefix}/history`,
      content: JSON.stringify(law),
    }));
    const articleItems = database.research_articles_and_commentary.map((article) => ({
      category: english ? "Research & commentary" : "গবেষণা ও মতামত",
      title: getLocalized(article.title, english) || article.title,
      description: article.author || article.content_type,
      href: `${prefix}/resources`,
      content: JSON.stringify(article),
    }));
    return [...directoryItems, ...timelineItems, ...stageItems, ...syllabusItems, ...boardItems, ...sourceItems, ...termItems, ...domainItems, ...careerItems, ...lawItems, ...articleItems];
  }, [database, english, prefix, records]);
  const results = useMemo(() => {
    if (!normalizedQuery) return [];
    return items
      .map((item) => {
        const title = normalizeText(item.title);
        const description = normalizeText(item.description || "");
        const content = normalizeText(item.content);
        const score = title.includes(normalizedQuery) ? 3 : description.includes(normalizedQuery) ? 2 : content.includes(normalizedQuery) ? 1 : 0;
        return { item, score };
      })
      .filter((result) => result.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 60)
      .map((result) => result.item);
  }, [items, normalizedQuery]);
  usePageMeta(
    english ? "Search Qawmi Knowledge" : "কওমি জ্ঞানভান্ডারে খুঁজুন",
    english ? "Search madrasa records, education stages, syllabi, history, organizations and cited sources." : "মাদরাসার তথ্য, শিক্ষার ধাপ, সিলেবাস, ইতিহাস, সংগঠন ও তথ্যসূত্র খুঁজুন।",
  );
  return (
    <>
      <PageIntro english={english} eyebrow={english ? "GLOBAL SEARCH" : "সর্বত্র অনুসন্ধান"} title={english ? "Search the knowledge base" : "জ্ঞানভান্ডারে খুঁজুন"} description={english ? "Search madrasa names and addresses alongside education stages, syllabi, history, organizations and references." : "মাদরাসার নাম ও ঠিকানার পাশাপাশি শিক্ষার ধাপ, সিলেবাস, ইতিহাস, সংগঠন ও তথ্যসূত্র খুঁজুন।"} />
      <section className="directory-tools">
        <label className="sr-only" htmlFor="global-query">{english ? "Search all content" : "সব বিষয় খুঁজুন"}</label>
        <input id="global-query" type="search" value={query} onChange={(event) => setSearchParams((current) => { const next = new URLSearchParams(current); if (event.target.value) next.set("q", event.target.value); else next.delete("q"); return next; }, { replace: true })} placeholder={english ? "Search in Bengali or English…" : "বাংলা বা ইংরেজিতে খুঁজুন…"} />
        <div className="results-meta" aria-live="polite">
          {!normalizedQuery
            ? (english ? "Enter a word or phrase to search all content." : "সব বিষয় খুঁজতে একটি শব্দ বা বাক্য লিখুন।")
            : <><strong>{results.length.toLocaleString(english ? "en" : "bn-BD")}</strong> {english ? "results (up to 60 shown)" : "টি ফলাফল (সর্বোচ্চ ৬০টি দেখানো হচ্ছে)"}</>}
        </div>
      </section>
      {results.length > 0 ? (
        <div className="search-results-list">
          {results.map((item, index) => (
            <article className="search-result" key={`${item.category}-${item.href}-${index}`}>
              <span className="eyebrow">{item.category}</span>
              <h2><Link to={item.href}>{item.title}</Link></h2>
              {item.description && <p><LocalizedText value={item.description} english={english} /></p>}
            </article>
          ))}
        </div>
      ) : normalizedQuery ? (
        <div className="empty-state">{english ? "No matching content was found." : "কোনো মিল পাওয়া যায়নি।"}</div>
      ) : null}
    </>
  );
}

function humanize(key) {
  return String(key).replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function EducationComparisonSection({ english }) {
  const { database, sources } = useDatabase();
  const overview = database.overview;
  const education = database.education_system;
  const suppliedTable = education.equivalency_pathway_from_user_image;
  const legalAct = database.law_and_recognition.find((entry) => entry.id === "bd_act_48_2018");
  const officialReferences = [
    {
      label: english ? "NCTB: primary curriculum (revised 2025)" : "এনসিটিবি: প্রাথমিক শিক্ষাক্রম (পরিমার্জিত ২০২৫)",
      url: "https://nctb.gov.bd/pages/static-pages/6922dd0b933eb65569e13492",
    },
    {
      label: english ? "NCTB: secondary curriculum resources" : "এনসিটিবি: মাধ্যমিক শিক্ষাক্রম",
      url: "https://nctb.gov.bd/pages/files/6922db5b933eb65569e09a2c",
    },
    {
      label: english ? "NCTB: higher-secondary curriculum resources" : "এনসিটিবি: উচ্চ-মাধ্যমিক শিক্ষাক্রম",
      url: "https://nctb.gov.bd/pages/files/6922dbc6933eb65569e0c702",
    },
    {
      label: english ? "Bangladesh Madrasah Education Board (Dakhil / Alim exam and notices)" : "বাংলাদেশ মাদরাসা শিক্ষা বোর্ড (দাখিল / আলিম পরীক্ষা ও বিজ্ঞপ্তি)",
      url: "https://bmeb.gov.bd/",
    },
    {
      label: english ? "Madrasah Education Board: official history and scope" : "মাদরাসা শিক্ষা বোর্ড: সরকারি ইতিহাস ও এখতিয়ার",
      url: "https://bmeb.gov.bd/pages/static-pages/691997bf933eb65569ddec81",
    },
  ];
  const qawmiRecords = suppliedTable.records;
  const qawmiFacts = [
    [english ? "Education stream" : "শিক্ষাধারা", getLocalized(overview.definition, english)],
    [english ? "Stages and curriculum" : "ধাপ ও পাঠ্যক্রম", getLocalized(education.general_description, english)],
    [english ? "Governance" : "পরিচালনা", english ? "Multiple education boards and affiliated networks are noted in the source database." : "তথ্যভান্ডারে একাধিক শিক্ষা বোর্ড ও অধিভুক্ত নেটওয়ার্কের কথা উল্লেখ আছে।"],
    [english ? "Recognition" : "স্বীকৃতি", legalAct ? getLocalized(legalAct.key_effect, english) : ""],
  ];
  const aliaFacts = [
    [english ? "Relationship" : "সম্পর্ক", getLocalized(overview.distinction_from_alia, english)],
    [english ? "Curriculum and examinations" : "পাঠ্যক্রম ও পরীক্ষা", english ? "The supplied primary database does not provide a detailed Alia curriculum or examination-stage mapping." : "সরবরাহকৃত মূল তথ্যভান্ডারে আলিয়া পাঠ্যক্রম বা পরীক্ষার ধাপের বিস্তারিত মানচিত্র নেই।"],
    [english ? "Authority" : "কর্তৃপক্ষ", english ? "The source distinguishes Alia from Qawmi; a complete current authority comparison is not included." : "সূত্রে আলিয়াকে কওমি থেকে পৃথক করা হয়েছে; বর্তমান কর্তৃপক্ষের পূর্ণাঙ্গ তুলনা নেই।"],
    [english ? "Qualifications" : "সনদ", english ? "Current equivalency and admission details are not fully documented in this dataset." : "বর্তমান সমমান ও ভর্তি-সংক্রান্ত তথ্য এই ডেটাসেটে পূর্ণাঙ্গভাবে নথিভুক্ত নয়।"],
  ];
  const generalFacts = [
    [english ? "Comparison status" : "তুলনার অবস্থা", english ? "The supplied primary database does not contain a researched general-education profile." : "সরবরাহকৃত মূল তথ্যভান্ডারে সাধারণ শিক্ষার গবেষণাভিত্তিক প্রোফাইল নেই।"],
    [english ? "Curriculum and authority" : "পাঠ্যক্রম ও কর্তৃপক্ষ", english ? "No detailed comparison is shown until verified sources are added." : "যাচাইকৃত সূত্র যুক্ত না হওয়া পর্যন্ত বিস্তারিত তুলনা দেখানো হচ্ছে না।"],
    [english ? "Qualifications" : "সনদ", english ? "Do not infer equivalency, progression or eligibility from the current source file." : "বর্তমান তথ্যসূত্র থেকে সমমান, অগ্রগতি বা যোগ্যতা অনুমান করা উচিত নয়।"],
  ];
  const columns = [
    { title: english ? "Qawmi education" : "কওমি শিক্ষা", facts: qawmiFacts, active: true },
    { title: english ? "Alia Madrasa" : "আলিয়া মাদরাসা", facts: aliaFacts },
    { title: english ? "General education" : "সাধারণ শিক্ষা", facts: generalFacts },
  ];
  return (
    <>
      <section className="block-section">
        <SectionHeading
          eyebrow={english ? "LEVELS & EQUIVALENCIES" : "স্তর ও সমমান"}
          title={english ? "Qawmi madrasa stages, equivalencies, duration & main subjects" : suppliedTable.title_bn}
          description={english
            ? "A clear presentation of the six Qawmi stages, equivalent levels, duration and main subjects from the user-verified table."
            : "ব্যবহারকারীর যাচাইকৃত সারণির ছয়টি কওমি স্তর, সমমান, মেয়াদ ও মূল বিষয় পরিষ্কারভাবে সাজানো হয়েছে।"}
        />
      </section>
      <div className="callout callout-warning">
        <strong>{english ? "The table has been checked by the user" : "সারণির তথ্য ব্যবহারকারী যাচাই করেছেন"}</strong>
        <p>{english
          ? "The equivalency column reflects that verified table. The separate legal note below describes the scope of statutory Taqmil recognition."
          : "সমমানের কলামে সেই যাচাইকৃত সারণির তথ্যই দেওয়া হয়েছে। নিচের আইনি নোটে তাকমিলের আইনগত স্বীকৃতির পরিধি আলাদাভাবে বলা হয়েছে।"}</p>
      </div>
      <section className="content-panel block-section equivalency-section">
        <SectionHeading
          eyebrow={english ? "USER-VERIFIED TABLE" : "ব্যবহারকারী-যাচাইকৃত সারণি"}
          title={english ? "Stages, equivalencies, duration & main subjects" : suppliedTable.title_bn}
          description={english ? "Six rows from the checked source table, shown without adding unlisted stage names or subjects." : "যাচাইকৃত মূল সারণির ছয়টি ধাপ—অতিরিক্ত স্তরের নাম বা বিষয় অনুমান করে যোগ করা হয়নি।"}
        />
        <div className="table-scroll">
          <table className="comparison-table qawmi-level-table">
            <thead>
              <tr>
                <th scope="col">{english ? "Qawmi stage" : "কওমি স্তর"}</th>
                <th scope="col">{english ? "Equivalent level" : "সমমান"}</th>
                <th scope="col">{english ? "Duration" : "মেয়াদ"}</th>
                <th scope="col">{english ? "Main subjects" : "মূল বিষয়"}</th>
              </tr>
            </thead>
            <tbody>
              {qawmiRecords.map((record, index) => (
                <tr key={`${record.level_name_bn}-${index}`}>
                  <th scope="row" data-label={english ? "Qawmi stage" : "কওমি স্তর"}>{record.level_name_bn || (english ? "Not named in source table" : "সারণিতে স্তরের নাম উল্লেখ নেই")}</th>
                  <td data-label={english ? "Equivalent level" : "সমমান"}>{record.equivalent_level_bn}</td>
                  <td data-label={english ? "Duration" : "মেয়াদ"} className="duration-cell">{record.duration_bn}</td>
                  <td data-label={english ? "Main subjects" : "মূল বিষয়"}>{record.main_subjects_bn}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="table-footnote">{english
          ? "Three stage-name cells are blank in the source table and are shown as such; all other listed details follow the user-verified table."
          : "মূল সারণিতে তিনটি স্তরের নাম ফাঁকা—তাই সেগুলো ফাঁকা হিসেবেই দেখানো হয়েছে; বাকি তথ্য ব্যবহারকারী-যাচাইকৃত সারণি অনুযায়ী।"}</p>
        <details className="table-source-notes">
          <summary>{english ? "Source and transcription notes" : "তথ্যসূত্র ও প্রতিলিপি-সংক্রান্ত নোট"}</summary>
          <p>{english ? "The table details were checked by the user against the supplied source. The statutory Taqmil recognition is explained separately below." : "ব্যবহারকারী সরবরাহকৃত মূল সূত্রের সঙ্গে মিলিয়ে সারণির তথ্য যাচাই করেছেন। তাকমিলের আইনগত স্বীকৃতি নিচে আলাদাভাবে ব্যাখ্যা করা হয়েছে।"}</p>
          {sources.get(suppliedTable.source_id) && <p>{suppliedTable.source_id} · {sources.get(suppliedTable.source_id).title}</p>}
        </details>
      </section>
      <section className="content-panel block-section online-source-panel">
        <SectionHeading
          eyebrow={english ? "CHECKED ONLINE · 1 NOV 2026" : "অনলাইনে যাচাই · ১ নভেম্বর ২০২৬"}
          title={english ? "Official references used in this comparison" : "এই তুলনায় ব্যবহৃত সরকারি তথ্যসূত্র"}
          description={english ? "The official pages establish curriculum domains, public examinations and board jurisdiction. They do not turn every stage label into a legally interchangeable certificate." : "সরকারি পেজগুলো শিক্ষাক্রম, পাবলিক পরীক্ষা ও বোর্ডের এখতিয়ার নিশ্চিত করে। এগুলো প্রতিটি স্তরের নামকে আইনি সমমানের সনদে রূপান্তর করে না।"}
        />
        <ul className="official-reference-list">
          {officialReferences.map((reference) => (
            <li key={reference.url}>
              <a href={reference.url} target="_blank" rel="noreferrer noopener">{reference.label} ↗</a>
            </li>
          ))}
          {legalAct && legalAct.primary_source_ids.map((id) => {
            const source = sources.get(id);
            return source?.url ? (
              <li key={id}><a href={source.url} target="_blank" rel="noreferrer noopener">{english ? `Official law: ${source.title}` : `সরকারি আইন: ${source.title}`} ↗</a></li>
            ) : null;
          })}
        </ul>
      </section>
      {legalAct && (
        <section className="official-equivalency block-section">
          <span className="official-label">{english ? "OFFICIAL LEGAL RECOGNITION" : "সরকারি আইনি স্বীকৃতি"}</span>
          <h2>{getLocalized(legalAct.title, english)}</h2>
          <p>{getLocalized(legalAct.key_effect, english)}</p>
          <p className="official-scope">{legalAct.scope_note}</p>
          <div className="source-chips">
            {legalAct.primary_source_ids.map((id) => {
              const source = sources.get(id);
              return source?.url
                ? <a className="source-chip" href={source.url} target="_blank" rel="noreferrer noopener" key={id}>{id} · {source.title} ↗</a>
                : <span className="source-chip" key={id}>{id}</span>;
            })}
          </div>
        </section>
      )}
      <section className="block-section">
        <SectionHeading
          eyebrow={english ? "SYSTEM CONTEXT" : "শিক্ষাধারার প্রেক্ষাপট"}
          title={english ? "Qawmi, Alia & general education" : "কওমি, আলিয়া ও সাধারণ শিক্ষা"}
          description={english ? "The supplied database supports only a limited comparison; unsupported details are identified rather than guessed." : "সরবরাহকৃত তথ্যভান্ডারে সীমিত তুলনার তথ্য আছে; অনুপস্থিত তথ্য অনুমান না করে স্পষ্টভাবে চিহ্নিত করা হয়েছে।"}
        />
      <div className="comparison-grid">
        {columns.map((column) => (
          <article className={`content-panel comparison-card ${column.active ? "comparison-primary" : ""}`} key={column.title}>
            <h2>{column.title}</h2>
            {column.facts.map(([label, fact]) => (
              <div className="comparison-row" key={label}>
                <strong>{label}</strong>
                <p>{fact || (english ? "Not documented in the supplied database." : "সরবরাহকৃত তথ্যভান্ডারে নথিভুক্ত নেই।")}</p>
              </div>
            ))}
          </article>
        ))}
      </div>
      </section>
      <p className="data-footnote">{english ? "Primary source:" : "মূল তথ্যসূত্র:"} <Link to={`${pagePrefix(english)}/resources`}>{english ? "view the cited references and research limits" : "উদ্ধৃত সূত্র ও গবেষণার সীমা দেখুন"}</Link>.</p>
    </>
  );
}

function DataValue({ value, english, depth = 0 }) {
  if (value === null || value === undefined || value === "") return <span className="muted">{EMPTY}</span>;
  if (typeof value === "boolean") return <>{value ? (english ? "Yes" : "হ্যাঁ") : (english ? "No" : "না")}</>;
  if (typeof value === "number") return <>{value.toLocaleString(english ? "en" : "bn-BD")}</>;
  if (typeof value === "string") {
    if (/^https?:\/\//i.test(value)) {
      return <a href={value} target="_blank" rel="noreferrer noopener">{english ? "Open source ↗" : "সূত্র খুলুন ↗"}</a>;
    }
    return <>{value}</>;
  }
  if (Array.isArray(value)) {
    if (!value.length) return <span className="muted">{EMPTY}</span>;
    return <ul className={depth ? "nested-list" : "content-list"}>{value.map((item, index) => <li key={`${index}-${typeof item === "string" ? item.slice(0, 20) : "entry"}`}><DataValue value={item} english={english} depth={depth + 1} /></li>)}</ul>;
  }
  if (typeof value === "object") {
    if (Object.hasOwn(value, english ? "en" : "bn") || Object.hasOwn(value, "en") || Object.hasOwn(value, "bn")) {
      const localized = getLocalized(value, english);
      const other = value[english ? "bn" : "en"];
      return (
        <span className="localized-value">
          {localized}
          {other && <small>{english ? "বাংলা" : "English"}: {other}</small>}
        </span>
      );
    }
    const entries = Object.entries(value).filter(([key]) => !["source_ids", "id"].includes(key));
    return (
      <dl className={`data-dl depth-${Math.min(depth, 2)}`}>
        {entries.map(([key, item]) => (
          <div key={key}>
            <dt>{humanize(key)}</dt>
            <dd><DataValue value={item} english={english} depth={depth + 1} /></dd>
          </div>
        ))}
      </dl>
    );
  }
  return <>{String(value)}</>;
}

function MadrasaPage({ english, id }) {
  const { records, sources } = useDatabase();
  const numericId = id.match(/^\d+$/) ? `qawmi_bd_${id.padStart(4, "0")}` : id;
  const record = records.find((item) => item.id === numericId);
  usePageMeta(
    record ? `${record.name_bn} | Madrasa Directory` : (english ? "Record not found" : "রেকর্ড পাওয়া যায়নি"),
    record ? `${record.address_original} · ${english ? "Source ID" : "তথ্যসূত্র"} ${record.source_id}` : "",
  );
  if (!record) return <NotFound english={english} />;

  const source = sources.get(record.source_id);
  const verificationLabel = record.verification_status === "source_transcribed_not_independently_verified"
    ? (english ? "Transcribed from source · not independently verified" : "তথ্যসূত্র থেকে সংকলিত · স্বাধীনভাবে যাচাই করা হয়নি")
    : record.verification_status === "source_transcribed_location_unverified"
      ? (english ? "Location not independently verified" : "অবস্থান স্বাধীনভাবে যাচাই করা হয়নি")
      : (english ? "Source-transcribed · structural repair noted" : "তথ্যসূত্র থেকে সংকলিত · কাঠামোগত সংশোধন নোট করা হয়েছে");
  const reportUrl = `https://github.com/salman-anik/Koumi-madrasa-list/issues/new?title=${encodeURIComponent(`Directory correction: ${record.id}`)}&body=${encodeURIComponent(`Please review this source record.\n\nRecord ID: ${record.id}\nMadrasa: ${record.name_bn}\nCurrent address in database: ${record.address_original}\nSource ID: ${record.source_id}\n\nSuggested correction and a public source URL:\n\nPlease do not include private student or staff details.`)}`;

  return (
    <>
      <PageIntro
        english={english}
        crumbs={[[english ? "Directory" : "ডিরেক্টরি", "/madrasas"], [record.name_bn]]}
        eyebrow={`${record.id} · ${record.source_id}`}
        title={record.name_bn}
        description={record.address_original || (english ? "Address not stated in source" : "তথ্যসূত্রে ঠিকানা উল্লেখ নেই")}
      />
      <div className="detail-layout">
        <section className="content-panel">
          <h2>{english ? "Record details" : "রেকর্ডের তথ্য"}</h2>
          <dl className="record-details">
            <div><dt>{english ? "Original name" : "মূল নাম"}</dt><dd>{record.name_bn}</dd></div>
            <div><dt>{english ? "Original address" : "মূল ঠিকানা"}</dt><dd>{record.address_original || (english ? "Not stated in source" : "তথ্যসূত্রে উল্লেখ নেই")}</dd></div>
            <div><dt>{english ? "Gender" : "ধরন"}</dt><dd>{record.gender === "women" ? (english ? "Women" : "মহিলা") : record.gender === "men" ? (english ? "Men" : "পুরুষ") : (english ? "Not stated in source" : "তথ্যসূত্রে উল্লেখ নেই")}</dd></div>
            <div><dt>{english ? "Affiliation / ilhak code" : "ইলহাক / অধিভুক্তি কোড"}</dt><dd>{record.affiliation_code || (english ? "Not stated" : "উল্লেখ নেই")}</dd></div>
            <div><dt>{english ? "Upazila" : "উপজেলা"}</dt><dd>{record.upazila_original || (english ? "Not stated" : "উল্লেখ নেই")}</dd></div>
            <div><dt>{english ? "Source record" : "তথ্যসূত্রের রেকর্ড"}</dt><dd>{source?.title?.en || source?.title || record.source_id}</dd></div>
            <div><dt>{english ? "Contact research status" : "যোগাযোগ-তথ্য অনুসন্ধানের অবস্থা"}</dt><dd>{humanize(record.contact_research_status || "not stated")}</dd></div>
            {record.original_as_submitted && <div><dt>{english ? "Original submitted text" : "জমা দেওয়া মূল পাঠ"}</dt><dd><DataValue value={record.original_as_submitted} english={english} /></dd></div>}
            {record.repair_note && <div><dt>{english ? "Data note" : "ডেটা নোট"}</dt><dd>{record.repair_note}</dd></div>}
            {record.also_listed_in?.length > 0 && <div><dt>{english ? "Also listed in" : "অন্য তালিকায়ও আছে"}</dt><dd><DataValue value={record.also_listed_in} english={english} /></dd></div>}
            {record.possible_duplicate_of && <div><dt>{english ? "Possible duplicate" : "সম্ভাব্য সদৃশ রেকর্ড"}</dt><dd><DataValue value={record.possible_duplicate_of} english={english} /></dd></div>}
          </dl>
        </section>
        <aside className="detail-side">
          <div className="status-card">
            <span className="status-dot" aria-hidden="true" />
            <strong>{english ? "Verification status" : "যাচাইয়ের অবস্থা"}</strong>
            <p>{verificationLabel}</p>
            <small>{english ? "Please confirm the current name, address and affiliation directly." : "বর্তমান নাম, ঠিকানা ও অধিভুক্তি সরাসরি যাচাই করে নিন।"}</small>
          </div>
          <div className="content-panel">
            <h2>{english ? "Contact information" : "যোগাযোগের তথ্য"}</h2>
            {record.contact_numbers.length ? (
              <div className="contact-list">
                {record.contact_numbers.map((contact, index) => (
                  <div className="contact-item" key={`${contact.number}-${index}`}>
                    <a className="phone-number" href={`tel:${contact.number.replace(/[^\d+]/g, "")}`}>{contact.number}</a>
                    <p>{contact.listing_context || contact.type}</p>
                    <span className="contact-warning">{contact.verification === "publicly_listed_historical_not_currently_confirmed"
                      ? (english ? `Historical listing · ${contact.source_date || "date stated by source"} · current status not confirmed` : `পুরোনো তালিকাভুক্ত নম্বর · ${contact.source_date || "সূত্রে উল্লিখিত তারিখ"} · বর্তমান অবস্থা নিশ্চিত নয়`)
                      : (english ? "Publicly listed · not call-verified" : "প্রকাশ্য সূত্রে তালিকাভুক্ত · ফোনে যাচাই করা হয়নি")}</span>
                    {(record.contact_sources[index] || record.contact_sources[0]) && (
                      <p className="contact-source">{(record.contact_sources[index] || record.contact_sources[0]).source_name} · {(record.contact_sources[index] || record.contact_sources[0]).published_on || (record.contact_sources[index] || record.contact_sources[0]).checked_on}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">{record.contact_research_status === "searched_no_public_number_found"
                ? (english ? "The contact search found no public phone number. No number has been inferred." : "যোগাযোগ অনুসন্ধানে কোনো প্রকাশ্য ফোন নম্বর পাওয়া যায়নি। অনুমান করে নম্বর যোগ করা হয়নি।")
                : (english ? "No public phone number was included in this source record. No number has been inferred." : "এই রেকর্ডের সূত্রে কোনো প্রকাশ্য ফোন নম্বর নেই। অনুমান করে নম্বর যোগ করা হয়নি.")}</p>
            )}
            {record.contact_notes && <p className="muted">{record.contact_notes}</p>}
          </div>
        </aside>
      </div>
      {source && (
        <section className="content-panel source-panel">
          <h2>{english ? "Source and provenance" : "তথ্যসূত্র ও উৎসপরিচয়"}</h2>
          <p><strong>{source.title?.en || source.title || source.name}</strong></p>
          {source.url && <p><a href={source.url} target="_blank" rel="noreferrer noopener">{english ? "Open cited source ↗" : "উদ্ধৃত সূত্র খুলুন ↗"}</a></p>}
          {record.contact_sources.map((contactSource, index) => (
            <p key={`${contactSource.url}-${index}`}><a href={contactSource.url} target="_blank" rel="noreferrer noopener">{contactSource.source_name} ↗</a> <span className="muted">{contactSource.source_note}</span></p>
          ))}
          <p>
            <a href={reportUrl} target="_blank" rel="noreferrer noopener">
              {english ? "Report incorrect information" : "ভুল তথ্যের প্রতিবেদন করুন"} ↗
            </a>
            <span className="muted"> · {english ? "Opens a public GitHub issue; do not include private information." : "পাবলিক GitHub issue খুলবে; ব্যক্তিগত তথ্য দেবেন না।"}</span>
          </p>
        </section>
      )}
    </>
  );
}

function OverviewPage({ english }) {
  const { database } = useDatabase();
  const overview = database.overview;
  const system = database.education_system;
  const stages = system.stages_as_reported_in_research || [];
  usePageMeta(
    english ? "Qawmi Education System & Comparison | Qawmi Knowledge" : "কওমি শিক্ষাব্যবস্থা ও তুলনা | কওমি জ্ঞানভান্ডার",
    english
      ? "Explore Qawmi study stages, curriculum, verified equivalencies, comparisons with Alia and general education, and cited legal recognition."
      : "কওমি শিক্ষার ধাপ, পাঠ্যক্রম, যাচাইকৃত সমমান, আলিয়া ও সাধারণ শিক্ষার সঙ্গে তুলনা এবং আইনি স্বীকৃতি জানুন।",
  );
  return (
    <>
      <PageIntro english={english} eyebrow={english ? "LEARN & COMPARE" : "জানুন ও তুলনা করুন"} title={english ? "Qawmi education system & comparison" : "কওমি শিক্ষাব্যবস্থা ও তুলনা"} description={getLocalized(system.general_description, english)} />
      <div className="two-column">
        <section className="content-panel">
          <h2>{english ? "What is a Qawmi madrasa?" : "কওমি মাদরাসা কী?"}</h2>
          <p><LocalizedText value={overview.definition} english={english} /></p>
          <div className="callout">
            <strong>{english ? "A distinct stream" : "পৃথক শিক্ষাধারা"}</strong>
            <p><LocalizedText value={overview.distinction_from_alia} english={english} /></p>
          </div>
        </section>
        <section className="content-panel">
          <h2>{english ? "Common characteristics" : "সাধারণ বৈশিষ্ট্য"}</h2>
          <DataValue value={overview.core_characteristics} english={english} />
        </section>
      </div>
      <section className="content-panel block-section">
        <SectionHeading eyebrow={english ? "STAGES" : "শিক্ষার ধাপ"} title={english ? "Progression described in research" : "গবেষণায় বর্ণিত শিক্ষার অগ্রগতি"} description={english ? "Names and structures vary by board and institution. The stages below are reported, not a single nationally uniform syllabus." : "বোর্ড ও প্রতিষ্ঠানভেদে নাম ও কাঠামো ভিন্ন হতে পারে। নিচের ধাপগুলো গবেষণায় বর্ণিত—একটি অভিন্ন জাতীয় সিলেবাস নয়।"} />
        <div className="stage-list">
          {stages.map((stage, index) => (
            <article className="stage-card" key={`${stage.name}-${index}`}>
              <span className="stage-number">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h3>{getLocalized({ en: stage.name, bn: stage.bn }, english)}</h3>
                {stage.note && <p>{getLocalized(stage.note, english)}</p>}
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="content-panel block-section">
        <SectionHeading eyebrow={english ? "CURRICULUM" : "পাঠ্যক্ষেত্র"} title={english ? "Broad curriculum domains" : "পাঠ্যক্রমের প্রধান ক্ষেত্র"} description={getLocalized(system.curriculum_variation, english)} />
        <div className="domain-grid">
          {system.curriculum_domains.map((domain) => (
            <article className="domain-card" key={domain.id}>
              <h3>{getLocalized(domain.name, english)}</h3>
              <DataValue value={domain.topics} english={english} />
            </article>
          ))}
        </div>
      </section>
      <QualificationNote english={english} />
      <EducationComparisonSection english={english} />
    </>
  );
}

function QualificationNote({ english }) {
  const { database } = useDatabase();
  return (
    <section className="callout callout-warning block-section">
      <strong>{english ? "Qualifications and equivalencies need careful checking" : "সনদ ও সমমান যাচাই করে নিন"}</strong>
      <p>{getLocalized(database.career_and_further_study.qualification_caution, english)}</p>
    </section>
  );
}

function HistoryPage({ english }) {
  const { database, sources } = useDatabase();
  const history = database.history;
  const [searchParams, setSearchParams] = useSearchParams();
  const period = searchParams.get("period") || "";
  const periods = [...new Set(history.timeline.map((item) => `${String(item.date).slice(0, 3)}0`))].sort();
  const timeline = [...history.timeline]
    .filter((item) => !period || String(item.date).startsWith(period.slice(0, 3)))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  usePageMeta(english ? "History & Governance | Qawmi Knowledge" : "ইতিহাস ও পরিচালনা | কওমি জ্ঞানভান্ডার", english ? "A cited overview of Qawmi education history, boards and legal recognition in Bangladesh." : "বাংলাদেশের কওমি শিক্ষার ইতিহাস, বোর্ড ও আইনি স্বীকৃতির তথ্যসূত্রভিত্তিক পরিচিতি।");
  return (
    <>
      <PageIntro english={english} eyebrow={english ? "CONTEXT" : "প্রেক্ষাপট"} title={english ? "History, boards & recognition" : "ইতিহাস, বোর্ড ও স্বীকৃতি"} description={getLocalized(history.regional_background, english)} />
      <section className="content-panel">
        <SectionHeading
          eyebrow={english ? "TIMELINE" : "সময়রেখা"}
          title={english ? "Selected milestones" : "নির্বাচিত গুরুত্বপূর্ণ ঘটনা"}
          description={getLocalized(history.historical_caution, english)}
          action={
            <label className="period-filter">
              {english ? "Filter by period" : "সময় অনুযায়ী"}
              <select value={period} onChange={(event) => setSearchParams((current) => { const next = new URLSearchParams(current); if (event.target.value) next.set("period", event.target.value); else next.delete("period"); return next; }, { replace: true })}>
                <option value="">{english ? "All periods" : "সব সময়"}</option>
                {periods.map((decade) => <option value={decade} key={decade}>{decade}s</option>)}
              </select>
            </label>
          }
        />
        <div className="timeline">
          {timeline.map((item, index) => {
            const event = getLocalized(item.event || item.event_bn, english);
            return (
              <article className="timeline-item" key={`${item.date}-${index}`}>
                <time>{item.date}</time>
                <div>
                  <p>{event}</p>
                  <small>{item.evidence_type || item.verification_status || (english ? "Source noted" : "তথ্যসূত্র নোট করা হয়েছে")}</small>
                  <div className="source-chips">{(item.source_ids || []).map((id) => {
                    const citedSource = sources.get(id);
                    return citedSource?.url
                      ? <a className="source-chip" href={citedSource.url} target="_blank" rel="noreferrer noopener" key={id}>{id} ↗</a>
                      : <span className="source-chip" key={id}>{id}</span>;
                  })}</div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
      <section className="block-section">
        <SectionHeading eyebrow={english ? "BOARDS" : "বোর্ড"} title={english ? "Boards and governance" : "বোর্ড ও পরিচালনা"} description={english ? "Boards are independent organizations; names and roles are shown as described in the cited records." : "বোর্ডগুলো স্বতন্ত্র সংগঠন; নাম ও ভূমিকা সংশ্লিষ্ট তথ্যসূত্রের বর্ণনা অনুযায়ী দেখানো হয়েছে।"} />
        <div className="board-grid">
          {database.boards_and_governance.filter((board) => board.record_type !== "historical_board_landscape").map((board) => (
            <article className="content-panel board-card" key={board.id}>
              <span className="eyebrow">{board.short_name || board.id}</span>
              <h3>{getLocalized(board.name, english) || board.id}</h3>
              <p>{getLocalized(board.description, english)}</p>
              {board.legal_role && <p className="muted">{board.legal_role}</p>}
              {board.official_website && <a className="text-link" href={board.official_website} target="_blank" rel="noreferrer noopener">{english ? "Website listed in source" : "সূত্রে উল্লিখিত ওয়েবসাইট"} ↗</a>}
              <small className="status-caption">{board.verification_status}</small>
            </article>
          ))}
        </div>
      </section>
      {database.boards_and_governance.filter((board) => board.record_type === "historical_board_landscape").map((board) => (
        <section className="content-panel block-section historical-board-section" key={board.id}>
          <SectionHeading
            eyebrow={english ? `HISTORICAL SNAPSHOT · ${board.as_of_date}` : `ঐতিহাসিক তথ্যচিত্র · ${board.as_of_date}`}
            title={english ? "Regional Qawmi board landscape in 2013" : "২০১৩ সালের আঞ্চলিক কওমি বোর্ডচিত্র"}
            description={english
              ? "A dated snapshot from a 2013 newspaper report, not a current register of boards or affiliated madrasas."
              : "২০১৩ সালের সংবাদ-নিবন্ধে প্রকাশিত তৎকালীন চিত্র—বর্তমান বোর্ড বা অধিভুক্ত মাদরাসার তালিকা নয়।"}
          />
          <div className="callout callout-warning">
            {english
              ? "The article gives approximate counts for only two organizations. These are historical source-reported estimates, not a national census; do not add them together or compare them with current counts."
              : "নিবন্ধে কেবল দুটি সংগঠনের আনুমানিক সংখ্যা দেওয়া হয়েছে। এগুলো ঐতিহাসিক সূত্রে-উল্লিখিত অনুমান, জাতীয় জরিপ নয়; সংখ্যা যোগ করে মোট বা বর্তমান হিসাব হিসেবে দেখবেন না।"}
          </div>
          <div className="historical-board-grid">
            {board.boards.map((historicalBoard) => (
              <article className="historical-board-card" key={historicalBoard.name_en}>
                <h3>{english ? historicalBoard.name_en : historicalBoard.name_bn}</h3>
                {historicalBoard.base_bn && (
                  <p>
                    <strong>{english ? "Based at" : "কেন্দ্র"}</strong>
                    <span>{historicalBoard.base_bn}</span>
                  </p>
                )}
                <p>
                  <strong>{english ? "Reported area" : "প্রতিবেদনে উল্লিখিত এলাকা"}</strong>
                  <span>{historicalBoard.coverage_bn}</span>
                </p>
                {Number.isFinite(historicalBoard.reported_madrasa_count) && (
                  <div className="historical-board-count">
                    <strong>≈{historicalBoard.reported_madrasa_count.toLocaleString(english ? "en" : "bn-BD")}</strong>
                    <span>{english ? "madrasas (approx. in source)" : "মাদরাসা (সূত্রে আনুমানিক)"}</span>
                  </div>
                )}
              </article>
            ))}
          </div>
          {sources.get(board.source_id)?.url && (
            <p className="historical-board-source">
              {english ? "Source:" : "তথ্যসূত্র:"} {sources.get(board.source_id).publisher} ·{" "}
              <a href={sources.get(board.source_id).url} target="_blank" rel="noreferrer noopener">
                {english ? "Read the 2013 report" : "২০১৩ সালের প্রতিবেদন পড়ুন"} ↗
              </a>
            </p>
          )}
        </section>
      ))}
      <section className="content-panel block-section">
        <h2>{english ? "Legal recognition" : "আইনি স্বীকৃতি"}</h2>
        {database.law_and_recognition.map((law) => (
          <article key={law.id}>
            <h3>{getLocalized(law.title, english)}</h3>
            <p>{getLocalized(law.key_effect, english)}</p>
            <p className="muted">{law.scope_note}</p>
            <p>{english ? "Enacted" : "প্রণীত"}: {law.date_enacted} · {english ? "Act" : "আইন"} {law.act_number}</p>
            <div className="source-chips">{(law.primary_source_ids || []).map((id) => <span className="source-chip" key={id}>{id}</span>)}</div>
          </article>
        ))}
      </section>
    </>
  );
}

function SyllabusPage({ english }) {
  const { database } = useDatabase();
  usePageMeta(english ? "Syllabi & Study Resources | Qawmi Knowledge" : "সিলেবাস ও পাঠ্য-রিসোর্স | কওমি জ্ঞানভান্ডার", english ? "Browse Qawmi Darsiyat examination syllabus by stage, subject, kitab and assigned portion." : "দরসিয়াতের কেন্দ্রীয় পরীক্ষার সিলেবাস স্তর, বিষয়, কিতাব ও নির্ধারিত পরিমাণ অনুযায়ী দেখুন।");
  return (
    <>
      <PageIntro
        english={english}
        eyebrow={english ? "STUDY" : "পাঠ্যক্রম"}
        title={english ? "Syllabi & study resources" : "সিলেবাস ও পাঠ্য-রিসোর্স"}
        description={english ? "Browse the supplied Darsiyat examination syllabus as searchable page content, alongside selected specialist syllabus records. These are not a complete, universal curriculum." : "সরবরাহকৃত দরসিয়াত পরীক্ষার নেসাব এখন ওয়েবপেজের পাঠযোগ্য তথ্য হিসেবে দেখুন। পাশাপাশি বিশেষায়িত সিলেবাসও রয়েছে; এগুলো পূর্ণাঙ্গ বা সর্বজনীন পাঠ্যক্রম নয়।"}
      />
      <div className="callout callout-warning">
        {english ? "Always check the issuing madrasa or board for the current syllabus. Verification labels and source notes are shown with each record." : "বর্তমান সিলেবাস সংশ্লিষ্ট মাদরাসা বা বোর্ড থেকে যাচাই করুন। প্রতিটি রেকর্ডের সঙ্গে যাচাইয়ের অবস্থা ও তথ্যসূত্রের নোট রয়েছে।"}
      </div>
      <section className="block-section">
        <SectionHeading
          eyebrow={english ? "CENTRAL EXAMINATION · DARSIYAT" : "কেন্দ্রীয় পরীক্ষা · দরসিয়াত"}
          title={english ? darsiyatFemaleSyllabus.title_en : darsiyatFemaleSyllabus.title_bn}
          description={english ? darsiyatFemaleSyllabus.source_note_en : darsiyatFemaleSyllabus.source_note_bn}
        />
        <div className="syllabus-stage-list">
          {darsiyatFemaleSyllabus.stages.map((stage) => (
            <section className="syllabus-stage-card" key={stage.id}>
              <h2>{english ? stage.name_en : stage.name_bn}</h2>
              <div className="table-scroll">
                <table className="syllabus-data-table">
                  <thead>
                    <tr>
                      <th scope="col">{english ? "Subject" : "বিষয়"}</th>
                      <th scope="col">{english ? "Book (kitab)" : "কিতাব"}</th>
                      <th scope="col">{english ? "Assigned portion" : "পরিমাণ"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stage.subjects.flatMap((subject) => subject.books.map((book, index) => (
                      <tr key={`${subject.name_bn}-${book.name_bn}-${index}`}>
                        {index === 0 && <th scope="row" rowSpan={subject.books.length}>{subject.name_bn}</th>}
                        <td>{book.name_bn}</td>
                        <td>{book.portion_bn}</td>
                      </tr>
                    )))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      </section>
      <div className="syllabus-list">
        {database.specialized_syllabi.map((syllabus) => (
          <details className="syllabus-card" key={syllabus.id}>
            <summary>
              <span className="eyebrow">{syllabus.category || syllabus.id}</span>
              <h2>{getLocalized(syllabus.title, english) || syllabus.title}</h2>
              <span className="syllabus-audience">{getLocalized(syllabus.audience, english)}</span>
            </summary>
            <div className="syllabus-content">
              {syllabus.id === "syllabus_tahfizul_quran_students" ? (
                <TahfizSyllabusDetails syllabus={syllabus} english={english} />
              ) : syllabus.id === "syllabus_ilm_ut_tajwid_wal_qiraat" ? (
                <AdvancedTajwidSyllabus syllabus={syllabus} english={english} />
              ) : (
                <DataValue value={Object.fromEntries(Object.entries(syllabus).filter(([key]) => !["id", "title", "source_ids"].includes(key)))} english={english} />
              )}
              <div className="source-chips">{(syllabus.source_ids || []).map((id) => <span className="source-chip" key={id}>{id}</span>)}</div>
            </div>
          </details>
        ))}
      </div>
    </>
  );
}

function TahfizSyllabusDetails({ syllabus, english }) {
  const exam = syllabus.exam;
  const subjectNames = new Map(syllabus.subjects.map((subject) => [
    subject.id,
    english ? subject.name_en || subject.name_bn : subject.name_bn,
  ]));
  const label = (bn, en) => english ? en : bn;

  return (
    <>
      <p className="muted">{english ? "Four curriculum subjects; the listed oral examination assesses three subjects." : "পাঠ্যবিষয় চারটি; বর্ণিত মৌখিক পরীক্ষায় পরীক্ষ্য বিষয় তিনটি।"}</p>
      <div className="syllabus-subject-list">
        {syllabus.subjects.map((subject) => (
          <section className="syllabus-subject-card" key={subject.id}>
            <h3>{english ? subject.name_en || subject.name_bn : subject.name_bn}</h3>
            <p>{subject.content_bn}</p>
            {subject.subtopics && (
              <ul>
                {subject.subtopics.map((subtopic) => (
                  <li key={subtopic.name_bn}><strong>{subtopic.name_bn}:</strong> {subtopic.method_bn}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
      <section className="block-section">
        <h3>{label("মৌখিক পরীক্ষা", "Oral examination")}</h3>
        <p>{label("পরীক্ষ্য বিষয়", "Examined subjects")}: {exam.examined_subject_count.toLocaleString(english ? "en" : "bn-BD")} · {label("মোট নম্বর", "Total marks")}: {exam.total_marks.toLocaleString(english ? "en" : "bn-BD")}</p>
        <div className="table-scroll">
          <table className="syllabus-exam-table">
            <thead>
              <tr>
                <th>{label("বিষয়", "Subject")}</th>
                <th>{label("প্রশ্ন", "Questions")}</th>
                <th>{label("উত্তর দিতে হবে", "Answers required")}</th>
                <th>{label("নম্বর", "Marks")}</th>
                <th>{label("পাস নম্বর", "Pass marks")}</th>
              </tr>
            </thead>
            <tbody>
              {exam.components.map((component) => (
                <tr key={component.subject_id}>
                  <th>{subjectNames.get(component.subject_id)}</th>
                  <td>{component.questions.toLocaleString(english ? "en" : "bn-BD")}</td>
                  <td>{component.answers_required?.toLocaleString(english ? "en" : "bn-BD") || EMPTY}</td>
                  <td>{component.marks.toLocaleString(english ? "en" : "bn-BD")}</td>
                  <td>{component.pass_marks.toLocaleString(english ? "en" : "bn-BD")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="block-section">
        <h3>{label("বিভাগ ও তিলাওয়াত (ইয়াদ) নম্বর", "Division and tilawat (memorized recitation) marks")}</h3>
        <div className="table-scroll">
          <table className="syllabus-exam-table">
            <thead>
              <tr>
                <th>{label("বিভাগ", "Division")}</th>
                <th>{label("তিলাওয়াত (ইয়াদ)", "Tilawat (memorized)")}</th>
                <th>{label("মোট নম্বর", "Total marks")}</th>
              </tr>
            </thead>
            <tbody>
              {exam.division_and_tilawat_yad.map((result) => (
                <tr key={result.division_bn}>
                  <th>{result.division_bn}</th>
                  <td>{result.tilawat_yad_marks.toLocaleString(english ? "en" : "bn-BD")}</td>
                  <td>{result.total_marks.toLocaleString(english ? "en" : "bn-BD")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function AdvancedTajwidSyllabus({ syllabus, english }) {
  const formatNumber = (value) => value.toLocaleString(english ? "en" : "bn-BD");
  return (
    <>
      <dl className="record-details">
        <div>
          <dt>{english ? "Riwayah" : "রেওয়ায়েত"}</dt>
          <dd>{syllabus.recitation_riwayah_bn}</dd>
        </div>
        <div>
          <dt>{english ? "Eligibility · male students" : "ভর্তির যোগ্যতা · ছাত্র"}</dt>
          <dd>{syllabus.admission_eligibility.students_bn}</dd>
        </div>
        <div>
          <dt>{english ? "Eligibility · female students" : "ভর্তির যোগ্যতা · ছাত্রী"}</dt>
          <dd>{syllabus.admission_eligibility.female_students_bn}</dd>
        </div>
        <div>
          <dt>{english ? "Duration" : "মেয়াদ"}</dt>
          <dd>{formatNumber(syllabus.duration_years)} {english ? "years" : "বছর"}</dd>
        </div>
        <div>
          <dt>{english ? "Class period" : "প্রতি ঘণ্টার দৈর্ঘ্য"}</dt>
          <dd>{formatNumber(syllabus.class_period_minutes)} {english ? "minutes" : "মিনিট"}</dd>
        </div>
      </dl>
      {syllabus.years.map((year) => (
        <section className="syllabus-year-card" key={year.year}>
          <h3>{english ? `Year ${formatNumber(year.year)}` : `${formatNumber(year.year)}${year.year === 1 ? "ম" : "য়"} বর্ষ`}</h3>
          {year.subjects.map((subject, index) => {
            const subjectName = subject.name_bn
              || (english ? "Subject name unclear in supplied text" : "সরবরাহকৃত পাঠে বিষয়-শিরোনাম অস্পষ্ট");
            return (
              <article className="syllabus-year-subject" key={`${subjectName}-${index}`}>
                <strong>{subjectName}</strong>
                {subject.content_bn && <p>{subject.content_bn}</p>}
                {subject.text_bn && <p>{subject.text_bn}</p>}
                <p>
                  {english ? "Exam marks" : "পরীক্ষার নম্বর"}: {formatNumber(subject.exam_marks)}
                  {subject.daily_hours && ` · ${english ? "Daily" : "প্রতিদিন"} ${formatNumber(subject.daily_hours)} ${english ? "hour" : "ঘণ্টা"}`}
                  {subject.weekly_hours && ` · ${english ? "Weekly" : "সপ্তাহে"} ${formatNumber(subject.weekly_hours)} ${english ? "hours" : "ঘণ্টা"}`}
                </p>
                {subject.mark_breakdown && (
                  <p>{Object.entries(subject.mark_breakdown).map(([name, marks]) => `${name} ${formatNumber(marks)}`).join(" · ")}</p>
                )}
              </article>
            );
          })}
        </section>
      ))}
      <div className="callout callout-warning">
        {english
          ? "Some words in the supplied text are unclear. Subject names and the first-year Tajwid book title have not been guessed. The text also says one hour per day and that each class hour is 90 minutes; both statements are preserved."
          : "সরবরাহকৃত পাঠের কিছু শব্দ অস্পষ্ট। বিষয়-শিরোনাম ও প্রথম বর্ষের তাজবীদের একটি বইয়ের নাম অনুমান করে পূরণ করা হয়নি। পাঠে প্রতিদিন ১ ঘণ্টা এবং প্রতি ঘণ্টা ৯০ মিনিট—দুই বক্তব্যই রাখা হয়েছে।"}
      </div>
      <p className="table-footnote">{syllabus.attendance_condition_bn}</p>
    </>
  );
}

function BarChart({ title, description, rows, english }) {
  const maximum = Math.max(1, ...rows.map((row) => row.value));
  return (
    <section className="chart-card" aria-label={title}>
      <h3>{title}</h3>
      {description && <p className="muted">{description}</p>}
      <div className="bar-list">
        {rows.map((row) => (
          <div className="bar-row" key={row.label}>
            <span className="bar-label">{row.label}</span>
            <span className="bar-track"><span className="bar-fill" style={{ width: `${(row.value / maximum) * 100}%` }} /></span>
            <strong>{row.value.toLocaleString(english ? "en" : "bn-BD")}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function StatisticsPage({ english }) {
  const { database, records } = useDatabase();
  const counts = records.reduce((values, record) => {
    values[record.gender] = (values[record.gender] || 0) + 1;
    return values;
  }, {});
  const phoneRecords = records.filter((record) => record.contact_numbers.length > 0).length;
  const affiliationCounts = records.reduce((values, record) => {
    const key = record.affiliation_code || (english ? "Not stated" : "উল্লেখ নেই");
    values[key] = (values[key] || 0) + 1;
    return values;
  }, {});
  const topAffiliations = Object.entries(affiliationCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([label, value]) => ({ label, value }));
  const contactCounts = records.reduce((values, record) => {
    const key = humanize(record.contact_research_status || "not stated");
    values[key] = (values[key] || 0) + 1;
    return values;
  }, {});
  usePageMeta(english ? "Directory Data & Statistics | Qawmi Knowledge" : "ডিরেক্টরি ডেটা ও পরিসংখ্যান | কওমি জ্ঞানভান্ডার", english ? "Understand the supplied directory coverage, data quality and published Qawmi madrasa estimates." : "সরবরাহকৃত ডিরেক্টরির পরিসর, ডেটার মান ও প্রকাশিত কওমি মাদরাসার হিসাব বুঝুন।");
  return (
    <>
      <PageIntro english={english} eyebrow={english ? "DATA" : "ডেটা"} title={english ? "What the data says—and does not say" : "ডেটা কী বলে—এবং কী বলে না"} description={getLocalized(database.statistics.note, english)} />
      <section className="metrics-grid">
        <Metric value={records.length} label={english ? "imported source records" : "আমদানি করা সূত্রের রেকর্ড"} detail={`${english ? "Database v" : "তথ্যভান্ডার v"}${database.metadata.version}`} />
        <Metric value={counts.men || 0} label={english ? "marked men" : "পুরুষ হিসেবে চিহ্নিত"} detail={english ? "Gender stated in source" : "সূত্রে ধরন উল্লেখ আছে"} />
        <Metric value={counts.women || 0} label={english ? "marked women" : "মহিলা হিসেবে চিহ্নিত"} detail={english ? "Gender stated in source" : "সূত্রে ধরন উল্লেখ আছে"} />
        <Metric value={counts.unspecified || 0} label={english ? "gender unspecified" : "ধরন উল্লেখ নেই"} detail={english ? "Not inferred" : "অনুমান করা হয়নি"} />
        <Metric value={phoneRecords} label={english ? "records with a number" : "ফোন নম্বরসহ রেকর্ড"} detail={english ? "Some listings may be historical" : "কিছু নম্বর পুরোনো হতে পারে"} />
      </section>
      <section className="block-section">
        <SectionHeading
          eyebrow={english ? "DIRECTORY SNAPSHOT" : "ডিরেক্টরি সারসংক্ষেপ"}
          title={english ? "Counts within this source file" : "এই তথ্যসূত্রে রেকর্ডের সংখ্যা"}
          description={english ? `Based on ${records.length.toLocaleString("en")} imported records · database v${database.metadata.version}. These are directory-record counts, not national estimates.` : `${records.length.toLocaleString("bn-BD")}টি আমদানি করা রেকর্ডের ভিত্তিতে · তথ্যভান্ডার v${database.metadata.version}। এগুলো ডিরেক্টরির রেকর্ড, জাতীয় হিসাব নয়।`}
        />
        <div className="chart-grid">
          <BarChart
            english={english}
            title={english ? "Gender labels in the source" : "সূত্রে উল্লেখিত ধরন"}
            description={english ? "Unspecified values remain unclassified." : "অনুল্লিখিত তথ্যকে শ্রেণিবদ্ধ করা হয়নি।"}
            rows={[
              { label: english ? "Men" : "পুরুষ", value: counts.men || 0 },
              { label: english ? "Women" : "মহিলা", value: counts.women || 0 },
              { label: english ? "Not specified" : "উল্লেখ নেই", value: counts.unspecified || 0 },
            ]}
          />
          <BarChart
            english={english}
            title={english ? "Contact research status" : "যোগাযোগ-তথ্যের গবেষণা অবস্থা"}
            description={english ? "A status count for each madrasa record, as recorded in the source." : "তথ্যসূত্রে থাকা প্রতিটি মাদরাসা রেকর্ডের যোগাযোগ-সংক্রান্ত অবস্থা।"}
            rows={Object.entries(contactCounts).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }))}
          />
          <BarChart
            english={english}
            title={english ? "Most common affiliation codes" : "বেশি থাকা অধিভুক্তি কোড"}
            description={english ? "Top 10 exact source values; no category was inferred." : "সূত্রে থাকা সঠিক শীর্ষ ১০টি মান; কোনো শ্রেণি অনুমান করা হয়নি।"}
            rows={topAffiliations}
          />
        </div>
      </section>
      <section className="content-panel block-section">
        <SectionHeading eyebrow={english ? "PUBLISHED ESTIMATES" : "প্রকাশিত হিসাব"} title={english ? "Different studies, different scopes" : "গবেষণাভেদে হিসাবের পরিসর আলাদা"} description={getLocalized(database.statistics.interpretation, english)} />
        <div className="estimates-list">
          {database.statistics.estimates.map((estimate, index) => {
            const numbers = Object.entries(estimate).filter(([key, value]) => typeof value === "number" && key !== "year");
            return (
              <article className="estimate-card" key={`${estimate.year}-${index}`}>
                <div className="estimate-heading"><span className="eyebrow">{estimate.year || (english ? "Year not stated" : "বছর উল্লেখ নেই")}</span><strong>{estimate.evidence_type}</strong></div>
                <div className="estimate-values">
                  {numbers.map(([key, value]) => (
                    <div className="estimate-value" key={key}><b>{Number(value).toLocaleString(english ? "en" : "bn-BD")}</b><span>{humanize(key)}</span></div>
                  ))}
                </div>
                {estimate.limitations && <p className="muted">{estimate.limitations}</p>}
                <div className="source-chips">{(estimate.source_ids || []).map((id) => <span className="source-chip" key={id}>{id}</span>)}</div>
              </article>
            );
          })}
        </div>
      </section>
      <section className="content-panel block-section">
        <h2>{english ? "Directory quality and coverage" : "ডিরেক্টরির মান ও পরিসর"}</h2>
        <DataValue value={database.data_quality.known_gaps} english={english} />
        <DataValue value={database.madrasa_directory.quality_notes} english={english} />
      </section>
    </>
  );
}

function ResourcesPage({ english }) {
  const { database, sources } = useDatabase();
  usePageMeta(english ? "Sources & Data Notes | Qawmi Knowledge" : "তথ্যসূত্র ও ডেটা নোট | কওমি জ্ঞানভান্ডার", english ? "Browse the cited sources, datasets and limitations behind the Qawmi education knowledge base." : "কওমি শিক্ষার তথ্যভান্ডারের তথ্যসূত্র, ডেটাসেট ও সীমাবদ্ধতা দেখুন।");
  return (
    <>
      <PageIntro english={english} eyebrow={english ? "TRANSPARENCY" : "স্বচ্ছতা"} title={english ? "Sources & data notes" : "তথ্যসূত্র ও ডেটা নোট"} description={english ? "Every historical claim, estimate and directory record has limits. Use the source references below to verify context." : "ইতিহাস, অনুমান ও ডিরেক্টরির প্রতিটি রেকর্ডের সীমাবদ্ধতা আছে। প্রেক্ষাপট যাচাইয়ে নিচের সূত্রগুলো দেখুন।"} />
      <section className="content-panel">
        <SectionHeading eyebrow={english ? "REFERENCES" : "তথ্যসূত্র"} title={`${database.sources.length} ${english ? "cited sources" : "টি উদ্ধৃত সূত্র"}`} />
        <div className="source-list">
          {database.sources.map((source) => (
            <article className="source-row" key={source.id}>
              <span className="source-id">{source.id}</span>
              <div>
                <h3>{getLocalized(source.title, english) || source.name || source.id}</h3>
                {source.publisher && <p>{source.publisher}</p>}
                {source.publication_date && <small>{source.publication_date}</small>}
                {source.description && <p className="muted"><LocalizedText value={source.description} english={english} /></p>}
              </div>
              <div className="source-actions">
                {source.url && <a href={source.url} target="_blank" rel="noreferrer noopener">{english ? "Open ↗" : "খুলুন ↗"}</a>}
                {source.accessed_on && <small>{english ? "Checked" : "যাচাই"}: {source.accessed_on}</small>}
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="content-panel block-section">
        <h2>{english ? "Datasets included" : "অন্তর্ভুক্ত ডেটাসেট"}</h2>
        <DataValue value={database.datasets} english={english} />
      </section>
      <section className="content-panel block-section">
        <h2>{english ? "Directory methodology" : "ডিরেক্টরি তৈরির পদ্ধতি"}</h2>
        <p>{database.madrasa_directory.source_description}</p>
        <DataValue value={database.madrasa_directory.field_notes} english={english} />
        <DataValue value={database.madrasa_directory.quality_notes} english={english} />
        <div className="callout callout-warning">
          <strong>{english ? "Contact-number status" : "ফোন নম্বরের অবস্থা"}</strong>
          <p>{getLocalized(database.contact_enrichment.important_note, english) || database.contact_enrichment.important_note}</p>
          <p>{english
            ? `${database.contact_enrichment.records_with_publicly_listed_numbers} records have publicly listed numbers; one is historical and one is not call-verified.`
            : `${database.contact_enrichment.records_with_publicly_listed_numbers}টি রেকর্ডে প্রকাশ্য সূত্রে ফোন নম্বর আছে; একটি পুরোনো এবং একটি ফোনে যাচাই করা হয়নি।`}</p>
        </div>
      </section>
      <section className="content-panel block-section">
        <h2>{english ? "Research notes" : "গবেষণা-সংক্রান্ত লেখা"}</h2>
        {database.research_articles_and_commentary.map((article) => (
          <details className="article-record" key={article.id}>
            <summary>{getLocalized(article.title, english) || article.title}</summary>
            <p>{article.author && <strong>{article.author} · </strong>}{article.content_type} · {article.content_language}</p>
            {article.full_text_bn && <><p className="muted">{english ? "Original text (Bangla)" : "মূল লেখা (বাংলা)"}</p><p lang="bn">{article.full_text_bn}</p></>}
            {article.url && <p><a href={article.url} target="_blank" rel="noreferrer noopener">{english ? "Read original source ↗" : "মূল সূত্র পড়ুন ↗"}</a></p>}
          </details>
        ))}
      </section>
    </>
  );
}

function ResultsPage({ english }) {
  const { database } = useDatabase();
  const boards = database.boards_and_governance.filter((board) => board.official_website);
  usePageMeta(english ? "Examinations & Official Results | Qawmi Knowledge" : "পরীক্ষা ও অফিসিয়াল ফলাফল | কওমি জ্ঞানভান্ডার", english ? "Find board-listed official websites for exam and result information. Always verify current notices with the issuing board." : "পরীক্ষা ও ফলাফলের তথ্যের জন্য বোর্ডের তালিকাভুক্ত অফিসিয়াল ওয়েবসাইট দেখুন। সর্বশেষ বিজ্ঞপ্তি সংশ্লিষ্ট বোর্ডে যাচাই করুন।");
  return (
    <>
      <PageIntro english={english} eyebrow={english ? "EXAMINATIONS" : "পরীক্ষা"} title={english ? "Examinations & results" : "পরীক্ষা ও ফলাফল"} description={english ? "This knowledge base does not contain a current results feed. Use the official channels cited in the source records and confirm that notices are current." : "এই তথ্যভান্ডারে সরাসরি হালনাগাদ ফলাফল নেই। সূত্রে উল্লিখিত অফিসিয়াল চ্যানেল দেখুন এবং বিজ্ঞপ্তির তারিখ যাচাই করুন।"} />
      <div className="board-grid">
        {boards.map((board) => (
          <article className="content-panel board-card" key={board.id}>
            <span className="eyebrow">{board.short_name || board.id}</span>
            <h2>{getLocalized(board.name, english)}</h2>
            <p>{getLocalized(board.description, english)}</p>
            <a className="btn btn-secondary" href={board.official_website} target="_blank" rel="noreferrer noopener">{english ? "Visit board website" : "বোর্ডের ওয়েবসাইটে যান"} ↗</a>
            <small className="status-caption">{english ? "Website address is listed in the supplied database; current result pages are not verified." : "ওয়েব ঠিকানাটি সরবরাহকৃত তথ্যভান্ডারে আছে; বর্তমান ফলাফলের পেজ যাচাই করা হয়নি।"}</small>
          </article>
        ))}
      </div>
      <div className="callout callout-warning block-section">{english ? "Never submit personal details or payments through a link unless you have independently confirmed it is an official board service." : "অফিসিয়াল বোর্ডের সেবা নিশ্চিত না করে কোনো লিংকে ব্যক্তিগত তথ্য বা অর্থ দেবেন না।"}</div>
    </>
  );
}

function CareersPage({ english }) {
  const { database } = useDatabase();
  usePageMeta(english ? "Further Study & Career Pathways | Qawmi Knowledge" : "উচ্চশিক্ষা ও পেশাগত পথ | কওমি জ্ঞানভান্ডার", english ? "Read about further study and career pathways described in Qawmi education research, with qualification cautions." : "কওমি শিক্ষার গবেষণায় উল্লিখিত উচ্চশিক্ষা ও পেশাগত পথ এবং যোগ্যতা-সংক্রান্ত সতর্কতা পড়ুন।");
  return (
    <>
      <PageIntro english={english} eyebrow={english ? "NEXT STEPS" : "পরবর্তী ধাপ"} title={english ? "Further study & career pathways" : "উচ্চশিক্ষা ও পেশাগত পথ"} description={english ? "Pathways vary by qualification, institution and employer. This is a general research summary, not an eligibility decision." : "সনদ, প্রতিষ্ঠান ও নিয়োগদাতাভেদে সুযোগ ভিন্ন হয়। এটি সাধারণ গবেষণার সারাংশ—যোগ্যতার সিদ্ধান্ত নয়।"} />
      <section className="content-panel">
        <DataValue value={database.career_and_further_study.common_pathways} english={english} />
      </section>
      <QualificationNote english={english} />
    </>
  );
}

function AboutPage({ english }) {
  const { database } = useDatabase();
  usePageMeta(english ? "About Qawmi Knowledge" : "কওমি জ্ঞানভান্ডার সম্পর্কে", english ? "About the independent Qawmi education knowledge platform and the source database it uses." : "স্বতন্ত্র কওমি শিক্ষা জ্ঞানভান্ডার ও ব্যবহৃত তথ্যসূত্র সম্পর্কে জানুন।");
  return (
    <>
      <PageIntro english={english} eyebrow={english ? "ABOUT THIS PROJECT" : "প্রকল্প পরিচিতি"} title={english ? "Knowledge with its sources attached" : "তথ্যসূত্রসহ জ্ঞান"} description={english ? "This independent project brings a searchable institution directory together with educational context, research references and explicit data-quality notes." : "এই স্বতন্ত্র প্রকল্পে অনুসন্ধানযোগ্য প্রতিষ্ঠান তালিকার সঙ্গে শিক্ষামূলক প্রেক্ষাপট, গবেষণার সূত্র ও ডেটার মান-সংক্রান্ত নোট যুক্ত করা হয়েছে।"} />
      <section className="content-panel">
        <h2>{english ? "About the source database" : "তথ্যভান্ডার সম্পর্কে"}</h2>
        <p><LocalizedText value={database.metadata.description} english={english} /></p>
        <DataValue value={database.metadata.scope} english={english} />
        <p>{english ? "Version" : "সংস্করণ"} {database.metadata.version} · {english ? "Updated" : "হালনাগাদ"} {database.metadata.updated_at}</p>
        <p>{english ? "The directory records are not a current census and should not be treated as independently verified." : "ডিরেক্টরির তথ্য বর্তমান জাতীয় জরিপ নয় এবং স্বাধীনভাবে যাচাইকৃত হিসেবে গণ্য করা উচিত নয়।"}</p>
      </section>
      <section className="content-panel block-section">
        <h2>{english ? "Editorial principles" : "সম্পাদনার নীতি"}</h2>
        <ul className="content-list">
          <li>{english ? "Do not infer missing phone numbers, gender, stage, district or verification status." : "অনুপস্থিত ফোন নম্বর, ধরন, স্তর, জেলা বা যাচাইয়ের অবস্থা অনুমান করে যোগ করা হয় না।"}</li>
          <li>{english ? "Preserve the wording and provenance of source-transcribed records." : "তথ্যসূত্র থেকে সংকলিত রেকর্ডের ভাষা ও উৎসপরিচয় অক্ষুণ্ণ রাখা হয়।"}</li>
          <li>{english ? "Distinguish historical estimates from current institution counts." : "ঐতিহাসিক অনুমানকে বর্তমান প্রতিষ্ঠানের সংখ্যা থেকে পৃথক রাখা হয়।"}</li>
          <li>{english ? "A static website cannot securely accept edits or administer accounts; no browser-only admin mode is provided." : "স্ট্যাটিক ওয়েবসাইটে নিরাপদে সম্পাদনা বা অ্যাকাউন্ট পরিচালনা করা যায় না; ব্রাউজারভিত্তিক অ্যাডমিন সুবিধা নেই।"}</li>
        </ul>
      </section>
    </>
  );
}

function NotFound({ english }) {
  usePageMeta(english ? "Page not found | Qawmi Knowledge" : "পৃষ্ঠা পাওয়া যায়নি | কওমি জ্ঞানভান্ডার", english ? "The requested knowledge-base page could not be found." : "অনুরোধ করা পৃষ্ঠাটি পাওয়া যায়নি।", "noindex, follow");
  return (
    <section className="not-found">
      <span className="eyebrow">404</span>
      <h1>{english ? "This page is not in the directory." : "এই পৃষ্ঠাটি খুঁজে পাওয়া যায়নি।"}</h1>
      <p className="lead">{english ? "The link may be outdated, or the record may not be included in this version of the source database." : "লিংকটি পুরোনো হতে পারে অথবা এই সংস্করণের তথ্যভান্ডারে রেকর্ডটি নাও থাকতে পারে।"}</p>
      <Link className="btn btn-primary" to={`${pagePrefix(english)}/`}>{english ? "Return home" : "হোমে ফিরুন"}</Link>
    </section>
  );
}

function RoutePage({ english, path }) {
  if (path === "/" || path === "") return <HomePage english={english} />;
  if (path === "/madrasas" || path === "/directory") return <DirectoryPage english={english} />;
  if (path.startsWith("/madrasa/")) return <MadrasaPage english={english} id={decodeURIComponent(path.slice("/madrasa/".length).replace(/\/+$/, ""))} />;
  if (path === "/education" || path === "/about/education") return <OverviewPage english={english} />;
  if (path === "/compare") return <Navigate to={`${pagePrefix(english)}/education`} replace />;
  if (path === "/history" || path === "/boards") return <HistoryPage english={english} />;
  if (path === "/syllabus" || path === "/curriculum") return <SyllabusPage english={english} />;
  if (path === "/statistics" || path === "/data") return <StatisticsPage english={english} />;
  if (path === "/resources" || path === "/sources") return <ResourcesPage english={english} />;
  if (path === "/results" || path === "/examinations") return <ResultsPage english={english} />;
  if (path === "/careers") return <CareersPage english={english} />;
  if (path === "/about") return <AboutPage english={english} />;
  return <NotFound english={english} />;
}

export default function App() {
  const location = useLocation();
  const path = contentPath(location.pathname).replace(/\/+$/, "") || "/";
  const english = /^\/en(?:\/|$)/.test(location.pathname);
  const [database, setDatabase] = useState(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark" || savedTheme === "light") {
      document.documentElement.dataset.theme = savedTheme;
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.locale = english ? "en" : "bn";
    document.documentElement.lang = english ? "en" : "bn-BD";
  }, [english]);

  useEffect(() => {
    let active = true;
    const fetchJson = async (url, label) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`${label} request failed: ${response.status}`);
      return response.json();
    };
    Promise.all([
      fetchJson(knowledgeBaseUrl, "Knowledge-base"),
      fetchJson(madrasaManifestUrl, "Madrasa manifest"),
    ])
      .then(async ([knowledgeBase, manifest]) => {
        if (!Array.isArray(manifest?.partitions)) {
          throw new Error("The madrasa manifest is missing its partitions list");
        }
        const partitions = await Promise.all(manifest.partitions.map(async (partition) => {
          const url = recordPartitionUrls[partition.slug];
          if (!url || !partition.file) throw new Error(`Unknown madrasa partition: ${partition.slug}`);
          const records = await fetchJson(url, `Madrasa partition ${partition.slug}`);
          if (!Array.isArray(records) || records.length !== partition.count) {
            throw new Error(`Madrasa partition ${partition.slug} does not match its manifest count`);
          }
          return records;
        }));
        const records = partitions.flat().sort((left, right) => left.id.localeCompare(right.id, "en", { numeric: true }));
        if (records.length !== knowledgeBase.madrasa_directory?.imported_record_count) {
          throw new Error("Madrasa partition total does not match the knowledge-base record count");
        }
        const data = {
          ...knowledgeBase,
          madrasa_directory: { ...knowledgeBase.madrasa_directory, records },
        };
        if (!data?.madrasa_directory?.records || !Array.isArray(data.madrasa_directory.records)) {
          throw new Error("The knowledge-base and madrasa partitions are missing madrasa_directory.records");
        }
        if (active) setDatabase(data);
      })
      .catch((error) => {
        if (active) setLoadError(error);
      });
    return () => { active = false; };
  }, []);

  const records = useMemo(
    () => (database?.madrasa_directory.records || []).map((record) => ({
      ...record,
      contact_numbers: Array.isArray(record.contact_numbers) ? record.contact_numbers : [],
      contact_sources: Array.isArray(record.contact_sources) ? record.contact_sources : [],
    })),
    [database],
  );
  const sources = useMemo(() => new Map((database?.sources || []).map((source) => [source.id, source])), [database]);
  const value = useMemo(() => ({ database, records, sources }), [database, records, sources]);

  return (
    <>
      <a className="skip" href="#main">{english ? "Skip to content" : "মূল বিষয়ে যান"}</a>
      <SiteHeader english={english} path={path} />
      <main className="site-main" id="main">
        {loadError ? (
          <section className="load-error" role="alert">
            <h1>{english ? "Knowledge-base data could not be loaded" : "তথ্যভান্ডার লোড করা যায়নি"}</h1>
            <p>{String(loadError.message)}</p>
          </section>
        ) : !database ? (
          <p className="loading-state" role="status">{english ? "Loading knowledge base…" : "তথ্যভান্ডার লোড হচ্ছে…"}</p>
        ) : (
          <DatabaseContext.Provider value={value}>
            <RoutePage english={english} path={path} />
          </DatabaseContext.Provider>
        )}
      </main>
      <SiteFooter english={english} />
    </>
  );
}
