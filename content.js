(async function () {
  // For iframes, get the top-level domain or iframe's own domain
  const domain = window.location.hostname;

  // Also check parent domain for iframes (Greenhouse embeds use boards.greenhouse.io)
  let checkDomains = [domain];
  try {
    if (window.top !== window && document.referrer) {
      const referrerUrl = new URL(document.referrer);
      checkDomains.push(referrerUrl.hostname);
    }
  } catch (e) {
    // Cross-origin iframe, can't access parent
  }

  const result = await chrome.storage.local.get(['whitelist', 'profile', 'canonicalProfile']);
  const whitelist = result.whitelist || [];

  // Check if any of our domains are whitelisted
  const isWhitelisted = checkDomains.some(d => whitelist.includes(d)) ||
    whitelist.some(w => checkDomains.some(d => d.includes(w) || w.includes(d)));

  if (!isWhitelisted) return;

  const profile = result.profile || {};
  const canonicalProfile = result.canonicalProfile || {};

  // Initial processing with retry for dynamically loaded content
  let retries = 0;
  const maxRetries = 5;

  function attemptProcess() {
    const fieldCount = document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input:not([type]), textarea').length;
    if (fieldCount > 0 || retries >= maxRetries) {
      processAllFields(domain, profile, canonicalProfile);
    } else {
      retries++;
      setTimeout(attemptProcess, 500);
    }
  }

  attemptProcess();

  // Watch for dynamically added fields
  const observer = new MutationObserver((mutations) => {
    let hasNewFields = false;
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1 && node.querySelectorAll) {
          const inputs = node.querySelectorAll('input, textarea, select');
          if (inputs.length > 0) hasNewFields = true;
        }
      });
    });
    if (hasNewFields) {
      setTimeout(() => processAllFields(domain, profile, canonicalProfile), 100);
    }
  });

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }
})();

function processAllFields(domain, profile, canonicalProfile) {
  // Text inputs and textareas
  document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input:not([type]), textarea').forEach(field => {
    if (field.offsetParent === null) return;
    if (field.readOnly || field.disabled) return;
    if (field.type === 'hidden' || field.type === 'submit' || field.type === 'button') return;
    processTextField(field, domain, profile, canonicalProfile);
  });

  // Select dropdowns
  document.querySelectorAll('select').forEach(field => {
    if (field.disabled) return;
    processSelectField(field, domain);
  });

  // Radio buttons
  const processedRadioGroups = new Set();
  document.querySelectorAll('input[type="radio"]').forEach(radio => {
    if (radio.disabled) return;
    const name = radio.name || radio.id;
    if (name && !processedRadioGroups.has(name)) {
      processedRadioGroups.add(name);
      processRadioGroup(name, domain);
    }
  });

  // Checkboxes - handle groups (same name) separately from individual checkboxes
  const processedCheckboxGroups = new Set();
  document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    if (checkbox.disabled) return;
    const name = checkbox.name;

    // Check if this is part of a group (multiple checkboxes with same name)
    if (name) {
      const group = document.querySelectorAll(`input[type="checkbox"][name="${CSS.escape(name)}"]`);
      if (group.length > 1) {
        // It's a group - process once per group
        if (!processedCheckboxGroups.has(name)) {
          processedCheckboxGroups.add(name);
          processCheckboxGroup(name, domain);
        }
        return;
      }
    }

    // Individual checkbox
    processCheckboxField(checkbox, domain);
  });
}

/**
 * MAIN TEXT FIELD PROCESSING LOGIC
 * Priority order:
 * 1. Site-specific saved answer (exact match from previous fill)
 * 2. Generic saved answer (same field type across different sites)
 * 3. Canonical profile data (based on field label matching)
 * 4. Basic profile data (name, email, phone, linkedin, github)
 * 5. Show AI icon for unfilled fields
 */
