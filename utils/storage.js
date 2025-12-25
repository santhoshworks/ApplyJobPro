async function saveFieldAnswer(fieldKey, answer) {
  try {
    const result = await chrome.storage.local.get(['fieldAnswers']);
    const fieldAnswers = result.fieldAnswers || {};

    fieldAnswers[fieldKey] = answer;

    await chrome.storage.local.set({ fieldAnswers });
    return true;
  } catch (error) {
    throw new Error(`Failed to save field answer: ${error.message}`);
  }
}

async function getFieldAnswer(fieldKey) {
  try {
    const result = await chrome.storage.local.get(['fieldAnswers']);
    const fieldAnswers = result.fieldAnswers || {};
    return fieldAnswers[fieldKey] || null;
  } catch (error) {
    throw new Error(`Failed to get field answer: ${error.message}`);
  }
}

async function getAllFieldAnswers() {
  try {
    const result = await chrome.storage.local.get(['fieldAnswers']);
    return result.fieldAnswers || {};
  } catch (error) {
    throw new Error(`Failed to get all field answers: ${error.message}`);
  }
}

async function clearFieldAnswers() {
  try {
    await chrome.storage.local.set({ fieldAnswers: {} });
    return true;
  } catch (error) {
    throw new Error(`Failed to clear field answers: ${error.message}`);
  }
}
