# Privacy Policy for ApplyJob Pro

**Last Updated:** January 2, 2026

**Developer:** Santhosh Palanisamy
**Contact:** santhoshp.j4@gmail.com

---

## 1. Introduction

Thank you for using ApplyJob Pro ("the Extension", "we", "our", or "us"). This Privacy Policy explains how we collect, use, store, and protect your information when you use our Chrome extension.

We are committed to protecting your privacy and ensuring transparency about our data practices. This Extension is designed with privacy as a core principle - your personal data stays on your device and is never transmitted to our servers.

By installing and using ApplyJob Pro, you agree to the terms outlined in this Privacy Policy.

---

## 2. Information We Collect

### 2.1 Information You Provide

ApplyJob Pro collects and stores the following information **locally on your device only**:

- **Resume Content:** Text content of your resume that you paste into the extension
- **Parsed Profile Data:** Information extracted from your resume, including:
  - Personal information (name, email, phone number, location)
  - Professional summary and work experience
  - Education details
  - Skills and programming languages
  - URLs (LinkedIn, GitHub, portfolio, etc.)
- **API Keys:** Your OpenAI or Google Gemini API keys for AI-powered form filling
- **Form Field Answers:** Your responses to job application form fields, saved for auto-fill purposes
- **Site Preferences:** List of websites where you've enabled the extension (whitelist)
- **Extension Settings:** Your preferences and configuration options

### 2.2 Automatically Collected Information

The Extension automatically collects:

- **Current Website Domain:** To determine if auto-fill should be active on the current site
- **Form Field Labels and Metadata:** To intelligently match your profile data with form fields
- **Company and Role Information:** Extracted from job application page titles and headings for AI context
- **Debug Logs:** Optional diagnostic information if you enable debug logging (stored locally only)

### 2.3 Information We Do NOT Collect

We explicitly do NOT collect, transmit, or store on our servers:

- Your resume content or parsed profile data
- Your API keys
- Your form field answers or application data
- Your browsing history
- Any personally identifiable information
- Analytics or usage statistics
- Tracking data

---

## 3. How We Use Your Information

All information collected by ApplyJob Pro is used **exclusively on your local device** for the following purposes:

### 3.1 Core Functionality

- **Auto-fill Job Applications:** Match your profile data with form fields on job application websites
- **AI-Powered Answers:** Generate contextual responses to application questions using your resume summary and experience
- **Cross-Site Memory:** Remember your answers to similar questions across different job sites
- **Form Field Recognition:** Identify and categorize form fields to provide accurate auto-fill suggestions

### 3.2 User Convenience

- **Site Whitelisting:** Enable/disable auto-fill on specific websites based on your preferences
- **Field Answer Memory:** Save your manual edits and reuse them on similar fields
- **Profile Management:** Store and manage your resume data for quick access

### 3.3 Extension Improvement

- **Debug Logging (Optional):** If enabled by you, logs help diagnose issues with form field detection
  - All logs are stored locally only
  - Logs are never transmitted to us
  - You can clear logs at any time

---

## 4. Data Storage and Security

### 4.1 Local Storage Only

All your data is stored using Chrome's built-in `chrome.storage.local` API, which means:

- Data is stored **only on your device**
- Data is **never transmitted to our servers**
- Data is **not accessible to us** (the developers)
- Data remains **private to your Chrome browser profile**

### 4.2 Third-Party API Communication

The Extension communicates with third-party services **only when you initiate AI-powered form filling**:

- **OpenAI API:** If you configure an OpenAI API key, the extension sends:
  - Your professional summary (extracted from resume)
  - Relevant work experience entries (top 3 most relevant)
  - Form field label and context (company name, role)
  - These requests are sent directly from your browser to OpenAI's servers
  - Your full resume is **never** sent to OpenAI

- **Google Gemini API:** If you configure a Gemini API key, similar limited data is sent:
  - Professional summary and relevant experience
  - Form field context
  - Your full resume is **never** sent to Google

**Important:** These third-party API calls are subject to the privacy policies of OpenAI and Google respectively. We recommend reviewing:
- OpenAI Privacy Policy: https://openai.com/privacy
- Google Privacy Policy: https://policies.google.com/privacy

### 4.3 Data Security Measures

We implement the following security practices:

- **No Server Storage:** We do not operate servers that store your data
- **No Data Transmission:** Your data never leaves your device except for AI API calls (which you control)
- **No Analytics:** We do not use analytics services that could track your usage
- **Local Encryption:** Chrome's storage API provides built-in encryption for extension data
- **API Key Protection:** Your API keys are stored securely using Chrome's storage and are never logged or transmitted to us

### 4.4 Data Retention

Your data is retained locally on your device until you:

- Clear your Chrome extension data
- Uninstall the Extension
- Manually delete data through the Extension's interface

---

## 5. Data Sharing and Disclosure

### 5.1 We Do Not Sell or Share Your Data

We **never** sell, rent, trade, or share your personal information with third parties for marketing or any other purposes.

### 5.2 Third-Party Services

The only third-party data sharing occurs when you choose to use AI features:

- **AI API Providers (OpenAI/Google):** Limited resume data (summary and relevant experience only) is sent to generate form field answers
  - This is **entirely optional** - you choose when to use AI features
  - You provide your own API key
  - Data is sent directly from your browser to the AI provider
  - We do not act as an intermediary

### 5.3 Legal Requirements

We may disclose information if required by law, such as:

- Compliance with legal obligations
- Response to valid legal requests (subpoenas, court orders)
- Protection of our rights or safety
- Investigation of fraud or security issues

**Note:** Since we do not collect or store your data on our servers, we have no data to disclose in most legal scenarios.

---

## 6. Your Rights and Choices

You have complete control over your data:

### 6.1 Access and Control

- **View Your Data:** All data is viewable in the Extension's interface (Resume tab, Advanced tab)
- **Edit Your Data:** Modify your resume, profile, or saved answers at any time
- **Delete Your Data:** Clear all stored data through Chrome's extension settings or by uninstalling
- **Export Your Data:** Copy your data from the Extension's text areas (Debug & Mappings section)

### 6.2 Opt-Out Options

- **Disable AI Features:** Don't configure an API key or don't click the AI generation icon
- **Disable Site Auto-fill:** Remove sites from your whitelist
- **Disable Debug Logging:** Turn off debug logging in Advanced settings
- **Disable Extension:** Disable or uninstall the Extension at any time

### 6.3 Data Portability

Since all data is stored locally:

- You can manually copy your resume and profile data from the Extension interface
- You can export JSON data from the Debug & Mappings section
- Your data remains accessible as long as you keep the Extension installed

---

## 7. Permissions Explanation

ApplyJob Pro requests the following Chrome permissions:

### 7.1 `storage`

- **Purpose:** Store your resume, profile data, API keys, and form answers locally on your device
- **Data Access:** Reads and writes to Chrome's local storage
- **Privacy Impact:** Data remains on your device only

### 7.2 `activeTab`

- **Purpose:** Access the current tab to detect and auto-fill form fields on job application pages
- **Data Access:** Reads DOM elements (form fields) on the active tab
- **Privacy Impact:** Only accesses tabs where you've explicitly enabled the extension

### 7.3 `host_permissions: <all_urls>`

- **Purpose:** Allow the extension to work on any job application website
- **Data Access:** Ability to inject content scripts on whitelisted websites
- **Privacy Impact:** Extension only activates on sites you add to your whitelist
- **Justification:** Job application sites vary widely (Greenhouse, Lever, Workday, company career pages), requiring broad permission
- **User Control:** You explicitly enable/disable the extension for each site

---

## 8. Children's Privacy

ApplyJob Pro is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from children. If you are a parent or guardian and believe your child has provided information to the Extension, please contact us at santhoshp.j4@gmail.com.

---

## 9. International Data Transfers

Since all data is stored locally on your device:

- No international data transfers occur through our servers
- AI API calls may transfer data internationally (subject to OpenAI/Google policies)
- You control when and if such transfers occur by choosing to use AI features

---

## 10. Changes to This Privacy Policy

We may update this Privacy Policy from time to time to reflect:

- Changes in the Extension's functionality
- Changes in legal requirements
- Improvements to our privacy practices

When we make changes:

- We will update the "Last Updated" date at the top of this policy
- For material changes, we will notify users through the Extension's interface or Chrome Web Store listing
- Continued use of the Extension after changes indicates acceptance of the updated policy

We encourage you to review this Privacy Policy periodically.

---

## 11. Third-Party Services and Links

### 11.1 AI Service Providers

ApplyJob Pro integrates with:

- **OpenAI (GPT-4 models):** For AI-powered form field generation
- **Google Gemini:** For AI-powered form field generation