async function processTextField(field, domain, profile, canonicalProfile) {
  if (field.dataset.autofillProcessed) return;
  field.dataset.autofillProcessed = 'true';

  const label = extractFieldLabel(field);
  const fieldType = field.tagName.toLowerCase() === 'textarea' ? 'textarea' : 'input';
  const siteFieldKey = `${domain}::${normalizeLabel(label)}::${fieldType}`;

  // Match label to canonical key using synonyms dictionary
  const canonicalKey = window.matchCanonicalField ? window.matchCanonicalField(label) : null;

  // Always add blur listener to save manual edits
  addSaveOnBlur(field, siteFieldKey, canonicalKey);

  // 1. Check for site-specific saved answer
  const siteAnswer = await getSiteAnswer(siteFieldKey);
  if (siteAnswer && isValidForField(siteAnswer, canonicalKey)) {
    fillField(field, siteAnswer, { source: 'site-saved', siteFieldKey, canonicalKey });
    console.log(`[Autofill] Filled from site-saved: ${label}`);
    return;
  }

  // 2. Check for generic saved answer (cross-site reuse)
  if (canonicalKey) {
    const genericAnswer = await getGenericAnswer(canonicalKey);
    if (genericAnswer && isValidForField(genericAnswer, canonicalKey)) {
      fillField(field, genericAnswer, { source: 'generic-saved', siteFieldKey, canonicalKey });
      console.log(`[Autofill] Filled from generic-saved (${canonicalKey}): ${label}`);
      return;
    }
  }

  // 3. Get value from canonical profile based on matched key
  if (canonicalKey && canonicalProfile) {
    const canonicalValue = getCanonicalValue(canonicalProfile, canonicalKey);
    if (canonicalValue && isValidForField(canonicalValue, canonicalKey)) {
      fillField(field, canonicalValue, { source: 'canonical', siteFieldKey, canonicalKey });
      await saveAnswer(siteFieldKey, canonicalKey, canonicalValue);
      console.log(`[Autofill] Filled from canonical (${canonicalKey}): ${label}`);
      return;
    }
  }

  // 4. Try basic profile fields (name, email, phone, linkedin, github)
  const basicValue = getBasicProfileValue(label, profile);
  if (basicValue && isValidForField(basicValue, canonicalKey)) {
    fillField(field, basicValue, { source: 'basic-profile', siteFieldKey, canonicalKey });
    await saveAnswer(siteFieldKey, canonicalKey, basicValue);
    console.log(`[Autofill] Filled from basic-profile: ${label}`);
    return;
  }

  // 5. Field not filled - show AI icon for all unfilled fields
  addAIIcon(field, siteFieldKey, label, canonicalKey);
  console.log(`[Autofill] No match, AI icon shown: ${label}`);
}

// ============== STORAGE HELPERS ==============

// Get site-specific saved answer
async function getSiteAnswer(siteFieldKey) {
  try {
    const result = await chrome.storage.local.get(['fieldAnswers']);
    const fieldAnswers = result.fieldAnswers || {};
    return fieldAnswers[siteFieldKey] || null;
  } catch (e) {
    return null;
  }
}

// Get generic (cross-site) saved answer
async function getGenericAnswer(canonicalKey) {
  try {
    const result = await chrome.storage.local.get(['genericFieldAnswers']);
    const genericAnswers = result.genericFieldAnswers || {};
    return genericAnswers[canonicalKey] || null;
  } catch (e) {
    return null;
  }
}

// Save answer to both site-specific and generic storage
async function saveAnswer(siteFieldKey, canonicalKey, value) {
  try {
    await chrome.runtime.sendMessage({
      action: 'saveFieldAnswer',
      fieldKey: siteFieldKey,
      answer: value,
      genericKey: canonicalKey || null
    });
  } catch (e) {
    console.error('[Autofill] Error saving answer:', e);
  }
}

// ============== VALUE EXTRACTION ==============

// Get value from canonical profile using the canonical key
function getCanonicalValue(canonicalProfile, canonicalKey) {
  if (!canonicalProfile || !canonicalKey) return null;

  // Map canonical keys to profile paths
  const keyMappings = {
    // Identity
    first_name: () => canonicalProfile.identity?.first_name,
    middle_name: () => canonicalProfile.identity?.middle_name,
    last_name: () => canonicalProfile.identity?.last_name,
    full_name: () => canonicalProfile.identity?.full_name,
    email: () => canonicalProfile.identity?.email,
    phone: () => canonicalProfile.identity?.phone,
    location_city: () => canonicalProfile.identity?.location_city,
    location_state: () => canonicalProfile.identity?.location_state,
    location_country: () => canonicalProfile.identity?.location_country,
    current_location: () => {
      const city = canonicalProfile.identity?.location_city;
      const state = canonicalProfile.identity?.location_state;
      return city && state ? `${city}, ${state}` : city || state || null;
    },
    linkedin_url: () => canonicalProfile.identity?.linkedin_url,
    github_url: () => canonicalProfile.identity?.github_url,
    portfolio_url: () => canonicalProfile.identity?.portfolio_url,

    // Professional
    current_title: () => canonicalProfile.professional_summary?.current_title,
    current_company: () => canonicalProfile.professional_summary?.current_company,
    years_of_experience: () => canonicalProfile.professional_summary?.years_of_experience,

    // Skills - join arrays
    skills: () => {
      const skills = canonicalProfile.skills?.programming_languages || [];
      return skills.length > 0 ? skills.join(', ') : null;
    },
    programming_languages: () => {
      const langs = canonicalProfile.skills?.programming_languages || [];
      return langs.length > 0 ? langs.join(', ') : null;
    },

    // Education
    highest_degree: () => canonicalProfile.education?.[0]?.degree,
    field_of_study: () => canonicalProfile.education?.[0]?.field_of_study,
    institution: () => canonicalProfile.education?.[0]?.institution,
    graduation_year: () => canonicalProfile.education?.[0]?.graduation_year,

    // Previous employment (from experience array)
    previous_title: () => canonicalProfile.experience?.[0]?.title,
    previous_company: () => canonicalProfile.experience?.[0]?.company,
  };

  const getter = keyMappings[canonicalKey];
  if (getter) {
    const value = getter();
    if (value !== null && value !== undefined && value !== '') {
      return String(value);
    }
  }

  return null;
}

