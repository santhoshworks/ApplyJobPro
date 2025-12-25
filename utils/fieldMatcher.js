function generateFieldKey(domain, label, fieldType) {
  const normalizedLabel = normalizeLabel(label);
  return `${domain}::${normalizedLabel}::${fieldType}`;
}

function normalizeLabel(label) {
  if (!label) return 'unknown';

  return label
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .substring(0, 100);
}

function extractFieldLabel(element) {
  if (element.getAttribute('aria-label')) {
    return element.getAttribute('aria-label');
  }

  if (element.placeholder) {
    return element.placeholder;
  }

  if (element.id) {
    const label = document.querySelector(`label[for="${element.id}"]`);
    if (label) {
      return label.textContent.trim();
    }
  }

  if (element.name) {
    const label = document.querySelector(`label[for="${element.name}"]`);
    if (label) {
      return label.textContent.trim();
    }
  }

  let current = element.parentElement;
  let depth = 0;
  while (current && depth < 3) {
    const label = current.querySelector('label');
    if (label) {
      return label.textContent.trim();
    }

    const text = Array.from(current.childNodes)
      .filter(node => node.nodeType === Node.TEXT_NODE)
      .map(node => node.textContent.trim())
      .filter(text => text.length > 0)
      .join(' ');

    if (text.length > 0 && text.length < 100) {
      return text;
    }

    current = current.parentElement;
    depth++;
  }

  return element.name || element.id || 'unknown';
}

function isKnownField(label) {
  const normalized = normalizeLabel(label);

  const knownPatterns = [
    'first_name', 'firstname', 'fname',
    'last_name', 'lastname', 'lname',
    'email', 'e_mail',
    'phone', 'telephone', 'mobile',
    'address', 'street', 'city', 'state', 'zip', 'postal',
    'linkedin', 'github', 'portfolio', 'website'
  ];

  return knownPatterns.some(pattern => normalized.includes(pattern));
}

function getKnownFieldValue(label, profile) {
  const normalized = normalizeLabel(label);

  if (normalized.includes('first') && normalized.includes('name')) {
    return profile.firstName || '';
  }
  if (normalized.includes('last') && normalized.includes('name')) {
    return profile.lastName || '';
  }
  if (normalized.includes('email')) {
    return profile.email || '';
  }
  if (normalized.includes('phone') || normalized.includes('mobile')) {
    return profile.phone || '';
  }
  if (normalized.includes('linkedin')) {
    return profile.linkedin || '';
  }
  if (normalized.includes('github')) {
    return profile.github || '';
  }

  return '';
}

