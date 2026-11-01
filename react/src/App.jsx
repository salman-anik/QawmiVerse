import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  Link,
  Route,
  Routes,
  useLocation,
  useParams,
} from "react-router-dom";
import directoryUrl from "../../data/madrasas.json?url";

const DirectoryContext = createContext(null);

function useDirectory() {
  const value = useContext(DirectoryContext);
  if (!value) throw new Error("Directory data is not available");
  return value;
}

const normalizeRecord = (record) => {
  if (!Array.isArray(record)) {
    return {
      id: record.id,
      name: record.name,
      area: record.area ?? record.address ?? "",
      upazila: record.upazila ?? "",
      districtIndex: record.districtIndex ?? record.district ?? 0,
      isWomen: Boolean(record.isWomen ?? record.isFemale),
      ilhakCodes: record.ilhakCodes ?? record.ilhak ?? [],
      levels: record.levels ?? (record.level ? [record.level] : []),
      phone: record.phone ?? null,
      locationUnverified: Boolean(record.locationUnverified),
    };
  }

  const [id, name, area, upazila, districtIndex, isWomen, codes, ...details] =
    record;
  const metadata =
    details.length && typeof details[0] === "object" ? details[0] : {};
  return {
    id,
    name,
    area,
    upazila,
    districtIndex,
    isWomen: Boolean(isWomen),
    ilhakCodes: Array.isArray(codes)
      ? codes
      : String(codes ?? "")
          .split(",")
          .map((code) => code.trim())
          .filter(Boolean),
    levels: metadata.levels ?? [],
    phone: metadata.phone ?? null,
    locationUnverified: Boolean(metadata.locationUnverified),
  };
};

const normalizeDigits = (value) =>
  String(value)
    .replace(/[০-৯]/g, (digit) => String("০১২৩৪৫৬৭৮৯".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));

const normalizeText = (value) =>
  normalizeDigits(value)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");

const codesForSearch = (madrasa) =>
  madrasa.ilhakCodes
    .flatMap((value) => String(value).split(","))
    .map((value) => normalizeText(value.replace(/^ম[-–]?/, "m-")));

const isEnglishPath = (pathname) => pathname === "/en" || pathname.startsWith("/en/");
const routePrefix = (english) => (english ? "/en" : "");

function usePageMeta(title, description) {
  useEffect(() => {
    if (title) document.title = title;
    if (description) {
      let tag = document.querySelector('meta[name="description"]');
      if (!tag) {
        tag = document.createElement("meta");
        tag.name = "description";
        document.head.appendChild(tag);
      }
      tag.content = description;
    }
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = `${window.location.origin}${window.location.pathname}`;
  }, [description, title]);
}

function SiteHeader({ english }) {
  const location = useLocation();
  const otherLanguage = english
    ? location.pathname.replace(/^\/en(?=\/|$)/, "") || "/"
    : `/en${location.pathname === "/" ? "" : location.pathname}`;

  return (
    <header className="top">
      <div className="wrap bar">
        <Link className="brand" to={routePrefix(english) || "/"}>
          <span aria-hidden="true">🕌</span>
          <span>
            <b>{english ? "Koumi Madrasa List" : "কওমি মাদরাসা তালিকা"}</b>
            <small>
              {english
                ? "Bangladesh madrasa directory"
                : "বাংলাদেশের কওমি মাদরাসার ডিরেক্টরি"}
            </small>
          </span>
        </Link>
        <nav className="menu" aria-label={english ? "Main navigation" : "প্রধান নেভিগেশন"}>
          <Link to={routePrefix(english) || "/"}>{english ? "Home" : "হোম"}</Link>
          <Link to={`${routePrefix(english)}/division/dhaka/`}>
            {english ? "Dhaka Division" : "ঢাকা বিভাগ"}
          </Link>
          <Link to={`${routePrefix(english)}/about/`}>
            {english ? "About" : "পরিচিতি"}
          </Link>
          <Link className="lang" to={otherLanguage}>
            {english ? "বাংলা" : "English"}
          </Link>
          <button
            className="icon"
            type="button"
            aria-label={english ? "Toggle dark mode" : "ডার্ক মোড"}
            onClick={() => {
              const next =
                document.documentElement.dataset.theme === "dark" ? "light" : "dark";
              document.documentElement.dataset.theme = next;
              localStorage.setItem("theme", next);
            }}
          >
            ◐
          </button>
        </nav>
      </div>
    </header>
  );
}