// Get basic profile values (simple name, email, phone, linkedin, github)
function getBasicProfileValue(label, profile) {
  if (!profile || !label) return null;

  const normalized = normalizeLabel(label);

  // Full name
  if (normalized === 'name' || normalized.includes('full_name') || normalized.includes('your_name')) {
    const fn = profile.firstName || '';
    const ln = profile.lastName || '';
    return `${fn} ${ln}`.trim() || null;
  }

  // First name
  if (normalized.includes('first') && normalized.includes('name')) {
    return profile.firstName || null;
  }

  // Last name
  if (normalized.includes('last') && normalized.includes('name')) {
    return profile.lastName || null;
  }

  // Email
  if (normalized.includes('email')) {
    return profile.email || null;
  }

  // Phone
  if (normalized.includes('phone') || normalized.includes('mobile') || normalized.includes('tel')) {
    return profile.phone || null;
  }

  // LinkedIn
  if (normalized.includes('linkedin')) {
    return profile.linkedin || null;
  }

  // GitHub
  if (normalized.includes('github')) {
    return profile.github || null;
  }

  return null;
}

// ============== VALIDATION ==============

// Validate value is appropriate for the field type
function isValidForField(value, canonicalKey) {
  if (!value || String(value).trim() === '') return false;

  const v = String(value).trim();

  // Use window.isValidValueForKey if available (from fieldMatcher.js)
  if (canonicalKey && window.isValidValueForKey) {
    return window.isValidValueForKey(v, canonicalKey);
  }

  // Fallback validation
  const isUrl = /^https?:\/\//i.test(v) || /^www\./i.test(v);
  const isEmailVal = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(v);

  // If canonical key expects a specific type, validate
  if (canonicalKey) {
    const urlKeys = ['linkedin_url', 'github_url', 'portfolio_url', 'twitter_url', 'personal_website'];
    const emailKeys = ['email'];
    const nameKeys = ['first_name', 'last_name', 'full_name', 'preferred_name', 'middle_name'];

    if (urlKeys.includes(canonicalKey)) {
      return isUrl;
    }
    if (emailKeys.includes(canonicalKey)) {
      return isEmailVal;
    }
    if (nameKeys.includes(canonicalKey)) {
      // Names should NOT be URLs or emails
      return !isUrl && !isEmailVal && v.split(/\s+/).length <= 5;
    }
  }

  return v.length > 0;
}

// ============== SAVE ON BLUR ==============

function addSaveOnBlur(field, siteFieldKey, canonicalKey) {
  if (field.dataset.hasBlurListener) return;
  field.dataset.hasBlurListener = 'true';

  let lastSavedValue = field.value;

  field.addEventListener('blur', async () => {
    const value = field.value.trim();
    if (value.length > 0 && value !== lastSavedValue) {
      lastSavedValue = value;
      await saveAnswer(siteFieldKey, canonicalKey, value);
      console.log(`[Autofill] Saved on blur: ${siteFieldKey}`);
    }
  });
}

