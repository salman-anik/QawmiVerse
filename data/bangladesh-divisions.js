export const DISTRICT_GROUPS = [
  {
    division: { slug: "barishal", en: "Barishal", bn: "বরিশাল" },
    districts: [["Barguna", "বরগুনা"], ["Barishal", "বরিশাল"], ["Bhola", "ভোলা"], ["Jhalokati", "ঝালকাঠি"], ["Patuakhali", "পটুয়াখালী"], ["Pirojpur", "পিরোজপুর"]],
  },
  {
    division: { slug: "chattogram", en: "Chattogram", bn: "চট্টগ্রাম" },
    districts: [["Bandarban", "বান্দরবান"], ["Brahmanbaria", "ব্রাহ্মণবাড়িয়া", "বি-বাড়িয়া"], ["Chandpur", "চাঁদপুর"], ["Chattogram", "চট্টগ্রাম"], ["Cumilla", "কুমিল্লা"], ["Cox's Bazar", "কক্সবাজার"], ["Feni", "ফেনী"], ["Khagrachhari", "খাগড়াছড়ি"], ["Lakshmipur", "লক্ষ্মীপুর", "ল²ীপুর"], ["Noakhali", "নোয়াখালী"], ["Rangamati", "রাঙামাটি"]],
  },
  {
    division: { slug: "dhaka", en: "Dhaka", bn: "ঢাকা" },
    districts: [["Dhaka", "ঢাকা"], ["Faridpur", "ফরিদপুর"], ["Gazipur", "গাজীপুর"], ["Gopalganj", "গোপালগঞ্জ"], ["Kishoreganj", "কিশোরগঞ্জ"], ["Madaripur", "মাদারীপুর"], ["Manikganj", "মানিকগঞ্জ"], ["Munshiganj", "মুন্সিগঞ্জ"], ["Narayanganj", "নারায়ণগঞ্জ"], ["Narsingdi", "নরসিংদী"], ["Rajbari", "রাজবাড়ী"], ["Shariatpur", "শরীয়তপুর"], ["Tangail", "টাঙ্গাইল"]],
  },
  {
    division: { slug: "khulna", en: "Khulna", bn: "খুলনা" },
    districts: [["Bagerhat", "বাগেরহাট"], ["Chuadanga", "চুয়াডাঙ্গা"], ["Jashore", "যশোর"], ["Jhenaidah", "ঝিনাইদহ"], ["Khulna", "খুলনা"], ["Kushtia", "কুষ্টিয়া"], ["Magura", "মাগুরা"], ["Meherpur", "মেহেরপুর"], ["Narail", "নড়াইল"], ["Satkhira", "সাতক্ষীরা"]],
  },
  {
    division: { slug: "mymensingh", en: "Mymensingh", bn: "ময়মনসিংহ" },
    districts: [["Jamalpur", "জামালপুর"], ["Mymensingh", "ময়মনসিংহ", "মোমেনশাহী"], ["Netrokona", "নেত্রকোনা"], ["Sherpur", "শেরপুর"]],
  },
  {
    division: { slug: "rajshahi", en: "Rajshahi", bn: "রাজশাহী" },
    districts: [["Bogura", "বগুড়া"], ["Joypurhat", "জয়পুরহাট"], ["Naogaon", "নওগাঁ"], ["Natore", "নাটোর"], ["Chapainawabganj", "চাঁপাইনবাবগঞ্জ"], ["Pabna", "পাবনা"], ["Rajshahi", "রাজশাহী"], ["Sirajganj", "সিরাজগঞ্জ"]],
  },
  {
    division: { slug: "rangpur", en: "Rangpur", bn: "রংপুর" },
    districts: [["Dinajpur", "দিনাজপুর"], ["Gaibandha", "গাইবান্ধা"], ["Kurigram", "কুড়িগ্রাম"], ["Lalmonirhat", "লালমনিরহাট"], ["Nilphamari", "নীলফামারী"], ["Panchagarh", "পঞ্চগড়"], ["Rangpur", "রংপুর"], ["Thakurgaon", "ঠাকুরগাঁও"]],
  },
  {
    division: { slug: "sylhet", en: "Sylhet", bn: "সিলেট" },
    districts: [["Habiganj", "হবিগঞ্জ"], ["Moulvibazar", "মৌলভীবাজার", "মৌলভী বাজার"], ["Sunamganj", "সুনামগঞ্জ"], ["Sylhet", "সিলেট"]],
  },
];

export const BANGLADESH_DIVISIONS = DISTRICT_GROUPS.map(({ division }) => division);
export const BANGLADESH_DISTRICTS = DISTRICT_GROUPS.flatMap(({ division, districts }) =>
  districts.map(([en, bn, ...aliases]) => ({
    slug: en.toLowerCase().replace(/[^a-z]+/g, "-"),
    en,
    bn,
    aliases: [en, bn, ...aliases],
    division: division.slug,
  })),
);