// Canonical field synonyms dictionary (exported to window for content scripts)
// Each key maps to an array of synonyms/patterns that should match that field
// More specific patterns should come first
const FIELD_SYNONYMS = {
  // === IDENTITY / CONTACT ===
  first_name: [
    "first name", "given name", "forename", "fname", "first_name",
    "legal first name", "preferred first name"
  ],
  middle_name: [
    "middle name", "middle initial", "mname", "middle_name"
  ],
  last_name: [
    "last name", "surname", "family name", "lname", "last_name",
    "legal last name"
  ],
  full_name: [
    "full name", "your name", "legal name", "candidate name",
    "applicant name", "full_name", "fullname"
  ],
  preferred_name: [
    "preferred name", "nickname", "goes by", "known as"
  ],
  email: [
    "email", "email address", "e-mail", "e_mail", "electronic mail",
    "contact email", "personal email", "work email"
  ],
  phone: [
    "phone", "phone number", "mobile", "mobile number", "cell",
    "cell phone", "telephone", "contact number", "primary phone",
    "mobile phone", "tel"
  ],

  // === ADDRESS / LOCATION ===
  address_street: [
    "street address", "address line 1", "address line", "street",
    "mailing address", "home address", "residential address"
  ],
  address_line2: [
    "address line 2", "apt", "apartment", "suite", "unit", "floor"
  ],
  location_city: [
    "city", "current city", "home city", "city of residence"
  ],
  location_state: [
    "state", "province", "region", "state/province"
  ],
  location_zip: [
    "zip", "zip code", "postal code", "zipcode", "postcode"
  ],
  location_country: [
    "country", "country of residence", "nation"
  ],
  current_location: [
    "current location", "location", "where are you located",
    "where do you currently reside"
  ],

  // === SOCIAL / LINKS ===
  linkedin_url: [
    "linkedin", "linkedin profile", "linkedin url", "linkedin link",
    "linkedin.com"
  ],
  github_url: [
    "github", "github profile", "github url", "github link",
    "github.com", "github username"
  ],
  portfolio_url: [
    "portfolio", "portfolio url", "portfolio link", "personal website",
    "website", "personal site", "work samples"
  ],
  twitter_url: [
    "twitter", "twitter handle", "twitter profile", "x profile"
  ],
  personal_website: [
    "personal website", "blog", "personal blog", "homepage"
  ],

  // === CURRENT EMPLOYMENT ===
  current_title: [
    "current title", "current role", "current position", "current job title",
    "present title", "present role", "what is your current role",
    "what is your current title", "job title", "title"
  ],
  current_company: [
    "current company", "current employer", "current organization",
    "present company", "present employer", "where do you currently work",
    "employer", "company name", "organization"
  ],
  current_company_start: [
    "start date at current", "when did you start", "date started current"
  ],

  // === PREVIOUS EMPLOYMENT ===
  previous_title: [
    "previous title", "previous role", "previous position", "past title",
    "last title", "former title", "most recent title"
  ],
  previous_company: [
    "previous company", "previous employer", "past company", "last company",
    "former company", "former employer", "most recent company"
  ],

  // === EXPERIENCE ===
  years_of_experience: [
    "years of experience", "total experience", "experience years",
    "how many years", "professional experience", "work experience years",
    "total years of experience", "yoe"
  ],
  relevant_experience: [
    "relevant experience", "related experience", "applicable experience"
  ],
  work_history: [
    "work history", "employment history", "job history", "career history"
  ],

  // === SKILLS ===
  skills: [
    "skills", "technical skills", "key skills", "core skills",
    "skillset", "skill set", "competencies"
  ],
  programming_languages: [
    "programming languages", "coding languages", "languages you know",
    "what languages do you know"
  ],
  frontend_skills: [
    "frontend", "front end", "front-end", "frontend skills",
    "frontend technologies", "frontend frameworks", "ui technologies"
  ],
  backend_skills: [
    "backend", "back end", "back-end", "backend skills",
    "backend technologies", "backend frameworks", "server side"
  ],
  cloud_platforms: [
    "cloud", "cloud platforms", "cloud experience", "cloud services",
    "aws", "azure", "gcp", "cloud computing"
  ],
  databases: [
    "databases", "database technologies", "db experience",
    "database experience", "sql", "nosql"
  ],
  devops_tools: [
    "devops", "ci/cd", "infrastructure", "devops tools",
    "deployment", "containerization", "kubernetes", "docker"
  ],
  testing_tools: [
    "testing", "test frameworks", "qa tools", "testing tools"
  ],

  // === EDUCATION ===
  highest_degree: [
    "highest degree", "degree", "education level", "qualification",
    "highest qualification", "degree earned"
  ],
  field_of_study: [
    "field of study", "major", "concentration", "specialization",
    "area of study", "subject"
  ],
  institution: [
    "school", "university", "college", "institution",
    "educational institution", "school name", "university name"
  ],
  graduation_year: [
    "graduation year", "year graduated", "grad year",
    "year of graduation", "completion year"
  ],
  gpa: [
    "gpa", "grade point average", "grades", "cgpa", "academic score"
  ],

  // === WORK AUTHORIZATION ===
  visa_status: [
    "visa status", "immigration status", "visa type",
    "current visa", "work visa"
  ],
  requires_sponsorship: [
    "require sponsorship", "requires sponsorship", "need sponsorship",
    "sponsorship required", "visa sponsorship", "work sponsorship",
    "will you require sponsorship", "do you require sponsorship",
    "need visa sponsorship"
  ],
  authorized_to_work: [
    "authorized to work", "work authorization", "legally authorized",
    "eligible to work", "right to work", "work permit",
    "are you authorized to work", "legally eligible"
  ],
  citizenship: [
    "citizenship", "citizen", "nationality", "country of citizenship"
  ],

  // === AVAILABILITY / RELOCATION ===
  relocation_willingness: [
    "willing to relocate", "relocation", "open to relocation",
    "can you relocate", "would you relocate", "relocation preference"
  ],
  remote_preference: [
    "remote", "remote work", "work from home", "wfh",
    "hybrid", "on-site preference", "work arrangement"
  ],
  notice_period: [
    "notice period", "availability", "when can you start",
    "start date", "available to start", "earliest start date",
    "how soon can you start", "joining date"
  ],
  available_hours: [
    "available hours", "hours per week", "availability hours"
  ],

  // === COMPENSATION ===
  salary_expectation: [
    "salary expectation", "expected salary", "desired salary",
    "salary requirement", "compensation expectation",
    "what are your salary expectations", "target salary"
  ],
  current_salary: [
    "current salary", "present salary", "current compensation",
    "current ctc", "existing salary"
  ],
  currency: [
    "currency", "salary currency", "preferred currency"
  ],

  // === VOLUNTARY DISCLOSURES (EEOC) ===
  gender: [
    "gender", "sex", "gender identity", "what is your gender"
  ],
  race_ethnicity: [
    "race", "ethnicity", "race/ethnicity", "ethnic background",
    "racial background"
  ],
  veteran_status: [
    "veteran", "veteran status", "military service",
    "are you a veteran", "military veteran", "armed forces"
  ],
  disability_status: [
    "disability", "disability status", "disabled",
    "do you have a disability", "physical disability"
  ],
  lgbtq_status: [
    "lgbtq", "sexual orientation", "lgbtq+"
  ],

  // === REFERRAL / SOURCE ===
  referral_source: [
    "how did you hear", "referral source", "source",
    "where did you find", "job source", "how did you find us",
    "how did you learn about"
  ],
  referral_name: [
    "referral name", "referred by", "referrer name",
    "who referred you", "employee referral"
  ],

  // === COVER LETTER / ESSAYS ===
  cover_letter: [
    "cover letter", "letter of interest", "introduction letter"
  ],
  why_interested: [
    "why are you interested", "why this company", "why do you want",
    "what interests you", "why apply", "motivation"
  ],
  why_qualified: [
    "why are you qualified", "why should we hire",
    "what makes you a good fit", "qualifications"
  ],
  additional_info: [
    "additional information", "anything else", "other information",
    "comments", "notes", "additional comments"
  ]
};

