// Smart Job Autofill - Background Service Worker
// Privacy-first: All data stored locally, no tracking, no ads

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  handleMessage(request)
    .then(result => sendResponse(result))
    .catch(error => sendResponse({ success: false, error: error.message }));
  return true;
});

async function handleMessage(request) {
  switch (request.action) {
    case 'structureResume':
      return await handleStructureResume(request.resumeText);
    case 'generateAnswer':
      return await handleGenerateAnswer(request);
    case 'saveFieldAnswer':
      return await handleSaveFieldAnswer(request.fieldKey, request.answer, request.genericKey, request.relatedExperience);
    case 'getFieldAnswer':
      return await handleGetFieldAnswer(request.fieldKey, request.genericKey);
    case 'logAutofill':
      return await handleLogAutofill(request);
    case 'getMappings':
      return await handleGetMappings();
    case 'setMappings':
      return await handleSetMappings(request.mappings || {});
    case 'getLogs':
      return await handleGetLogs();
    case 'clearLogs':
      return await handleClearLogs();
    default:
      throw new Error(`Unknown action: ${request.action}`);
  }
}

// ============================================
// AI PROVIDER CONFIGURATION
// ============================================

async function getActiveAiConfig() {
  const result = await chrome.storage.local.get([
    'openaiApiKey',
    'geminiApiKey',
    'activeAiProvider'
  ]);

  // Determine which provider to use
  let provider = result.activeAiProvider;
  let apiKey = null;

  // If explicit provider set, use that
  if (provider === 'openai' && result.openaiApiKey) {
    apiKey = result.openaiApiKey;
  } else if (provider === 'gemini' && result.geminiApiKey) {
    apiKey = result.geminiApiKey;
  } else {
    // Fallback: use first available key
    if (result.openaiApiKey) {
      provider = 'openai';
      apiKey = result.openaiApiKey;
    } else if (result.geminiApiKey) {
      provider = 'gemini';
      apiKey = result.geminiApiKey;
    }
  }

  return { provider, apiKey };
}

async function handleStructureResume(resumeText) {
  const { provider, apiKey } = await getActiveAiConfig();
  const result = await chrome.storage.local.get(['useLocalStructuring']);
  let profile = null;

  if (result.useLocalStructuring || !apiKey) {
    // Use local resume structuring
    profile = structureResumeLocal(resumeText);
  } else {
    profile = await structureResumeWithAI(resumeText, apiKey, provider);
  }

  // Map lightweight profile into the canonical schema and persist both
  const canonical = mapToCanonicalSchema(profile);

  await chrome.storage.local.set({
    profile: profile,
    canonicalProfile: canonical,
    resumeText: resumeText
  });

  return { success: true, profile, canonicalProfile: canonical };
}

function mapToCanonicalSchema(p) {
  // p may be the result of AI structuring or local structuring
  const canonical = {
    identity: {
      first_name: p.firstName || p.first_name || null,
      middle_name: p.middleName || null,
      last_name: p.lastName || p.last_name || null,
      full_name: ((p.firstName || p.first_name) || '') + (p.lastName || p.last_name ? ' ' + (p.lastName || p.last_name) : ''),
      email: p.email || null,
      phone: p.phone || null,
      location_city: p.location_city || null,
      location_state: p.location_state || null,
      location_country: p.location_country || null,
      linkedin_url: p.linkedin || p.linkedin_url || null,
      github_url: p.github || p.github_url || null,
      portfolio_url: p.portfolio || null
    },
    work_authorization: {
      visa_status: null,
      requires_sponsorship: null,
      authorized_to_work: null,
      relocation_willingness: null,
      remote_preference: null
    },
    professional_summary: {
      headline: p.headline || null,
      summary: p.summary || p.professional_summary || '',
      years_of_experience: p.years || p.years_of_experience || null,
      current_title: p.current_title || p.currentTitle || null,
      current_company: p.current_company || null
    },
    skills: {
      programming_languages: p.skills || [],
      frontend_frameworks: [],
      backend_frameworks: [],
      databases: [],
      cloud_platforms: [],
      devops_tools: [],
      testing_tools: [],
      other_tools: []
    },
    experience: Array.isArray(p.experience) ? p.experience.map(e => ({
      company: e.company || e.company_name || null,
      title: e.role || e.title || null,
      employment_type: e.employment_type || null,
      location: e.location || null,
      start_date: e.start_date || null,
      end_date: e.end_date || null,
      is_current: !!e.current || !!e.is_current || null,
      responsibilities: e.responsibilities || (e.description ? [e.description] : []),
      achievements: e.achievements || [],
      tech_stack: e.tech_stack || []
    })) : [],
    education: Array.isArray(p.education) ? p.education.map(ed => ({ degree: ed.degree || null, field_of_study: ed.field_of_study || null, institution: ed.institution || null, graduation_year: ed.graduation_year || null })) : [],
    projects: Array.isArray(p.projects) ? p.projects.map(pr => ({ name: pr.name || null, description: pr.description || null, technologies: pr.technologies || [], link: pr.link || null })) : [],
    certifications: p.certifications || [],
    compensation: { current_salary: null, expected_salary: null, currency: null },
    availability: { notice_period: null, start_date: null }
  };

  return canonical;
}

