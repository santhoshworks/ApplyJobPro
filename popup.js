// ============================================
// JobFill AI - Popup Script
// ============================================

// State
let currentDomain = null;
let isWhitelisted = false;

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initProviderTabs();
  initCollapsible();
  initEventListeners();
  loadAllStatus();
});

// ============================================
// TAB NAVIGATION
// ============================================

function initTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabId = tab.dataset.tab;

      // Update tab buttons
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // Update tab content
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      document.getElementById(`tab-${tabId}`).classList.add('active');
    });
  });
}

function initProviderTabs() {
  document.querySelectorAll('.provider-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const provider = tab.dataset.provider;

      // Update provider tabs
      document.querySelectorAll('.provider-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // Update provider config panels
      document.querySelectorAll('.provider-config').forEach(c => c.classList.remove('active'));
      document.getElementById(`config-${provider}`).classList.add('active');
    });
  });
}

function initCollapsible() {
  const header = document.getElementById('debugHeader');
  const content = document.getElementById('debugContent');
  const icon = header.querySelector('.collapse-icon');

  header.addEventListener('click', () => {
    const isExpanded = content.classList.toggle('expanded');
    icon.classList.toggle('expanded', isExpanded);
  });
}

// ============================================
// EVENT LISTENERS
// ============================================

function initEventListeners() {
  // Resume
  document.getElementById('saveResume').addEventListener('click', saveResume);

  // API Keys
  document.getElementById('saveOpenaiKey').addEventListener('click', () => saveApiKey('openai'));
  document.getElementById('saveGeminiKey').addEventListener('click', () => saveApiKey('gemini'));

  // Site toggle
  document.getElementById('toggleSiteBtn').addEventListener('click', toggleCurrentSite);

  // Mappings
  document.getElementById('refreshMappings').addEventListener('click', loadMappings);
  document.getElementById('saveMappings').addEventListener('click', saveMappings);
  document.getElementById('applyGenericToSite').addEventListener('click', applyGenericToSite);
  document.getElementById('refreshLogs').addEventListener('click', loadLogs);
  document.getElementById('clearLogs').addEventListener('click', clearLogs);
}

// ============================================
// RESUME HANDLING
// ============================================

async function saveResume() {
  const resumeText = document.getElementById('resumeText').value.trim();

  if (!resumeText) {
    showStatus('resumeStatus', 'Please paste your resume text', 'error');
    return;
  }

  if (resumeText.length < 100) {
    showStatus('resumeStatus', 'Resume text seems too short', 'error');
    return;
  }

  showStatus('resumeStatus', 'Analyzing resume...', 'loading');

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'structureResume',
      resumeText: resumeText
    });

    if (response.success) {
      showStatus('resumeStatus', '✓ Resume saved and analyzed!', 'success');
      loadAllStatus();
    } else {
      showStatus('resumeStatus', `Error: ${response.error}`, 'error');
    }
  } catch (error) {
    showStatus('resumeStatus', `Error: ${error.message}`, 'error');
  }
}

// ============================================
// API KEY HANDLING (Multi-Provider)
// ============================================

async function saveApiKey(provider) {
  const inputId = `${provider}Key`;
  const apiKey = document.getElementById(inputId).value.trim();

  if (!apiKey) {
    showStatus('apiStatus', 'Please enter an API key', 'error');
    return;
  }

  // Validate key format based on provider
  const validations = {
    openai: { prefix: 'sk-', name: 'OpenAI' },
    gemini: { prefix: 'AIza', name: 'Gemini' }
  };

  const validation = validations[provider];
  if (validation && !apiKey.startsWith(validation.prefix)) {
    showStatus('apiStatus', `Warning: ${validation.name} keys typically start with ${validation.prefix}`, 'error');
    return;
  }

  try {
    // Save the key and set as active provider
    const storageKey = `${provider}ApiKey`;
    await chrome.storage.local.set({
      [storageKey]: apiKey,
      activeAiProvider: provider
    });

    showStatus('apiStatus', `✓ ${validation.name} key saved!`, 'success');
    document.getElementById(inputId).value = '';
    loadAllStatus();
  } catch (error) {
    showStatus('apiStatus', `Error: ${error.message}`, 'error');
  }
}

// ============================================
// SITE TOGGLE
// ============================================

async function toggleCurrentSite() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab.url || tab.url.startsWith('chrome://')) {
      showSiteStatus('Cannot enable on this page', false);
      return;
    }

    const url = new URL(tab.url);
    const domain = url.hostname;

    const result = await chrome.storage.local.get(['whitelist']);
    const whitelist = result.whitelist || [];

    const index = whitelist.indexOf(domain);
    if (index > -1) {
      whitelist.splice(index, 1);
      await chrome.storage.local.set({ whitelist });
    } else {
      whitelist.push(domain);
      await chrome.storage.local.set({ whitelist });
    }

    loadAllStatus();
    await chrome.tabs.reload(tab.id);
  } catch (error) {
    showSiteStatus(`Error: ${error.message}`, false);
  }
}