// Handle SELECT dropdowns
async function processSelectField(field, domain) {
  if (field.dataset.autofillProcessed) return;
  field.dataset.autofillProcessed = 'true';

  const label = extractFieldLabel(field);
  const siteFieldKey = `${domain}::${normalizeLabel(label)}::select`;
  const canonicalKey = window.matchCanonicalField ? window.matchCanonicalField(label) : null;

  // Try to restore saved selection (site-specific first, then generic)
  let savedAnswer = await getSiteAnswer(siteFieldKey);
  if (!savedAnswer && canonicalKey) {
    savedAnswer = await getGenericAnswer(canonicalKey);
  }

  if (savedAnswer) {
    const option = Array.from(field.options).find(opt =>
      opt.value === savedAnswer ||
      opt.text === savedAnswer ||
      opt.value.toLowerCase() === savedAnswer.toLowerCase() ||
      opt.text.toLowerCase() === savedAnswer.toLowerCase()
    );
    if (option) {
      field.value = option.value;
      field.dispatchEvent(new Event('change', { bubbles: true }));
      console.log(`[Autofill] Restored select: ${label}`);
    }
  }

  // Save on change
  field.addEventListener('change', async () => {
    const selectedOption = field.options[field.selectedIndex];
    if (selectedOption && selectedOption.value) {
      await saveAnswer(siteFieldKey, canonicalKey, selectedOption.value);
      console.log(`[Autofill] Saved select: ${label} = ${selectedOption.value}`);
    }
  });
}

// Handle RADIO button groups
async function processRadioGroup(name, domain) {
  const radios = document.querySelectorAll(`input[type="radio"][name="${name}"]`);
  if (radios.length === 0) return;

  const firstRadio = radios[0];
  if (firstRadio.dataset.autofillGroupProcessed) return;
  firstRadio.dataset.autofillGroupProcessed = 'true';

  const label = extractFieldLabel(firstRadio) || name;
  const siteFieldKey = `${domain}::${normalizeLabel(label)}::radio`;
  const canonicalKey = window.matchCanonicalField ? window.matchCanonicalField(label) : null;

  // Try to restore saved selection
  let savedAnswer = await getSiteAnswer(siteFieldKey);
  if (!savedAnswer && canonicalKey) {
    savedAnswer = await getGenericAnswer(canonicalKey);
  }

  if (savedAnswer) {
    const matchingRadio = Array.from(radios).find(r =>
      r.value === savedAnswer ||
      r.id === savedAnswer ||
      r.value.toLowerCase() === savedAnswer.toLowerCase()
    );
    if (matchingRadio) {
      matchingRadio.checked = true;
      matchingRadio.dispatchEvent(new Event('change', { bubbles: true }));
      console.log(`[Autofill] Restored radio: ${label}`);
    }
  }

  // Save on change
  radios.forEach(radio => {
    radio.addEventListener('change', async () => {
      if (radio.checked) {
        await saveAnswer(siteFieldKey, canonicalKey, radio.value);
        console.log(`[Autofill] Saved radio: ${label} = ${radio.value}`);
      }
    });
  });
}

// Handle CHECKBOX fields
async function processCheckboxField(field, domain) {
  if (field.dataset.autofillProcessed) return;
  field.dataset.autofillProcessed = 'true';

  const label = extractFieldLabel(field);
  const siteFieldKey = `${domain}::${normalizeLabel(label)}::checkbox`;
  const canonicalKey = window.matchCanonicalField ? window.matchCanonicalField(label) : null;

  // Try to restore saved selection (site-specific first, then generic)
  let savedAnswer = await getSiteAnswer(siteFieldKey);
  if (savedAnswer === null && canonicalKey) {
    savedAnswer = await getGenericAnswer(canonicalKey);
  }

  // Restore checkbox state
  if (savedAnswer !== null) {
    const shouldBeChecked = savedAnswer === true || savedAnswer === 'true' || savedAnswer === '1' || savedAnswer === 'yes';
    if (field.checked !== shouldBeChecked) {
      field.checked = shouldBeChecked;
      field.dispatchEvent(new Event('change', { bubbles: true }));
      console.log(`[Autofill] Restored checkbox: ${label} = ${shouldBeChecked}`);
    }
  }

  // Save on change
  field.addEventListener('change', async () => {
    await saveAnswer(siteFieldKey, canonicalKey, field.checked);
    console.log(`[Autofill] Saved checkbox: ${label} = ${field.checked}`);
  });
}

