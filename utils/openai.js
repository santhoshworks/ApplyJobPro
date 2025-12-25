async function generateAnswer({ fieldLabel, company, role, profile, apiKey }) {
  // Prompt must use only the candidate summary and relevant experience entries
  const summary = profile.professional_summary?.summary || profile.summary || '';
  const experiences = (profile.experience || []).slice(0, 3).map(e => `${e.title || e.role || ''} at ${e.company || ''}: ${e.responsibilities ? e.responsibilities.slice(0, 2).join('; ') : (e.description || '')}`).join('\n');

  const prompt = `You are helping fill out a job application form. Use ONLY the candidate professional summary and the most relevant experience entries provided. Do NOT request or send the full resume.

Field: "${fieldLabel}"
Company: ${company || 'Unknown'}
Role: ${role || 'Unknown'}

Candidate Summary: ${summary}
Relevant Experience:\n${experiences}

Write a professional, concise answer for this field. Maximum 120 words. Be specific and relevant to the field label. Return only the answer text.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a professional job application assistant. Use only the provided summary and experience entries. No greetings, no signatures, only the answer.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.6,
        max_tokens: 360
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenAI API request failed');
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    throw new Error(`AI generation failed: ${error.message}`);
  }
}

// Browser extension environment only; module.exports removed for clarity.