These services have their own privacy policies and terms of service. When you use AI features:

- You are subject to their privacy policies
- Data is sent directly from your browser to their APIs
- We recommend reviewing their policies before using AI features

### 11.2 External Links

The Extension may provide links to third-party websites (e.g., API key registration pages). We are not responsible for the privacy practices of external sites.

---

## 12. California Privacy Rights (CCPA)

If you are a California resident, you have specific rights under the California Consumer Privacy Act (CCPA):

- **Right to Know:** You have the right to know what personal information we collect (all data is visible in the Extension interface)
- **Right to Delete:** You have the right to delete your personal information (uninstall the Extension or clear data)
- **Right to Opt-Out:** You have the right to opt-out of data sales (we do not sell your data)
- **Non-Discrimination:** We will not discriminate against you for exercising your privacy rights

**Important Note:** Since we do not collect your data on our servers, most CCPA requests are automatically satisfied by the Extension's local-only storage model.

---

## 13. European Privacy Rights (GDPR)

If you are located in the European Economic Area (EEA) or United Kingdom, you have rights under the General Data Protection Regulation (GDPR):

### 13.1 Legal Basis for Processing

We process your data based on:

- **Consent:** You provide explicit consent by installing and configuring the Extension
- **Legitimate Interest:** Providing the core functionality you requested

### 13.2 Your GDPR Rights

- **Right of Access:** Access all your data through the Extension interface
- **Right to Rectification:** Edit your data at any time
- **Right to Erasure:** Delete all data by uninstalling or clearing storage
- **Right to Data Portability:** Export your data from the Extension
- **Right to Object:** Stop data processing by disabling the Extension
- **Right to Withdraw Consent:** Uninstall the Extension at any time

### 13.3 Data Controller

Santhosh Palanisamy is the data controller for the limited data processing that occurs locally on your device.

**Note:** Since we do not operate servers storing your data, we do not act as a traditional data controller or processor.

---

## 14. Data Breach Notification

In the unlikely event of a security breach affecting the Extension:

- We will notify affected users within 72 hours (as required by GDPR)
- Notification will be sent via the Extension interface or Chrome Web Store listing
- We will provide details about the nature of the breach and recommended actions

**Important:** Since your data is stored locally and we do not operate servers, traditional server-side breaches do not apply to ApplyJob Pro.

---

## 15. Do Not Track Signals

ApplyJob Pro does not track users across websites or collect analytics data. We automatically respect Do Not Track (DNT) browser settings by virtue of not tracking at all.

---

## 16. Cookie Policy

ApplyJob Pro does not use cookies. All data is stored using Chrome's storage API, not browser cookies.

---

## 17. Contact Us

If you have questions, concerns, or requests regarding this Privacy Policy or your data:

**Developer:** Santhosh Palanisamy
**Email:** santhoshp.j4@gmail.com
**Response Time:** We aim to respond to all inquiries within 7 business days

For privacy-related requests, please include:
- "ApplyJob Pro Privacy" in the subject line
- Your specific question or request
- Any relevant details (but do not send sensitive personal information via email)

---

## 18. Acknowledgment and Consent

By installing and using ApplyJob Pro, you acknowledge that:

1. You have read and understood this Privacy Policy
2. You consent to the data practices described herein
3. You understand that your data is stored locally on your device
4. You understand that AI features send limited data to third-party APIs
5. You can withdraw consent by uninstalling the Extension at any time

---

## 19. Open Source and Transparency

While ApplyJob Pro is not currently open source, we are committed to transparency:

- This Privacy Policy fully discloses our data practices
- We use only standard Chrome APIs with no hidden data collection
- Our code does not contain analytics, tracking, or telemetry
- Users can inspect extension behavior using Chrome DevTools

---

## 20. Limitation of Liability

The Extension is provided "as is" without warranties. We are not liable for:

- Data loss due to browser issues, device failure, or user error
- Issues arising from third-party AI service providers
- Incorrect auto-fill data leading to application errors
- Any damages arising from use of the Extension

Users are responsible for:
- Reviewing auto-filled data before submission
- Securely storing their API keys
- Backing up important resume data

---

**Thank you for trusting ApplyJob Pro with your job application data. Your privacy is our priority.**

---

*This privacy policy was created following industry best practices and compliance with GDPR, CCPA, and Chrome Web Store policies.*