// Match a label to a canonical field key using the synonyms dictionary
// Returns { key: canonicalKey, confidence: 'exact'|'partial' } or null
function matchCanonicalField(labelText) {
  if (!labelText) return null;

  const label = labelText.toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!label || label === 'unknown') return null;

  // First pass: exact match (label contains full synonym)
  for (const [canonicalKey, synonyms] of Object.entries(FIELD_SYNONYMS)) {
    for (const synonym of synonyms) {
      if (label === synonym || label.includes(synonym)) {
        return canonicalKey;
      }
    }
  }

  // Second pass: check if any synonym words are present (for partial matching)
  // Only match if at least 2 significant words match
  for (const [canonicalKey, synonyms] of Object.entries(FIELD_SYNONYMS)) {
    for (const synonym of synonyms) {
      const synonymWords = synonym.split(' ').filter(w => w.length > 2);
      const labelWords = label.split(' ').filter(w => w.length > 2);
      const matchCount = synonymWords.filter(sw => labelWords.some(lw => lw.includes(sw) || sw.includes(lw))).length;

      if (matchCount >= 2 || (synonymWords.length === 1 && matchCount === 1 && labelWords.length <= 3)) {
        return canonicalKey;
      }
    }
  }

  return null;
}

// Get nested value from schema object using dot notation or direct key
function getValueFromSchema(schema, key) {
  if (!schema || !key) return null;

  // Direct key access
  if (schema[key] !== undefined) return schema[key];

  // Try nested paths
  const paths = key.split('.');
  let current = schema;
  for (const p of paths) {
    if (!current || typeof current !== 'object') return null;
    current = current[p];
  }
  return current === undefined ? null : current;
}