// Handle CHECKBOX groups (multiple checkboxes with same name, like multi-select)
async function processCheckboxGroup(name, domain) {
  const checkboxes = document.querySelectorAll(`input[type="checkbox"][name="${name}"]`);
  if (checkboxes.length <= 1) return; // Single checkbox handled by processCheckboxField

  const firstCheckbox = checkboxes[0];
  if (firstCheckbox.dataset.autofillGroupProcessed) return;
  firstCheckbox.dataset.autofillGroupProcessed = 'true';

  const label = extractFieldLabel(firstCheckbox) || name;
  const siteFieldKey = `${domain}::${normalizeLabel(label)}::checkbox_group`;
  const canonicalKey = window.matchCanonicalField ? window.matchCanonicalField(label) : null;

  // Try to restore saved selections (stored as array of values)
  let savedAnswer = await getSiteAnswer(siteFieldKey);
  if (!savedAnswer && canonicalKey) {
    savedAnswer = await getGenericAnswer(canonicalKey);
  }

  if (savedAnswer) {
    const selectedValues = Array.isArray(savedAnswer) ? savedAnswer : [savedAnswer];
    checkboxes.forEach(cb => {
      const shouldBeChecked = selectedValues.includes(cb.value);
      if (cb.checked !== shouldBeChecked) {
        cb.checked = shouldBeChecked;
        cb.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    console.log(`[Autofill] Restored checkbox group: ${label}`);
  }

  // Save on change - collect all checked values
  checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', async () => {
      const checkedValues = Array.from(checkboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);
      await saveAnswer(siteFieldKey, canonicalKey, checkedValues);
      console.log(`[Autofill] Saved checkbox group: ${label} = ${checkedValues.join(', ')}`);
    });
  });
}

// Add AI icon for ALL unfilled fields (not just essay questions)
function addAIIcon(field, siteFieldKey, label, canonicalKey) {
  if (field.dataset.hasAiIcon) return;
  field.dataset.hasAiIcon = 'true';

  const icon = document.createElement('span');
  icon.innerHTML = '✨';
  icon.style.cssText = `
    position: absolute;
    cursor: pointer;
    font-size: 14px;
    z-index: 10000;
    user-select: none;
    padding: 2px 4px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 4px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    color: white;
  `;
  icon.title = 'Click to generate with AI';

  const rect = field.getBoundingClientRect();
  icon.style.left = `${rect.right + window.scrollX - 28}px`;
  icon.style.top = `${rect.top + window.scrollY + 4}px`;

  icon.addEventListener('click', async () => {
    icon.innerHTML = '⏳';
    icon.style.background = '#888';

    try {
      const company = extractCompanyName();
      const role = extractRoleName();

      const response = await chrome.runtime.sendMessage({
        action: 'generateAnswer',
        fieldLabel: label,
        company: company,
        role: role
      });

      if (response.success) {
        fillField(field, response.answer, { source: 'ai', siteFieldKey, canonicalKey });
        await saveAnswer(siteFieldKey, canonicalKey, response.answer);
        icon.remove();
      } else {
        icon.innerHTML = '❌';
        icon.style.background = '#e74c3c';
        setTimeout(() => {
          icon.innerHTML = '✨';
          icon.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        }, 2000);
      }
    } catch (error) {
      console.error('[Autofill] AI generation error:', error);
      icon.innerHTML = '❌';
      icon.style.background = '#e74c3c';
      setTimeout(() => {
        icon.innerHTML = '✨';
        icon.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
      }, 2000);
    }
  });

  document.body.appendChild(icon);

  const updateIconPosition = () => {
    const rect = field.getBoundingClientRect();
    icon.style.left = `${rect.right + window.scrollX - 28}px`;
    icon.style.top = `${rect.top + window.scrollY + 4}px`;
  };

  window.addEventListener('scroll', updateIconPosition);
  window.addEventListener('resize', updateIconPosition);
}

function fillField(field, value, meta = {}) {
  field.value = value;
  field.dispatchEvent(new Event('input', { bubbles: true }));
  field.dispatchEvent(new Event('change', { bubbles: true }));
  field.dispatchEvent(new Event('blur', { bubbles: true }));

  // Conditional debug logging when enabled in storage
  try {
    chrome.storage.local.get(['autofillLogging']).then(cfg => {
      if (!cfg.autofillLogging) return;
      const info = getNearestLabelInfo(field) || {};
      const log = {
        time: new Date().toISOString(),
        field: {
          id: field.id || null,
          name: field.name || null,
          type: field.type || field.tagName,
        },
        nearestLabel: info,
        meta: meta,
        value: value
      };
      try {
        console.groupCollapsed && console.groupCollapsed('[Autofill] Filled field', field.id || field.name || '(unknown)');
        console.log(log);
        console.groupEnd && console.groupEnd();
      } catch (e) {
        console.log('[Autofill]', log);
      }
    }).catch(() => { });
  } catch (e) {
    // ignore logging errors
  }
}

