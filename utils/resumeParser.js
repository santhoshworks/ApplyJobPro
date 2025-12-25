async function parseResume(uint8Array, fileType) {
  if (fileType === 'pdf') {
    return await parsePDF(uint8Array);
  } else if (fileType === 'docx') {
    return await parseDOCX(uint8Array);
  } else {
    throw new Error('Unsupported file type');
  }
}

async function parsePDF(uint8Array) {
  try {
    const pdfjsLib = await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/+esm');
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

    const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += pageText + '\n';
    }

    return fullText.trim();
  } catch (error) {
    throw new Error(`PDF parsing failed: ${error.message}`);
  }
}

async function parseDOCX(uint8Array) {
  try {
    const mammoth = await import('https://cdn.jsdelivr.net/npm/mammoth@1.6.0/+esm');
    const arrayBuffer = uint8Array.buffer;
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value.trim();
  } catch (error) {
    throw new Error(`DOCX parsing failed: ${error.message}`);
  }
}

async function structureResumeWithAI(resumeText, apiKey) {
  const prompt = `Extract structured information from this resume and return ONLY valid JSON with this exact structure:
{
  "summary": "brief professional summary",
  "skills": ["skill1", "skill2"],
  "experience": [{"company": "", "role": "", "description": ""}],
  "projects": [{"name": "", "description": ""}],
  "education": [{"institution": "", "degree": ""}]
}

Resume:
${resumeText.substring(0, 4000)}`;

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
          { role: 'system', content: 'You are a resume parser. Return only valid JSON, no markdown, no explanations.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 1500
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenAI API request failed');
    }

    const data = await response.json();
    const content = data.choices[0].message.content.trim();

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : content;

    return JSON.parse(jsonStr);
  } catch (error) {
    throw new Error(`AI structuring failed: ${error.message}`);
  }
}

// Browser extension usage only; no Node exports required.