// Determine expected value type for a canonical key
function getExpectedValueType(canonicalKey) {
  if (!canonicalKey) return 'text';

  const urlFields = [
    'linkedin_url', 'github_url', 'portfolio_url', 'twitter_url',
    'personal_website'
  ];
  const emailFields = ['email'];
  const phoneFields = ['phone'];
  const nameFields = [
    'first_name', 'middle_name', 'last_name', 'full_name',
    'preferred_name', 'referral_name'
  ];
  const numberFields = [
    'years_of_experience', 'gpa', 'graduation_year',
    'salary_expectation', 'current_salary', 'available_hours'
  ];
  const booleanFields = [
    'requires_sponsorship', 'authorized_to_work',
    'relocation_willingness', 'remote_preference'
  ];

  if (urlFields.includes(canonicalKey)) return 'url';
  if (emailFields.includes(canonicalKey)) return 'email';
  if (phoneFields.includes(canonicalKey)) return 'phone';
  if (nameFields.includes(canonicalKey)) return 'name';
  if (numberFields.includes(canonicalKey)) return 'number';
  if (booleanFields.includes(canonicalKey)) return 'boolean';

  return 'text';
}

// Validate that a value matches the expected type for a canonical key
function isValidValueForKey(value, canonicalKey) {
  if (!value || !canonicalKey) return false;

  const v = String(value).trim();
  if (!v) return false;

  const expectedType = getExpectedValueType(canonicalKey);

  switch (expectedType) {
    case 'url':
      return /^https?:\/\//i.test(v) || /^www\./i.test(v);
    case 'email':
      return /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(v);
    case 'phone':
      return /^[\d\s()+-]{7,}$/.test(v.replace(/\s/g, ''));
    case 'name':
      // Name should NOT be URL, email, or phone
      if (/^https?:\/\//i.test(v) || /www\./i.test(v)) return false;
      if (/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(v)) return false;
      if (/^[\d\s()+-]{10,}$/.test(v)) return false;
      // Should have 1-4 words
      const words = v.split(/\s+/).filter(Boolean);
      return words.length >= 1 && words.length <= 5;
    case 'number':
      return !isNaN(parseFloat(v));
    case 'boolean':
      return /^(yes|no|true|false|1|0)$/i.test(v);
    default:
      return v.length > 0;
  }
}

// Check if a value looks like a URL (to prevent URLs in wrong fields)
function isURL(value) {
  if (!value) return false;
  return /^https?:\/\//i.test(value) || /^www\./i.test(value);
}

// Check if a value looks like an email
function isEmail(value) {
  if (!value) return false;
  return /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value);
}

// Check if a value looks like a phone number
function isPhone(value) {
  if (!value) return false;
  return /^[\d\s()+-]{7,}$/.test(String(value).replace(/\s/g, ''));
}

// expose to global (content script can call these after manifest includes this file)
try {
  window.FIELD_SYNONYMS = FIELD_SYNONYMS;
  window.matchCanonicalField = matchCanonicalField;
  window.getValueFromSchema = getValueFromSchema;
  window.getExpectedValueType = getExpectedValueType;
  window.isValidValueForKey = isValidValueForKey;
  window.isURL = isURL;
  window.isEmail = isEmail;
  window.isPhone = isPhone;
} catch (e) {
  // ignore in non-browser contexts
}

// This file runs in the content script context; exports are not required.