// ============== UTILITY FUNCTIONS ==============

function getNearestLabelInfo(element) {
  try {
    // label for attribute
    if (element.id) {
      const lab = document.querySelector(`label[for="${element.id}"]`);
      if (lab) return { id: lab.id || null, name: lab.getAttribute('name') || null, text: lab.innerText.trim() };
    }

    // ancestor label
    const anc = element.closest('label');
    if (anc) return { id: anc.id || null, name: anc.getAttribute('name') || null, text: anc.innerText.trim() };

    // nearby label or heading
    const nearby = element.parentElement && element.parentElement.querySelector ? element.parentElement.querySelector('label, h1, h2, h3') : null;
    if (nearby) return { id: nearby.id || null, name: nearby.getAttribute('name') || null, text: (nearby.innerText || '').trim() };

    // fallback: search for any label in document that contains the element (by proximity)
    const labels = Array.from(document.querySelectorAll('label')).map(l => ({ el: l, rect: l.getBoundingClientRect() }));
    const rect = element.getBoundingClientRect ? element.getBoundingClientRect() : null;
    if (rect && labels.length) {
      // find label with minimal vertical distance
      labels.sort((a, b) => Math.abs(a.rect.top - rect.top) - Math.abs(b.rect.top - rect.top));
      const l = labels[0].el;
      return { id: l.id || null, name: l.getAttribute('name') || null, text: (l.innerText || '').trim() };
    }
  } catch (e) {
    // ignore
  }
  return null;
}

function looksLikeName(text) {
  if (!text) return false;
  // Remove labels like "Name:" if present
  const cleaned = text.replace(/name[:\s]*$/i, '').trim();
  // exclude URLs
  if (/https?:\/\//i.test(cleaned) || /www\./i.test(cleaned)) return false;
  // Simple heuristic: two words, each starting with uppercase letter
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length >= 2 && words.length <= 4) {
    const capitalized = words.filter(w => /^[A-Z][a-z]/.test(w)).length;
    if (capitalized >= 1) return true;
  }
  // Or contains comma-separated Last, First
  if (/^[A-Z][a-z]+,\s*[A-Z][a-z]+/.test(cleaned)) return true;
  return false;
}

function isURL(str) {
  if (!str) return false;
  return /https?:\/\//i.test(str) || /www\./i.test(str);
}

function isEmail(str) {
  if (!str) return false;
  return /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(str);
}

function isPhone(str) {
  if (!str) return false;
  return /(\+?\d[\d ()-]{6,}\d)/.test(str);
}

function isNameValue(str) {
  if (!str) return false;
  const cleaned = str.trim();
  if (isURL(cleaned) || isEmail(cleaned) || isPhone(cleaned)) return false;
  const words = cleaned.split(/\s+/).filter(Boolean);
  return words.length >= 1 && words.length <= 4;
}

function isValueValidForCanonicalKey(value, canonicalKey) {
  if (!value || !canonicalKey) return false;
  const v = (value || '').trim();
  // url fields
  if (canonicalKey.endsWith('_url') || canonicalKey.includes('linkedin') || canonicalKey.includes('github') || canonicalKey.includes('portfolio')) {
    return isURL(v);
  }
  if (canonicalKey === 'email') return isEmail(v);
  if (canonicalKey === 'phone') return isPhone(v);
  if (canonicalKey === 'first_name' || canonicalKey === 'last_name' || canonicalKey === 'full_name') return isNameValue(v);
  // default: accept non-empty
  return v.length > 0;
}



function extractCompanyName() {
  const titleElement = document.querySelector('title');
  if (titleElement) {
    const title = titleElement.textContent;
    const match = title.match(/(.+?)\s*[-|–]/);
    if (match) return match[1].trim();
  }

  const h1 = document.querySelector('h1');
  if (h1) return h1.textContent.trim();

  return window.location.hostname.split('.')[0];
}

function extractRoleName() {
  const selectors = [
    '[class*="job-title"]',
    '[class*="position"]',
    '[class*="role"]',
    'h1', 'h2'
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      const text = element.textContent.trim();
      if (text.length > 0 && text.length < 100) {
        return text;
      }
    }
  }

  return 'Unknown';
}

function generateFieldKey(domain, label, fieldType) {
  const normalizedLabel = normalizeLabel(label);
  return `${domain}::${normalizedLabel}::${fieldType}`;
}