export function normalizeDigits(value) {
  return String(value)
    .replace(/[০-৯]/g, (digit) => String("০১২৩৪৫৬৭৮৯".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

export function normalizeText(value) {
  return normalizeDigits(value)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, "");
}

export const TRANSLITERATION_MAP = {
  dhaka: "ঢাকা",
  chittagong: "চট্টগ্রাম",
  chattogram: "চট্টগ্রাম",
  sylhet: "সিলেট",
  rajshahi: "রাজশাহী",
  khulna: "খুলনা",
  barisal: "বরিশাল",
  barishal: "বরিশাল",
  rangpur: "রংপুর",
  mymensingh: "ময়মনসিংহ",
  comilla: "কুমিল্লা",
  cumilla: "কুমিল্লা",
  brahmanbaria: "ব্রাহ্মণবাড়িয়া",
  bogra: "বগুড়া",
  bogura: "বগুড়া",
  jessore: "যশোর",
  jashore: "যশোর",
  coxsbazar: "কক্সবাজার",
  feni: "ফেনী",
  noakhali: "নোয়াখালী",
  chandpur: "চাঁদপুর",
  gazipur: "গাজীপুর",
  narayanganj: "নারায়ণগঞ্জ",
  narsingdi: "নরসিংদী",
  tangail: "টাঙ্গাইল",
  faridpur: "ফরিদপুর",
  kishoreganj: "কিশোরগঞ্জ",
  manikganj: "মানিকগঞ্জ",
  munshiganj: "মুন্সিগঞ্জ",
  pabna: "পাবনা",
  sirajganj: "সিরাজগঞ্জ",
  dinajpur: "দিনাজপুর",
  kushtia: "কুষ্টিয়া",
  satkhira: "সাতক্ষীরা",
  mirpur: "মিরপুর",
  uttara: "উত্তরা",
  dhanmondi: "ধানমন্ডি",
  mohammadpur: "মোহাম্মদপুর",
  jatrabari: "যাত্রাবাড়ী",
  badda: "বাড্ডা",
  gulshan: "গুলশান",
  banani: "বনানী",
  lalbagh: "লালবাগ",
  motijheel: "মতিঝিল",
  wari: "ওয়ারী",
  savar: "সাভার",
  demra: "ডেমরা",
  keraniganj: "কেরানীগঞ্জ",
  jamia: "জামিয়া",
  jamea: "জামিয়া",
  darul: "দারুল",
  uloom: "উলুম",
  ulum: "উলুম",
  madrasa: "মাদরাসা",
  madrasah: "মাদরাসা",
  befaq: "বেফাক",
  wifaq: "বেফাক",
  dawra: "দাওরা",
  dawrah: "দাওরা",
  hadith: "হাদিস",
  hadis: "হাদিস",
  tahfiz: "তাহফিজ",
  hifz: "হিফজ",
  tajwid: "তাজবীদ",
  tajweed: "তাজবীদ",
  quran: "কুরআন",
  koran: "কুরআন",
  mahila: "মহিলা",
  women: "মহিলা",
  female: "মহিলা",
  men: "পুরুষ",
  male: "পুরুষ",
};

export function searchTokens(value) {
  return normalizeDigits(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\u09AF\u09BC/g, "\u09DF")
    .replace(/\u09A1\u09BC/g, "\u09DC")
    .replace(/\u09A2\u09BC/g, "\u09DD")
    .replace(/জামিয়া/g, "জামিয়া")
    .replace(/মাদ্রাসা/g, "মাদরাসা")
    .replace(/কওমী/g, "কওমি")
    .replace(/মুন্সীগঞ্জ/g, "মুন্সিগঞ্জ")
    .replace(/নরসিংদি/g, "নরসিংদী")
    .replace(/ব্রাহ্মণবাড়িয়া/g, "ব্রাহ্মণবাড়িয়া")
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

export function matchesQuery(searchQuery, searchableFields) {
  if (!searchQuery || !searchQuery.trim()) return true;
  const rawTokens = searchTokens(searchQuery);
  if (!rawTokens.length) return true;

  const text = searchableFields
    .filter(Boolean)
    .map((field) => searchTokens(field).join(" "))
    .join(" ");

  return rawTokens.every((token) => {
    if (text.includes(token)) return true;
    const transliterated = TRANSLITERATION_MAP[token];
    if (transliterated && text.includes(transliterated)) return true;
    const strippedToken = token.replace(/[\u09BE-\u09CD]/g, "");
    const strippedText = text.replace(/[\u09BE-\u09CD]/g, "");
    if (strippedToken.length >= 3 && strippedText.includes(strippedToken)) return true;
    return false;
  });
}

export function districtFromAddress(address) {
  const segments = String(address || "")
    .split(/[,،;|/]+/)
    .map(normalizeText)
    .filter(Boolean);
  const matches = BANGLADESH_DISTRICTS.filter((district) => {
    const names = district.aliases.map(normalizeText);
    return segments.some((segment) => names.some((name) => segment === name || segment.endsWith(name)));
  });
  return matches.length === 1 ? matches[0] : null;
}