function MadrasaCard({ madrasa, english }) {
  const { districts } = useDirectory();
  const district = districts[madrasa.districtIndex];
  return (
    <li className="card">
      <Link className="cname" to={`${routePrefix(english)}/madrasa/${madrasa.id}/`}>
        {madrasa.name}
      </Link>
      <p className="loc">
        {[madrasa.area, madrasa.upazila, district?.[english ? "en" : "bn"]]
          .filter(Boolean)
          .join(", ")}
      </p>
      <p className="tags">
        {madrasa.isWomen && (
          <span className="tag fem">{english ? "Women’s branch" : "মহিলা শাখা"}</span>
        )}
        {madrasa.ilhakCodes.map((code) => (
          <span className="tag code" key={code}>
            {code}
          </span>
        ))}
        {madrasa.locationUnverified && (
          <span className="tag">
            {english ? "Area not confirmed" : "থানা অনিশ্চিত"}
          </span>
        )}
      </p>
    </li>
  );
}

function SearchBox({ english, initialDistrict = "", initialDivision = "" }) {
  const { madrasas, districts, divisions } = useDirectory();
  const [query, setQuery] = useState("");
  const [district, setDistrict] = useState(initialDistrict);
  const [division, setDivision] = useState(initialDivision);
  const [upazila, setUpazila] = useState("");
  const [gender, setGender] = useState("");
  const [visibleCount, setVisibleCount] = useState(30);
  const normalizedQuery = normalizeText(query.trim());
  const districtOptions = districts.filter(
    (entry) =>
      !division ||
      divisions[entry.div]?.slug === division,
  );
  const upazilaOptions = [
    ...new Set(
      madrasas
        .filter((madrasa) => {
          if (district && districts[madrasa.districtIndex]?.slug !== district) return false;
          if (division && divisions[districts[madrasa.districtIndex]?.div]?.slug !== division) {
            return false;
          }
          return Boolean(madrasa.upazila);
        })
        .map((madrasa) => madrasa.upazila),
    ),
  ].sort((a, b) => a.localeCompare(b, english ? "en" : "bn"));
  const results = useMemo(
    () =>
      madrasas.filter((madrasa) => {
        if (district && districts[madrasa.districtIndex]?.slug !== district) return false;
        if (
          division &&
          divisions[districts[madrasa.districtIndex]?.div]?.slug !== division
        ) {
          return false;
        }
        if (upazila && madrasa.upazila !== upazila) return false;
        if (gender === "women" && !madrasa.isWomen) return false;
        if (gender === "men" && madrasa.isWomen) return false;
        if (!normalizedQuery) return true;
        return (
          normalizeText(
            `${madrasa.name} ${madrasa.area} ${madrasa.upazila} ${
              districts[madrasa.districtIndex]?.en ?? ""
            } ${districts[madrasa.districtIndex]?.bn ?? ""}`,
          ).includes(normalizedQuery) ||
          codesForSearch(madrasa).some((code) => code.includes(normalizedQuery))
        );
      }),
    [district, division, gender, normalizedQuery, upazila],
  );
  const visible = results.slice(0, visibleCount);

  return (
    <section className="hero">
      <div className="sbox">
        <label className="sr-only" htmlFor="q">
          {english ? "Search by name, address, or ilhak number" : "নাম, ঠিকানা বা ইলহাক নম্বর দিয়ে খুঁজুন"}
        </label>
        <input
          id="q"
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setVisibleCount(30);
          }}
          placeholder={
            english
              ? "Search name, address, or ilhak number…"
              : "নাম, ঠিকানা বা ইলহাক নম্বর লিখুন…"
          }
        />
        <div className="filters">
          <label>
            {english ? "Division" : "বিভাগ"}
            <select
              value={division}
              onChange={(event) => {
                setDivision(event.target.value);
                setDistrict("");
                setUpazila("");
                setVisibleCount(30);
              }}
            >
              <option value="">{english ? "All divisions" : "সব বিভাগ"}</option>
              {divisions.map((entry) => (
                <option key={entry.slug} value={entry.slug}>
                  {entry[english ? "en" : "bn"]}
                </option>
              ))}
            </select>
          </label>
          <label>
            {english ? "District" : "জেলা"}
            <select
              value={district}
              onChange={(event) => {
                setDistrict(event.target.value);
                setUpazila("");
                setVisibleCount(30);
              }}
            >
              <option value="">{english ? "All districts" : "সব জেলা"}</option>
              {districtOptions.map((entry) => (
                <option key={entry.slug} value={entry.slug}>
                  {entry[english ? "en" : "bn"]}
                </option>
              ))}
            </select>
          </label>
          <label>
            {english ? "Upazila / thana" : "উপজেলা / থানা"}
            <select
              value={upazila}
              onChange={(event) => {
                setUpazila(event.target.value);
                setVisibleCount(30);
              }}
            >
              <option value="">{english ? "All areas" : "সব এলাকা"}</option>
              {upazilaOptions.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </select>
          </label>
          <label>
            {english ? "Branch" : "শাখা"}
            <select
              value={gender}
              onChange={(event) => {
                setGender(event.target.value);
                setVisibleCount(30);
              }}
            >
              <option value="">{english ? "All branches" : "সব শাখা"}</option>
              <option value="men">{english ? "Men" : "পুরুষ"}</option>
              <option value="women">{english ? "Women" : "মহিলা"}</option>
            </select>
          </label>
        </div>
        <div className="srow">
          <span className="muted" aria-live="polite">
            {english
              ? `${results.length.toLocaleString("en")} results`
              : `${results.length.toLocaleString("bn-BD")}টি ফলাফল`}
          </span>
          <button
            className="ghost"
            type="button"
            onClick={() => {
              setQuery("");
              setDistrict(initialDistrict);
              setDivision(initialDivision);
              setUpazila("");
              setGender("");
              setVisibleCount(30);
            }}
          >
            {english ? "Clear" : "মুছুন"}
          </button>
        </div>
      </div>
      <div className="search-results">
        {visible.length ? (
          <ul className="cards">
            {visible.map((madrasa) => (
              <MadrasaCard
                key={madrasa.id}
                madrasa={madrasa}
                english={english}
              />
            ))}
          </ul>
        ) : (
          <p className="empty-state">
            {english ? "No matching madrasas found." : "কোনো মাদরাসা পাওয়া যায়নি।"}
          </p>
        )}
        {visible.length < results.length && (
          <div className="more">
            <button
              className="btn"
              type="button"
              onClick={() => setVisibleCount((count) => count + 30)}
            >
              {english ? "Show more" : "আরও দেখুন"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function HomePage({ english }) {
  const { madrasas } = useDirectory();
  usePageMeta(
    english
      ? "Koumi Madrasa Directory in Bangladesh"
      : "বাংলাদেশের কওমি মাদরাসা তালিকা",
    english
      ? "Search the Bangladesh Koumi madrasa directory by name, location, or ilhak number."
      : "নাম, ঠিকানা, জেলা অথবা ইলহাক নম্বর দিয়ে বাংলাদেশের কওমি মাদরাসা খুঁজুন।",
  );
  return (
    <>
      <div className="hero">
        <h1>{english ? "Koumi Madrasa Directory" : "বাংলাদেশের কওমি মাদরাসার তালিকা"}</h1>
        <p className="lead">
          {english
            ? "Find madrasa names, locations, and available ilhak numbers across Bangladesh."
            : "বাংলাদেশের বিভিন্ন এলাকার মাদরাসার নাম, ঠিকানা ও ইলহাক নম্বর খুঁজুন।"}
        </p>
        <p className="muted">
          {english
            ? `${madrasas.length.toLocaleString("en")} records in the directory`
            : `ডিরেক্টরিতে ${madrasas.length.toLocaleString("bn-BD")}টি তথ্য`}
        </p>
      </div>
      <SearchBox english={english} />
    </>
  );
}

function ListingPage({ english, district, division }) {
  const { madrasas, districts, divisions } = useDirectory();
  const selectedDistrict = district
    ? districts.find((entry) => entry.slug === district)
    : null;
  const selectedDivision = division
    ? divisions.find((entry) => entry.slug === division)
    : null;
  const rows = madrasas.filter((madrasa) => {
    if (selectedDistrict) return madrasa.districtIndex === districts.indexOf(selectedDistrict);
    if (selectedDivision) return districts[madrasa.districtIndex]?.div === divisions.indexOf(selectedDivision);
    return false;
  });
  const title = selectedDistrict
    ? selectedDistrict[english ? "en" : "bn"]
    : selectedDivision?.[english ? "en" : "bn"];

  usePageMeta(
    `${title ?? ""} ${english ? "Koumi Madrasa Directory" : "কওমি মাদরাসা তালিকা"}`,
    english
      ? `${rows.length.toLocaleString("en")} madrasa records in ${title ?? "this area"}.`
      : `${title ?? "এই এলাকায়"} ${rows.length.toLocaleString("bn-BD")}টি মাদরাসার তথ্য।`,
  );

  if (!selectedDistrict && !selectedDivision) return <NotFound english={english} />;

  return (
    <>
      <p className="crumbs">
        <Link to={routePrefix(english) || "/"}>{english ? "Home" : "হোম"}</Link>
        {" / "}
        {title}
      </p>
      <h1>
        {title} {english ? "Koumi Madrasa Directory" : "কওমি মাদরাসা তালিকা"}
      </h1>
      <p className="lead">
        {english
          ? `${rows.length.toLocaleString("en")} records. Search within this list or browse every result below.`
          : `${rows.length.toLocaleString("bn-BD")}টি মাদরাসার তথ্য। এই তালিকায় খুঁজুন অথবা সব ফলাফল দেখুন।`}
      </p>
      {selectedDivision && (
        <div className="dgrid">
          {districts
            .filter((entry) => entry.div === divisions.indexOf(selectedDivision))
            .map((entry) => {
              const count = madrasas.filter(
                (madrasa) => districts[madrasa.districtIndex]?.slug === entry.slug,
              ).length;
              return (
                <Link
                  className="dcard"
                  key={entry.slug}
                  to={`${routePrefix(english)}/district/${entry.slug}/`}
                >
                  <b>{entry[english ? "en" : "bn"]}</b>
                  <span>
                    {count.toLocaleString(english ? "en" : "bn-BD")}{" "}
                    {english ? "madrasas" : "টি মাদরাসা"}
                  </span>
                </Link>
              );
            })}
        </div>
      )}
      <SearchBox
        english={english}
        initialDistrict={selectedDistrict?.slug ?? ""}
        initialDivision={selectedDivision?.slug ?? ""}
      />
    </>
  );
}

function MadrasaPage({ english, recordId }) {
  const { madrasas, districts } = useDirectory();
  const { id: routeId } = useParams();
  const id = recordId ?? routeId;
  const madrasa = madrasas.find((entry) => String(entry.id) === id);
  const district = madrasa ? districts[madrasa.districtIndex] : null;
  usePageMeta(
    madrasa
      ? `${madrasa.name} | ${english ? "Madrasa Details" : "মাদরাসার তথ্য"}`
      : english
        ? "Madrasa not found"
        : "মাদরাসা পাওয়া যায়নি",
    madrasa
      ? [madrasa.area, madrasa.upazila, district?.[english ? "en" : "bn"]]
          .filter(Boolean)
          .join(", ")
      : "",
  );

  if (!madrasa) return <NotFound english={english} />;

  return (
    <>
      <p className="crumbs">
        <Link to={routePrefix(english) || "/"}>{english ? "Home" : "হোম"}</Link>
        {" / "}
        <Link to={`${routePrefix(english)}/district/${district?.slug ?? ""}/`}>
          {district?.[english ? "en" : "bn"]}
        </Link>
      </p>
      <h1>{madrasa.name}</h1>
      <p className="lead">
        {[madrasa.area, madrasa.upazila, district?.[english ? "en" : "bn"]]
          .filter(Boolean)
          .join(", ")}
      </p>
      <section className="info">
        <h2>{english ? "Madrasa information" : "মাদরাসার তথ্য"}</h2>
        <dl>
          <dt>{english ? "Branch" : "ধরন"}</dt>
          <dd>
            {madrasa.isWomen
              ? english
                ? "Women"
                : "মহিলা"
              : english
                ? "Men"
                : "পুরুষ"}
          </dd>
          <dt>{english ? "Level" : "স্তর"}</dt>
          <dd>
            {madrasa.levels.length
              ? madrasa.levels.join(", ")
              : english
                ? "Not provided"
                : "তথ্য নেই"}
          </dd>
          <dt>{english ? "Ilhak number" : "ইলহাক নম্বর"}</dt>
          <dd>{madrasa.ilhakCodes.length ? madrasa.ilhakCodes.join(", ") : english ? "Not provided" : "তথ্য নেই"}</dd>
          <dt>{english ? "Phone" : "ফোন"}</dt>
          <dd>
            {madrasa.phone ? (
              <a className="phone-link" href={`tel:${madrasa.phone}`}>
                {madrasa.phone}
              </a>
            ) : english ? (
              "Not provided"
            ) : (
              "তথ্য নেই"
            )}
          </dd>
          {madrasa.locationUnverified && (
            <>
              <dt>{english ? "Area confirmation" : "এলাকার নিশ্চয়তা"}</dt>
              <dd>
                {english
                  ? "The source could not confirm the exact thana."
                  : "উৎসে সঠিক থানার অবস্থান নিশ্চিত করা যায়নি।"}
              </dd>
            </>
          )}
        </dl>
      </section>
    </>
  );
}

function AboutPage({ english }) {
  usePageMeta(
    english ? "About the Directory" : "এই ডিরেক্টরি সম্পর্কে",
    english
      ? "Information about the Bangladesh Koumi madrasa directory and its data."
      : "বাংলাদেশের কওমি মাদরাসা ডিরেক্টরি ও তথ্যের উৎস সম্পর্কে জানুন।",
  );
  return (
    <>
      <h1>{english ? "About this directory" : "এই ডিরেক্টরি সম্পর্কে"}</h1>
      <p className="lead">
        {english
          ? "This directory helps visitors search madrasa names, areas, and ilhak numbers using the project’s JSON dataset."
          : "এই ডিরেক্টরির JSON তথ্যভান্ডার ব্যবহার করে মাদরাসার নাম, এলাকা ও ইলহাক নম্বর খোঁজা যায়।"}
      </p>
      <p className="note">
        {english
          ? "Phone numbers and levels are shown only when provided by a source; missing values are not inferred."
          : "ফোন নম্বর ও স্তরের তথ্য উৎসে পাওয়া গেলেই দেখানো হয়; অনুপস্থিত তথ্য অনুমান করে যোগ করা হয় না।"}
      </p>
    </>
  );
}

function NotFound({ english }) {
  usePageMeta(
    english ? "Page not found" : "পৃষ্ঠা পাওয়া যায়নি",
    english ? "The requested directory page was not found." : "অনুরোধ করা পৃষ্ঠাটি পাওয়া যায়নি।",
  );
  return (
    <section>
      <h1>{english ? "Page not found" : "পৃষ্ঠা পাওয়া যায়নি"}</h1>
      <Link className="btn" to={routePrefix(english) || "/"}>
        {english ? "Go to home" : "হোমে ফিরে যান"}
      </Link>
    </section>
  );
}

function SiteFooter({ english }) {
  return (
    <footer className="foot">
      <div className="wrap">
        <b>{english ? "Koumi Madrasa List" : "কওমি মাদরাসা তালিকা"}</b>
        <p>
          {english
            ? "A searchable directory built from the project’s JSON data."
            : "প্রকল্পের JSON তথ্যভান্ডার থেকে তৈরি অনুসন্ধানযোগ্য ডিরেক্টরি।"}
        </p>
        <p className="fine">
          {english
            ? "Please verify details with the madrasa before relying on them."
            : "তথ্যের ওপর নির্ভর করার আগে সংশ্লিষ্ট মাদরাসার সঙ্গে যাচাই করে নিন।"}
        </p>
      </div>
    </footer>
  );
}

export default function App() {
  const location = useLocation();
  const english = isEnglishPath(location.pathname);
  const [directory, setDirectory] = useState(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark" || savedTheme === "light") {
      document.documentElement.dataset.theme = savedTheme;
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch(directoryUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Directory data request failed: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        if (active) {
          setDirectory({
            ...data,
            madrasas: data.items.map(normalizeRecord),
          });
        }
      })
      .catch((error) => {
        if (active) setLoadError(error);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <a className="skip" href="#main">
        {english ? "Skip to content" : "মূল বিষয়বস্তুতে যান"}
      </a>
      <SiteHeader english={english} />
      <main className="wrap" id="main">
        {loadError ? (
          <section role="alert">
            <h1>{english ? "Directory data could not be loaded" : "ডিরেক্টরির তথ্য লোড করা যায়নি"}</h1>
            <p className="note">{String(loadError.message)}</p>
          </section>
        ) : !directory ? (
          <p role="status">{english ? "Loading directory…" : "ডিরেক্টরির তথ্য লোড হচ্ছে…"}</p>
        ) : (
          <DirectoryContext.Provider value={directory}>
            <Routes>
              <Route path="/" element={<HomePage english={false} />} />
              <Route path="/en/*" element={<EnglishRoutes />} />
              <Route path="/madrasa/:id/" element={<MadrasaPage english={false} />} />
              <Route
                path="/district/:slug/"
                element={<DistrictRoute english={false} />}
              />
              <Route
                path="/division/:slug/"
                element={<DivisionRoute english={false} />}
              />
              <Route path="/about/" element={<AboutPage english={false} />} />
              <Route path="*" element={<NotFound english={false} />} />
            </Routes>
          </DirectoryContext.Provider>
        )}
      </main>
      <SiteFooter english={english} />
    </>
  );
}

function EnglishRoutes() {
  const location = useLocation();
  const path = location.pathname.replace(/^\/en(?=\/|$)/, "") || "/";
  const englishPath = path.replace(/\/+$/, "") || "/";
  if (englishPath === "/") return <HomePage english />;
  const detail = englishPath.match(/^\/madrasa\/(\d+)$/);
  if (detail) return <MadrasaRoute english id={detail[1]} />;
  const district = englishPath.match(/^\/district\/([^/]+)$/);
  if (district) return <ListingPage english district={district[1]} />;
  const division = englishPath.match(/^\/division\/([^/]+)$/);
  if (division) return <ListingPage english division={division[1]} />;
  if (englishPath === "/about") return <AboutPage english />;
  return <NotFound english />;
}

function MadrasaRoute({ english, id }) {
  const { madrasas } = useDirectory();
  const entry = madrasas.find((madrasa) => String(madrasa.id) === id);
  if (!entry) return <NotFound english={english} />;
  return <MadrasaPage english={english} recordId={id} />;
}

function DistrictRoute({ english }) {
  const { slug } = useParams();
  return <ListingPage english={english} district={slug} />;
}

function DivisionRoute({ english }) {
  const { slug } = useParams();
  return <ListingPage english={english} division={slug} />;
}