function normalizeLabel(label) {
  if (!label) return 'unknown';
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').substring(0, 100);
}

/**
 * Extract the most meaningful label for a form field.
 * Priority order:
 * 1. Explicit ARIA labels (aria-label, aria-labelledby)
 * 2. data-* attributes (data-label, data-field-name, data-qa, data-testid)
 * 3. Associated <label> element (via for/id or for/name)
 * 4. Placeholder text
 * 5. Title attribute
 * 6. Parent traversal (up to 5 levels) - looking for labels, headings, legend
 * 7. Sibling inspection (previous siblings that look like labels)
 * 8. Proximity-based detection (visually nearest label)
 * 9. Fallback to name/id attributes
 */
function extractFieldLabel(element) {
  // 1. ARIA labels (highest priority - most accessible)
  if (element.getAttribute('aria-label')) {
    return element.getAttribute('aria-label');
  }

  // aria-labelledby can reference multiple elements
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const labelText = labelledBy.split(/\s+/)
      .map(id => document.getElementById(id))
      .filter(el => el)
      .map(el => el.textContent.trim())
      .join(' ');
    if (labelText) return labelText;
  }

  // aria-describedby as fallback
  const describedBy = element.getAttribute('aria-describedby');
  if (describedBy) {
    const descText = describedBy.split(/\s+/)
      .map(id => document.getElementById(id))
      .filter(el => el)
      .map(el => el.textContent.trim())
      .join(' ');
    if (descText && descText.length < 100) return descText;
  }

  // 2. data-* attributes (common in modern frameworks)
  const dataAttrs = ['data-label', 'data-field-name', 'data-field-label', 'data-name',
    'data-qa', 'data-testid', 'data-test-id', 'data-cy', 'data-automation'];
  for (const attr of dataAttrs) {
    const val = element.getAttribute(attr);
    if (val && val.length > 1 && val.length < 100) {
      // Clean up test IDs like "input-first-name" -> "first name"
      return val.replace(/[-_]/g, ' ').replace(/^(input|field|txt|text)\s*/i, '').trim();
    }
  }

  // 3. Associated <label> via for attribute
  if (element.id) {
    const label = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
    if (label) return cleanLabelText(label.textContent);
  }
  if (element.name) {
    const label = document.querySelector(`label[for="${CSS.escape(element.name)}"]`);
    if (label) return cleanLabelText(label.textContent);
  }

  // 4. Placeholder text
  if (element.placeholder && element.placeholder.length > 1) {
    return element.placeholder;
  }

  // 5. Title attribute
  if (element.title && element.title.length > 1 && element.title.length < 100) {
    return element.title;
  }

  // 6. Parent traversal - deeper (up to 5 levels)
  let current = element.parentElement;
  for (let depth = 0; depth < 5 && current; depth++) {
    // Check if current is a label wrapping the input
    if (current.tagName === 'LABEL') {
      const text = getDirectTextContent(current);
      if (text) return text;
    }

    // Look for fieldset > legend
    if (current.tagName === 'FIELDSET') {
      const legend = current.querySelector('legend');
      if (legend) return cleanLabelText(legend.textContent);
    }

    // Look for label as direct child (before or after input)
    const directLabel = current.querySelector(':scope > label');
    if (directLabel && !directLabel.contains(element)) {
      return cleanLabelText(directLabel.textContent);
    }

    // Look for common label-like elements
    const labelSelectors = [
      ':scope > label',
      ':scope > .label',
      ':scope > .form-label',
      ':scope > .field-label',
      ':scope > .input-label',
      ':scope > span.label',
      ':scope > div.label'
    ];
    for (const sel of labelSelectors) {
      try {
        const labelEl = current.querySelector(sel);
        if (labelEl && !labelEl.contains(element)) {
          const text = cleanLabelText(labelEl.textContent);
          if (text) return text;
        }
      } catch (e) { /* ignore invalid selectors */ }
    }

    // Look for heading elements that might be labeling a form section
    const heading = current.querySelector(':scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > h6');
    if (heading) {
      const text = cleanLabelText(heading.textContent);
      if (text && text.length < 50) return text;
    }

    // Check for direct text nodes in this container
    const directText = getDirectTextContent(current);
    if (directText && directText.length > 1 && directText.length < 100) {
      return directText;
    }

    current = current.parentElement;
  }

  // 7. Sibling inspection - check previous siblings
  let sibling = element.previousElementSibling;
  for (let i = 0; i < 3 && sibling; i++) {
    if (sibling.tagName === 'LABEL' ||
      sibling.classList.contains('label') ||
      sibling.classList.contains('form-label')) {
      return cleanLabelText(sibling.textContent);
    }
    // Check if sibling is a span/div with label-like text
    if ((sibling.tagName === 'SPAN' || sibling.tagName === 'DIV') &&
      sibling.textContent.trim().length < 100) {
      const text = cleanLabelText(sibling.textContent);
      if (text && looksLikeLabel(text)) return text;
    }
    sibling = sibling.previousElementSibling;
  }

  // 8. Proximity-based detection - find visually nearest label
  const nearestLabel = findNearestLabelByProximity(element);
  if (nearestLabel) return nearestLabel;

  // 9. Fallback to name/id (clean them up)
  if (element.name) {
    return cleanAttributeName(element.name);
  }
  if (element.id) {
    return cleanAttributeName(element.id);
  }

  return 'unknown';
}