async function removeSiteFromWhitelist(domain) {
  const result = await chrome.storage.local.get(['whitelist']);
  const whitelist = result.whitelist || [];
  const index = whitelist.indexOf(domain);

  if (index > -1) {
    whitelist.splice(index, 1);
    await chrome.storage.local.set({ whitelist });
    loadAllStatus();
  }
}

// ============================================
// STATUS LOADING
// ============================================

async function loadAllStatus() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Get current domain
    if (tab.url && !tab.url.startsWith('chrome://')) {
      const url = new URL(tab.url);
      currentDomain = url.hostname;
      document.getElementById('currentSiteDomain').textContent = currentDomain;
    } else {
      currentDomain = null;
      document.getElementById('currentSiteDomain').textContent = 'N/A';
    }

    // Get all stored data
    const result = await chrome.storage.local.get([
      'profile',
      'openaiApiKey',
      'geminiApiKey',
      'activeAiProvider',
      'whitelist'
    ]);

    const whitelist = result.whitelist || [];
    isWhitelisted = currentDomain && whitelist.includes(currentDomain);

    // Update site status banner
    updateSiteStatusBanner(isWhitelisted);

    // Update stats
    updateStats(result, whitelist);

    // Update badges
    updateBadges(result);

    // Update whitelist display
    updateWhitelistDisplay(whitelist);

    // Update API key indicators
    updateApiKeyIndicators(result);

  } catch (error) {
    console.error('Error loading status:', error);
  }
}

function updateSiteStatusBanner(isActive) {
  const icon = document.getElementById('siteStatusIcon');
  const btn = document.getElementById('toggleSiteBtn');
  const btnText = document.getElementById('toggleBtnText');
  const message = document.getElementById('siteStatusMessage');

  if (currentDomain === null) {
    icon.className = 'site-icon inactive';
    btn.className = 'site-toggle-btn enable';
    btn.disabled = true;
    btnText.textContent = 'N/A';
    message.textContent = 'Navigate to a job site to enable autofill';
  } else if (isActive) {
    icon.className = 'site-icon active';
    btn.className = 'site-toggle-btn disable';
    btn.disabled = false;
    btnText.textContent = 'Disable';
    message.textContent = '✓ Autofill is active on this site';
  } else {
    icon.className = 'site-icon inactive';
    btn.className = 'site-toggle-btn enable';
    btn.disabled = false;
    btnText.textContent = 'Enable';
    message.textContent = 'Click to enable autofill on this site';
  }
}

function updateStats(result, whitelist) {
  // Resume stat
  const resumeStat = document.getElementById('resumeStatStatus');
  const statResume = document.getElementById('statResume');
  if (result.profile) {
    resumeStat.textContent = '✓';
    statResume.classList.add('ready');
  } else {
    resumeStat.textContent = '—';
    statResume.classList.remove('ready');
  }

  // AI stat
  const aiStat = document.getElementById('aiStatStatus');
  const statAI = document.getElementById('statAI');
  const hasAnyKey = result.openaiApiKey || result.geminiApiKey;
  if (hasAnyKey) {
    const provider = result.activeAiProvider ||
      (result.openaiApiKey ? 'openai' : 'gemini');
    aiStat.textContent = provider.charAt(0).toUpperCase();
    statAI.classList.add('ready');
  } else {
    aiStat.textContent = '—';
    statAI.classList.remove('ready');
  }

  // Sites stat
  document.getElementById('sitesStatStatus').textContent = whitelist.length.toString();
  const statSites = document.getElementById('statSites');
  if (whitelist.length > 0) {
    statSites.classList.add('ready');
  } else {
    statSites.classList.remove('ready');
  }
}

function updateBadges(result) {
  // Resume badge
  const resumeBadge = document.getElementById('resumeBadge');
  if (result.profile) {
    resumeBadge.textContent = 'Uploaded';
    resumeBadge.classList.add('configured');
  } else {
    resumeBadge.textContent = 'Not uploaded';
    resumeBadge.classList.remove('configured');
  }

  // AI badge
  const aiBadge = document.getElementById('aiBadge');
  const hasAnyKey = result.openaiApiKey || result.geminiApiKey;
  if (hasAnyKey) {
    const provider = result.activeAiProvider ||
      (result.openaiApiKey ? 'OpenAI' : 'Gemini');
    aiBadge.textContent = `Using ${provider.charAt(0).toUpperCase() + provider.slice(1)}`;
    aiBadge.classList.add('configured');
  } else {
    aiBadge.textContent = 'Not configured';
    aiBadge.classList.remove('configured');
  }
}