// Minimal local resume structuring for background (copied from utils)
function structureResumeLocal(resumeText) {
  const text = (resumeText || '').replace(/\r/g, '\n');
  const lines = text.split(/\n+/).map(l => l.trim()).filter(l => l.length > 0);

  const profile = {
    summary: '',
    skills: [],
    experience: [],
    projects: [],
    education: [],
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    linkedin: '',
    github: ''
  };

  const emailMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  if (emailMatch) profile.email = emailMatch[0];

  const phoneMatch = text.match(/(\+?\d[\d ()-]{6,}\d)/);
  if (phoneMatch) profile.phone = phoneMatch[0].replace(/\s{2,}/g, ' ');

  const linkedinMatch = text.match(/https?:\/\/([\w.-]*\.)?linkedin\.com\/[\w\-\/]+/i);
  if (linkedinMatch) profile.linkedin = linkedinMatch[0];
  const githubMatch = text.match(/https?:\/\/([\w.-]*\.)?github\.com\/[\w\-\/]+/i);
  if (githubMatch) profile.github = githubMatch[0];

  for (let i = 0; i < Math.min(6, lines.length); i++) {
    const l = lines[i];
    if (/email|phone|linkedin|address|summary|experience/i.test(l)) continue;
    const words = l.split(/\s+/).filter(Boolean);
    const capitalized = words.filter(w => /^[A-Z][a-z]+/.test(w));
    if (capitalized.length >= 1 && words.length <= 4) {
      profile.firstName = words[0];
      profile.lastName = words.length > 1 ? words[words.length - 1] : '';
      break;
    }
  }

  const skillLine = lines.find(l => /^(skills?|technical skills|skillset)[:\-\s]/i.test(l));
  if (skillLine) {
    const after = skillLine.split(/[:\-]/).slice(1).join('-');
    profile.skills = after.split(/[;,\|]/).map(s => s.trim()).filter(Boolean);
  } else {
    for (const l of lines) {
      const parts = l.split(',');
      if (parts.length >= 4 && l.length < 200) {
        profile.skills = parts.map(p => p.trim()).slice(0, 30);
        break;
      }
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    let m = l.match(/(.+?)\s+at\s+([A-Z0-9][\w &.-]+)/i);
    if (m) {
      profile.experience.push({ role: m[1].trim(), company: m[2].trim(), description: '' });
      continue;
    }
    m = l.match(/^([A-Z0-9][\w &.-]{2,})\s+[-–|]\s+(.+)$/);
    if (m) {
      profile.experience.push({ company: m[1].trim(), role: m[2].trim(), description: '' });
      continue;
    }
    m = l.match(/^(.+?),\s*([A-Z0-9][\w &.-]{2,})$/);
    if (m) {
      profile.experience.push({ role: m[1].trim(), company: m[2].trim(), description: '' });
      continue;
    }
  }

  for (const l of lines) {
    if (/university|college|b\.?s\.?|m\.?s\.?|bachelor|master|degree|phd/i.test(l)) {
      profile.education.push({ institution: l, degree: '' });
    }
  }

  for (let i = 0; i < Math.min(8, lines.length); i++) {
    const l = lines[i];
    if (l === profile.firstName + ' ' + profile.lastName) continue;
    if (/email|@|phone|linkedin|github|skills?/i.test(l)) continue;
    if (l.length > 30 && l.split(' ').length > 5) {
      profile.summary = l;
      break;
    }
  }

  profile.skills = Array.from(new Set((profile.skills || []).map(s => s.trim()))).filter(Boolean);
  profile.experience = profile.experience.slice(0, 10);
  profile.projects = profile.projects.slice(0, 10);
  profile.education = profile.education.slice(0, 10);

  return profile;
}

async function handleGenerateAnswer(request) {
  const { provider, apiKey } = await getActiveAiConfig();
  const result = await chrome.storage.local.get(['profile']);

  if (!apiKey) {
    throw new Error('No AI API key configured. Please add an OpenAI or Gemini key.');
  }

  if (!result.profile) {
    throw new Error('No resume uploaded');
  }

  // Build a minimal context: use summary + most relevant experience entries only
  const canonical = (await chrome.storage.local.get(['canonicalProfile'])).canonicalProfile || null;
  let summary = result.profile.summary || result.profile.professional_summary || '';
  let experiences = result.profile.experience || [];
  if (canonical && canonical.professional_summary && canonical.professional_summary.summary) {
    summary = canonical.professional_summary.summary;
    experiences = canonical.experience || experiences;
  }

  // If company/role provided, filter matching experiences
  let relevant = experiences || [];
  if (request.company || request.role) {
    const comp = (request.company || '').toLowerCase();
    const role = (request.role || '').toLowerCase();
    relevant = (experiences || []).filter(e => ((e.company || '').toLowerCase().includes(comp) && comp) || ((e.title || e.role || '').toLowerCase().includes(role) && role));
  }
  if (!relevant || relevant.length === 0) relevant = (experiences || []).slice(0, 2);

  const minimalProfile = { professional_summary: { summary }, experience: relevant };

  const answer = await generateAnswer({
    fieldLabel: request.fieldLabel,
    company: request.company,
    role: request.role,
    profile: minimalProfile,
    apiKey,
    provider
  });

  return { success: true, answer };
}

async function handleSaveFieldAnswer(fieldKey, answer) {
  // fieldKey: site-specific key
  // answer: the value to store
  // Optionally support genericKey and relatedExperience when provided by the content script
  const args = Array.from(arguments);
  // fallback if called with object env (older callers)
  let genericKey = null;
  let relatedExperience = null;
  if (args.length >= 3) {
    genericKey = args[2];
  }
  if (args.length >= 4) {
    relatedExperience = args[3];
  }

  // If the caller passed a single object (message with extras), handle it
  if (typeof fieldKey === 'object' && fieldKey !== null) {
    const obj = fieldKey;
    fieldKey = obj.fieldKey;
    answer = obj.answer;
    genericKey = obj.genericKey || null;
    relatedExperience = obj.relatedExperience || null;
  }

  const result = await chrome.storage.local.get(['fieldAnswers', 'genericFieldAnswers', 'experiences']);
  const fieldAnswers = result.fieldAnswers || {};
  const genericFieldAnswers = result.genericFieldAnswers || {};
  const experiences = result.experiences || []; // array of {company, role}
  const siteToGeneric = result.siteToGeneric || {};

  fieldAnswers[fieldKey] = answer;

  // If generic mapping provided, store it for cross-site reuse
  if (genericKey) {
    genericFieldAnswers[genericKey] = answer;
    siteToGeneric[fieldKey] = genericKey;
  }

  // If related experience (company/role) provided, upsert into experiences list
  if (relatedExperience && (relatedExperience.company || relatedExperience.role)) {
    const company = relatedExperience.company || null;
    const role = relatedExperience.role || null;

    // find an existing entry with same company+role or company or role
    const idx = experiences.findIndex(e => (company && e.company === company) || (role && e.role === role));
    if (idx >= 0) {
      experiences[idx] = { company: company || experiences[idx].company, role: role || experiences[idx].role };
    } else {
      experiences.push({ company, role });
    }
  }

  await chrome.storage.local.set({ fieldAnswers, genericFieldAnswers, experiences });
  // persist site->generic mapping
  await chrome.storage.local.set({ siteToGeneric });
  return { success: true };
}

async function handleGetFieldAnswer(fieldKey) {
  // fieldKey may be site-specific; if not found, background may look up a genericKey
  const args = Array.from(arguments);
  let genericKey = null;
  if (args.length >= 2) genericKey = args[1];

  if (typeof fieldKey === 'object' && fieldKey !== null) {
    const obj = fieldKey;
    fieldKey = obj.fieldKey;
    genericKey = obj.genericKey || null;
  }

  const result = await chrome.storage.local.get(['fieldAnswers', 'genericFieldAnswers']);
  const fieldAnswers = result.fieldAnswers || {};
  const genericFieldAnswers = result.genericFieldAnswers || {};
  const siteToGeneric = result.siteToGeneric || {};

  const siteValue = fieldAnswers[fieldKey];
  // If site value absent but we have a mapping from this siteKey -> genericKey, use it
  if (!siteValue && siteToGeneric[fieldKey] && genericFieldAnswers[siteToGeneric[fieldKey]]) {
    return { success: true, answer: genericFieldAnswers[siteToGeneric[fieldKey]] };
  }
  if (siteValue) return { success: true, answer: siteValue };

  if (genericKey && genericFieldAnswers[genericKey]) {
    return { success: true, answer: genericFieldAnswers[genericKey] };
  }

  return { success: true, answer: null };
}

async function handleLogAutofill(payload) {
  try {
    const now = new Date().toISOString();
    const entry = { time: now, payload };
    const result = await chrome.storage.local.get(['autofillLogs']);
    const logs = result.autofillLogs || [];
    logs.push(entry);
    // keep last 500 entries
    const trimmed = logs.slice(-500);
    await chrome.storage.local.set({ autofillLogs: trimmed });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function handleGetMappings() {
  try {
    const result = await chrome.storage.local.get(['fieldAnswers', 'genericFieldAnswers', 'experiences', 'siteToGeneric', 'autofillLogging']);
    return {
      success: true, mappings: {
        fieldAnswers: result.fieldAnswers || {},
        genericFieldAnswers: result.genericFieldAnswers || {},
        experiences: result.experiences || [],
        siteToGeneric: result.siteToGeneric || {},
        autofillLogging: !!result.autofillLogging
      }
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function handleSetMappings(mappings) {
  try {
    const toSet = {};
    if (mappings.fieldAnswers) toSet.fieldAnswers = mappings.fieldAnswers;
    if (mappings.genericFieldAnswers) toSet.genericFieldAnswers = mappings.genericFieldAnswers;
    if (mappings.experiences) toSet.experiences = mappings.experiences;
    if (mappings.siteToGeneric) toSet.siteToGeneric = mappings.siteToGeneric;
    if (typeof mappings.autofillLogging !== 'undefined') toSet.autofillLogging = !!mappings.autofillLogging;
    await chrome.storage.local.set(toSet);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function handleGetLogs() {
  try {
    const result = await chrome.storage.local.get(['autofillLogs']);
    return { success: true, logs: result.autofillLogs || [] };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function handleClearLogs() {
  try {
    await chrome.storage.local.set({ autofillLogs: [] });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ============================================
// MULTI-PROVIDER AI FUNCTIONS
// ============================================

async function structureResumeWithAI(resumeText, apiKey, provider = 'openai') {
  const prompt = `Extract structured information from this resume and return ONLY valid JSON:
{
  "summary": "brief professional summary",
  "skills": ["skill1", "skill2"],
  "experience": [{"company": "", "role": "", "description": ""}],
  "projects": [{"name": "", "description": ""}],
  "education": [{"institution": "", "degree": ""}],
  "firstName": "",
  "lastName": "",
  "email": "",
  "phone": "",
  "linkedin": "",
  "github": ""
}

Resume:
${resumeText.substring(0, 4000)}`;

  const systemPrompt = 'You are a resume parser. Return only valid JSON, no markdown.';

  return await callAI({ prompt, systemPrompt, apiKey, provider, maxTokens: 1500, temperature: 0.3, parseJson: true });
}

async function generateAnswer({ fieldLabel, company, role, profile, apiKey, provider = 'openai' }) {
  // Determine field type for tailored response
  const fieldLower = (fieldLabel || '').toLowerCase();

  let fieldGuidance = '';
  let wordLimit = '80-120 words';

  if (fieldLower.includes('why') && (fieldLower.includes('company') || fieldLower.includes('role') || fieldLower.includes('position') || fieldLower.includes('job') || fieldLower.includes('interested'))) {
    fieldGuidance = 'Focus on genuine interest in the company/role. Mention specific aspects that attract you (mission, products, growth, culture). Connect to your career goals.';
    wordLimit = '100-150 words';
  } else if (fieldLower.includes('strength') || fieldLower.includes('superpower')) {
    fieldGuidance = 'Highlight ONE key strength with a brief, specific example demonstrating impact. Avoid generic claims.';
    wordLimit = '60-100 words';
  } else if (fieldLower.includes('weakness') || fieldLower.includes('improve') || fieldLower.includes('development')) {
    fieldGuidance = 'Share a genuine area of growth (not a strength disguised as weakness). Explain specific steps you are taking to improve.';
    wordLimit = '60-100 words';
  } else if (fieldLower.includes('challenge') || fieldLower.includes('difficult') || fieldLower.includes('obstacle') || fieldLower.includes('problem')) {
    fieldGuidance = 'Use STAR format briefly: Situation, Task, Action, Result. Focus on YOUR specific actions and quantifiable outcomes.';
    wordLimit = '100-150 words';
  } else if (fieldLower.includes('achievement') || fieldLower.includes('accomplishment') || fieldLower.includes('proud')) {
    fieldGuidance = 'Describe ONE specific achievement with measurable impact (numbers, percentages, outcomes). Show your direct contribution.';
    wordLimit = '80-120 words';
  } else if (fieldLower.includes('leadership') || fieldLower.includes('team') || fieldLower.includes('collaboration')) {
    fieldGuidance = 'Provide a specific example of leading or collaborating. Mention team size, your role, and the outcome achieved together.';
    wordLimit = '80-120 words';
  } else if (fieldLower.includes('salary') || fieldLower.includes('compensation') || fieldLower.includes('expectation')) {
    fieldGuidance = 'If providing a range, be reasonable for the role/market. Otherwise, express openness to discuss based on total compensation.';
    wordLimit = '20-40 words';
  } else if (fieldLower.includes('cover letter') || fieldLower.includes('introduction')) {
    fieldGuidance = 'Write a compelling opening paragraph connecting your background to the role. Be enthusiastic but professional.';
    wordLimit = '150-200 words';
  }

  // Format experience details with responsibilities for richer context
  const experienceDetails = (profile.experience || []).slice(0, 3).map(e => {
    const responsibilities = (e.responsibilities || []).slice(0, 2).join('; ');
    return `${e.title || e.role} at ${e.company}${responsibilities ? ': ' + responsibilities : ''}`;
  }).join('\n- ');

  const prompt = `Write a response for a job application form field.

FIELD: "${fieldLabel}"
COMPANY: ${company || 'Not specified'}
ROLE: ${role || 'Not specified'}

CANDIDATE BACKGROUND:
${profile.professional_summary?.summary || 'Experienced professional'}

RELEVANT EXPERIENCE:
- ${experienceDetails || 'See resume'}

INSTRUCTIONS:
${fieldGuidance || 'Provide a direct, relevant answer based on the candidate background.'}

REQUIREMENTS:
- Length: ${wordLimit}
- Tone: Professional, confident, authentic
- Be SPECIFIC: Use concrete examples, metrics, or details from the experience above
- AVOID generic phrases like "passionate about" or "excited to" - show don't tell
- AVOID repeating the same facts across different answers
- Tailor the response to ${company || 'this company'} and ${role || 'this role'} where relevant
- Write in first person as the candidate`;

  const systemPrompt = `You are an expert career coach helping craft compelling job application responses.
Your responses are:
- Specific and evidence-based (using real experience details)
- Varied in structure and vocabulary (never repetitive)
- Professional yet personable
- Concise and impactful
Return ONLY the response text, no preamble or explanation.`;

  return await callAI({ prompt, systemPrompt, apiKey, provider, maxTokens: 300, temperature: 0.7 });
}

// Unified AI call function supporting multiple providers
async function callAI({ prompt, systemPrompt, apiKey, provider, maxTokens, temperature, parseJson = false }) {
  let response;
  let content;

  switch (provider) {
    case 'openai':
      response = await callOpenAI({ prompt, systemPrompt, apiKey, maxTokens, temperature });
      content = response.choices[0].message.content.trim();
      break;

    case 'gemini':
      response = await callGemini({ prompt, systemPrompt, apiKey, maxTokens, temperature });
      content = response.candidates[0].content.parts[0].text.trim();
      break;

    default:
      throw new Error(`Unknown AI provider: ${provider}`);
  }

  if (parseJson) {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : content);
  }

  return content;
}

// OpenAI API call
async function callOpenAI({ prompt, systemPrompt, apiKey, maxTokens, temperature }) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature,
      max_tokens: maxTokens
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'OpenAI API request failed');
  }

  return await response.json();
}

// Google Gemini API call
async function callGemini({ prompt, systemPrompt, apiKey, maxTokens, temperature }) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: `${systemPrompt}\n\n${prompt}` }]
      }],
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens
      }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Gemini API request failed');
  }

  return await response.json();
}