// Helper: Get only direct text content (not from child elements)
function getDirectTextContent(element) {
  let text = '';
  for (const node of element.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent;
    }
  }
  return text.trim();
}

// Helper: Clean label text (remove asterisks, colons, extra whitespace)
function cleanLabelText(text) {
  if (!text) return '';
  return text
    .replace(/\*+/g, '')           // Remove asterisks (required field markers)
    .replace(/:\s*$/, '')          // Remove trailing colons
    .replace(/\s+/g, ' ')          // Normalize whitespace
    .trim();
}

// Helper: Clean attribute name (convert camelCase, snake_case, kebab-case to readable)
function cleanAttributeName(name) {
  if (!name) return '';
  return name
    .replace(/([a-z])([A-Z])/g, '$1 $2')  // camelCase -> camel Case
    .replace(/[-_]+/g, ' ')                // snake_case, kebab-case -> spaces
    .replace(/^(input|field|txt|text|frm|form)\s*/i, '') // Remove common prefixes
    .trim();
}

// Helper: Check if text looks like a form label
function looksLikeLabel(text) {
  if (!text || text.length < 2 || text.length > 100) return false;
  // Labels typically don't contain these
  if (/^(submit|cancel|reset|save|next|back|previous)$/i.test(text)) return false;
  // Labels typically end with or contain these patterns
  if (/name|email|phone|address|city|state|zip|country|date|time|url|link/i.test(text)) return true;
  // Labels are typically short phrases
  const wordCount = text.split(/\s+/).length;
  return wordCount >= 1 && wordCount <= 6;
}

// Helper: Find the visually nearest label using bounding box proximity
function findNearestLabelByProximity(element) {
  try {
    const rect = element.getBoundingClientRect();
    if (!rect || rect.width === 0) return null;

    // Find all potential label elements
    const candidates = document.querySelectorAll('label, .label, .form-label, [class*="label"]');
    if (candidates.length === 0) return null;

    let nearest = null;
    let minDistance = Infinity;

    for (const candidate of candidates) {
      // Skip if candidate contains the input (it's a wrapper, not a label)
      if (candidate.contains(element)) continue;

      const candidateRect = candidate.getBoundingClientRect();
      if (!candidateRect || candidateRect.width === 0) continue;

      // Calculate distance - prefer labels that are above or to the left
      const dx = candidateRect.right <= rect.left
        ? rect.left - candidateRect.right  // Label is to the left
        : candidateRect.left >= rect.right
          ? candidateRect.left - rect.right  // Label is to the right
          : 0;  // Overlapping horizontally

      const dy = candidateRect.bottom <= rect.top
        ? rect.top - candidateRect.bottom  // Label is above
        : candidateRect.top >= rect.bottom
          ? candidateRect.top - rect.bottom  // Label is below
          : 0;  // Overlapping vertically

      // Weight: prefer labels above or to the left (typical form layout)
      const distance = Math.sqrt(dx * dx + dy * dy);
      const isAboveOrLeft = candidateRect.bottom <= rect.top || candidateRect.right <= rect.left;
      const weightedDistance = isAboveOrLeft ? distance : distance * 1.5;

      // Only consider labels within reasonable distance (200px)
      if (weightedDistance < minDistance && weightedDistance < 200) {
        minDistance = weightedDistance;
        nearest = candidate;
      }
    }

    if (nearest) {
      return cleanLabelText(nearest.textContent);
    }
  } catch (e) {
    // Ignore errors in proximity detection
  }
  return null;
}