function updateWhitelistDisplay(whitelist) {
  const container = document.getElementById('whitelistContainer');
  const empty = document.getElementById('whitelistEmpty');

  container.innerHTML = '';

  if (whitelist.length === 0) {
    empty.style.display = 'block';
  } else {
    empty.style.display = 'none';
    whitelist.forEach(domain => {
      const item = document.createElement('div');
      item.className = 'whitelist-item';
      item.innerHTML = `
        <span>${domain}</span>
        <button type="button" class="remove-btn" title="Remove">×</button>
      `;
      item.querySelector('.remove-btn').addEventListener('click', () => {
        removeSiteFromWhitelist(domain);
      });
      container.appendChild(item);
    });
  }
}

function updateApiKeyIndicators(result) {
  // OpenAI
  const openaiStatus = document.getElementById('openaiKeyStatus');
  openaiStatus.className = result.openaiApiKey ? 'input-status success' : 'input-status';

  // Gemini
  const geminiStatus = document.getElementById('geminiKeyStatus');
  geminiStatus.className = result.geminiApiKey ? 'input-status success' : 'input-status';

  // If a provider is configured, switch to that tab
  if (result.activeAiProvider) {
    document.querySelectorAll('.provider-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.provider-config').forEach(c => c.classList.remove('active'));

    const activeTab = document.querySelector(`.provider-tab[data-provider="${result.activeAiProvider}"]`);
    const activeConfig = document.getElementById(`config-${result.activeAiProvider}`);
    if (activeTab) activeTab.classList.add('active');
    if (activeConfig) activeConfig.classList.add('active');
  }
}

// ============================================
// STATUS MESSAGES
// ============================================

function showStatus(elementId, message, type) {
  const element = document.getElementById(elementId);
  if (!element) return;
  element.textContent = message;
  element.className = `status-message ${type}`;
}

function showSiteStatus(message, isSuccess) {
  const el = document.getElementById('siteStatusMessage');
  el.textContent = message;
  el.style.color = isSuccess ? 'var(--success)' : 'var(--error)';
}

// ============================================
// MAPPINGS & DEBUG
// ============================================

async function loadMappings() {
  const res = await chrome.runtime.sendMessage({ action: 'getMappings' });
  if (!res.success) {
    showStatus('mappingsStatus', `Error: ${res.error}`, 'error');
    return;
  }

  document.getElementById('genericFieldAnswers').value = JSON.stringify(res.mappings.genericFieldAnswers || {}, null, 2);
  document.getElementById('experiences').value = JSON.stringify(res.mappings.experiences || [], null, 2);
  document.getElementById('siteToGeneric').value = JSON.stringify(res.mappings.siteToGeneric || {}, null, 2);
  document.getElementById('enableLogging').checked = !!res.mappings.autofillLogging;
  showStatus('mappingsStatus', 'Loaded mappings', 'info');
}

async function saveMappings() {
  try {
    const genericFieldAnswers = JSON.parse(document.getElementById('genericFieldAnswers').value || '{}');
    const experiences = JSON.parse(document.getElementById('experiences').value || '[]');
    const siteToGeneric = JSON.parse(document.getElementById('siteToGeneric').value || '{}');
    const autofillLogging = document.getElementById('enableLogging').checked;

    const res = await chrome.runtime.sendMessage({ action: 'setMappings', mappings: { genericFieldAnswers, experiences, siteToGeneric, autofillLogging } });
    if (!res.success) throw new Error(res.error || 'save failed');
    showStatus('mappingsStatus', 'Mappings saved', 'success');
  } catch (e) {
    showStatus('mappingsStatus', `Error: ${e.message}`, 'error');
  }
}

async function applyGenericToSite() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = new URL(tab.url);
    const domain = url.hostname;

    const siteToGeneric = JSON.parse(document.getElementById('siteToGeneric').value || '{}');
    const genericFieldAnswers = JSON.parse(document.getElementById('genericFieldAnswers').value || '{}');

    for (const gKey of Object.keys(genericFieldAnswers)) {
      const siteKey = `${domain}::${gKey}::input`;
      siteToGeneric[siteKey] = gKey;
    }

    const res = await chrome.runtime.sendMessage({ action: 'setMappings', mappings: { siteToGeneric } });
    if (!res.success) throw new Error(res.error || 'apply failed');
    showStatus('mappingsStatus', `Applied generic mappings to ${domain}`, 'success');
    loadMappings();
    await chrome.tabs.reload(tab.id);
  } catch (e) {
    showStatus('mappingsStatus', `Error: ${e.message}`, 'error');
  }
}

async function loadLogs() {
  const res = await chrome.runtime.sendMessage({ action: 'getLogs' });
  if (!res.success) {
    document.getElementById('logs').textContent = `Error: ${res.error}`;
    return;
  }
  const logs = res.logs || [];
  document.getElementById('logs').textContent = logs.map(l => JSON.stringify(l, null, 2)).reverse().join('\n\n');
}

async function clearLogs() {
  await chrome.runtime.sendMessage({ action: 'clearLogs' });
  loadLogs();
}

// Initial load
loadMappings();
loadLogs();
