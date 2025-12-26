# ApplyJob Pro 🚀

**AI-Powered Job Application Autofill Chrome Extension**

Stop wasting hours filling out repetitive job applications. ApplyJob Pro uses AI to intelligently fill forms across all major job platforms—learning from your resume and improving with every application.

[![Chrome Web Store](https://img.shields.io/badge/Chrome-Extension-green?logo=google-chrome)](https://chrome.google.com/webstore)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## � Privacy & Transparency

> **Your data is YOUR data. Period.**

| Principle | What It Means |
|-----------|---------------|
| **🔑 Bring Your Own Key (BYOK)** | You provide your own OpenAI/Gemini API key. We never see it, store it, or have access to it. |
| **💾 100% Local Storage** | All data (resume, profile, saved answers) is stored in your browser's local storage. Nothing leaves your device except AI requests you initiate. |
| **🚫 No Backend** | We have zero servers, zero databases, zero cloud infrastructure. There's nowhere for your data to leak to. |
| **👁️ No Tracking** | No analytics, no telemetry, no usage data collection. We literally can't see how you use the extension. |
| **📖 Open Source** | Every line of code is visible in this repository. Audit it yourself. |

**How AI requests work:**
- When you use AI features, YOUR API key sends requests directly from YOUR browser to OpenAI/Google
- We are not a proxy—your browser talks directly to the AI provider
- Only the minimum context needed (field label + relevant resume excerpt) is sent
- You can use the extension without AI—local resume parsing works completely offline

---

## �😫 The Problem

Job seekers face these frustrations daily:

- **Repetitive Data Entry**: Typing the same information (name, email, work history) on 50+ applications
- **Inconsistent Answers**: Crafting different responses to similar questions, losing track of what works
- **Time Drain**: Spending 15-30 minutes per application on forms instead of networking or interview prep
- **Form Fatigue**: Losing motivation after the 10th application of the day
- **Embedded Forms**: Struggling with iframes on Greenhouse, Lever, and Workday that break standard autofill

## ✨ The Solution

ApplyJob Pro solves all of this:

| Problem | Solution |
|---------|----------|
| Repetitive typing | One-click autofill from your resume |
| Inconsistent answers | AI generates tailored, professional responses |
| Time waste | Fill applications in under 2 minutes |
| Form fatigue | Automatic field detection and filling |
| Embedded forms | Full iframe support for all major ATS platforms |

---

## 🎯 Features

### 🤖 AI-Powered Autofill
- **Dual AI Support**: Choose between OpenAI (GPT-4o-mini) or Google Gemini
- **Smart Response Generation**: Context-aware answers tailored to each question type
- **Professional Tone**: Responses crafted with recruiter preferences in mind
- **Anti-Repetition**: AI varies language to avoid templated-sounding applications

### 📄 Resume Intelligence
- **One-Time Upload**: Parse your resume once, use everywhere
- **Automatic Extraction**: Pulls name, contact, skills, experience, education
- **Structured Profile**: Converts unstructured resume into queryable data
- **Local Processing Option**: Parse without sending data to AI (privacy mode)

### 🔄 Cross-Site Learning
- **Field Mapping**: Learns that "First Name" on Site A = "Given Name" on Site B
- **Answer Memory**: Saves your responses for reuse across applications
- **Canonical Schema**: Maps 100+ field variations to standard categories
- **Experience Tracking**: Remembers which experiences you've highlighted

### 🖼️ Universal Compatibility
- **Iframe Support**: Works inside embedded forms (Greenhouse, Lever, Workday, etc.)
- **Dynamic Forms**: Handles JavaScript-rendered fields with retry mechanism
- **All Input Types**: Text, textarea, select, radio buttons, checkboxes
- **Multi-Page Forms**: Persists across form navigation

### 🔒 Privacy-First Design (No Backend!)
- **Bring Your Own Key**: Use YOUR OpenAI/Gemini API key—we never see or store it on any server
- **100% Local Storage**: All data stays in Chrome's local storage on YOUR device
- **Zero Infrastructure**: No servers, no databases, no cloud = no data breaches possible
- **No Tracking**: Zero analytics, telemetry, ads, or usage monitoring
- **Site Whitelist**: Extension only activates on domains YOU explicitly approve
- **Open Source**: Full code transparency—audit every line yourself

---

## 📦 Installation

### From Source (Developer Mode)

1. **Clone the repository**
   ```bash
   git clone https://github.com/santhoshworks/ApplyJobPro.git
   cd ApplyJobPro
   ```

2. **Load in Chrome**
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode" (top right toggle)
   - Click "Load unpacked"
   - Select the cloned folder

3. **Pin the extension**
   - Click the puzzle icon in Chrome toolbar
   - Pin "ApplyJob Pro" for easy access

---

## 🚀 Quick Start

### 1. Upload Your Resume
- Click the ApplyJob Pro icon
- Go to **Resume** tab
- Paste your resume text or upload a file
- Click **Parse Resume**

### 2. Add Your AI Key (Optional)
- Go to **AI Settings** tab
- Enter your OpenAI or Gemini API key
- Select your preferred provider

### 3. Enable on Job Sites
- Visit any job application page
- Click the extension icon
- Toggle **"Enable on this site"** ON

### 4. Apply!
- Navigate to a job application form
- Watch fields auto-populate
- Review and submit

---

## 🏗️ Technical Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    ApplyJob Pro                          │
├─────────────────────────────────────────────────────────┤
│  popup.html/js/css    │  User interface & settings      │
├───────────────────────┼─────────────────────────────────┤
│  content.js           │  Form detection & autofill      │
│                       │  - Field discovery              │
│                       │  - Label extraction             │
│                       │  - Value injection              │
│                       │  - Blur event learning          │
├───────────────────────┼─────────────────────────────────┤
│  background.js        │  Service worker                 │
│                       │  - AI API calls                 │
│                       │  - Resume parsing               │
│                       │  - Storage management           │
├───────────────────────┼─────────────────────────────────┤
│  utils/               │  Shared utilities               │
│  - fieldMatcher.js    │  - Canonical field mapping      │
│  - resumeParser.js    │  - Local resume extraction      │
│  - storage.js         │  - Chrome storage helpers       │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Resume Upload** → Parsed locally or via AI → Stored in `chrome.storage.local`
2. **Page Load** → Content script checks whitelist → Discovers form fields
3. **Field Processing** → Extract label → Match to canonical key → Fill from profile/saved answers
4. **User Edit** → Blur event captures changes → Saves for future use
5. **AI Generation** → Background worker calls API → Returns tailored response

---

## 🗺️ Roadmap

### v1.1 - Enhanced AI
- [ ] Claude API support
- [ ] Custom prompt templates
- [ ] Response quality scoring
- [ ] A/B test different answer styles

### v1.2 - Application Tracking
- [ ] Track applications submitted
- [ ] Response rate analytics
- [ ] Calendar integration for interviews
- [ ] Follow-up reminders

### v1.3 - Advanced Features
- [ ] Cover letter generation
- [ ] LinkedIn profile sync
- [ ] Resume tailoring per job
- [ ] Salary negotiation suggestions

### v2.0 - Platform Expansion
- [ ] Firefox extension
- [ ] Safari extension
- [ ] Mobile companion app

---

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Test thoroughly** on multiple job sites
5. **Commit with clear messages**
   ```bash
   git commit -m "feat: add support for Workday custom fields"
   ```
6. **Push and create a Pull Request**

### Development Guidelines
- Follow existing code style
- Test on Greenhouse, Lever, and Workday at minimum
- Update README for new features
- Keep privacy-first principles

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Built with vanilla JavaScript for maximum compatibility
- Icons generated with AI assistance
- Inspired by the frustration of filling out 100+ job applications

---

## 📧 Support

- **Issues**: [GitHub Issues](https://github.com/santhoshworks/ApplyJobPro/issues)
- **Discussions**: [GitHub Discussions](https://github.com/santhoshworks/ApplyJobPro/discussions)

---

**Made with ❤️ for job seekers everywhere**

*Stop filling forms. Start landing interviews.*

