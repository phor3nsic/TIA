<p align="center">
  <img src="icons/icon128.png" width="80" alt="Text Improver AI" />
</p>

<h1 align="center">Text Improver AI</h1>

<p align="center">
  A Chrome extension that improves, translates, and summarizes selected text using AI — directly in your browser.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Manifest-v3-6d28d9?style=flat-square" />
  <img src="https://img.shields.io/badge/Version-1.2-7c3aed?style=flat-square" />
  <img src="https://img.shields.io/badge/License-MIT-5b21b6?style=flat-square" />
</p>

---

## Features

- **✨ Improve** — fixes grammar, clarity, and style while keeping the original language
- **🌐 Translate** — translates any text to English
- **📝 Summarize** — condenses long text into key points
- **Floating toolbar** — appears above any selected text for one-click actions
- **Right-click menu** — context menu integration for quick access
- **Smart replacement** — replaces text in textareas, inputs, and contenteditables (Gmail, Notion, etc.)
- **Clipboard fallback** — copies the result when replacement is not possible
- **Multi-provider** — works with Groq, OpenRouter, Ollama, OpenAI, and Anthropic

---

## Supported AI Providers

| Provider | Model | Cost |
|---|---|---|
| **Groq** | Llama 3.1 8B Instant | Free (14,400 req/day) |
| **OpenRouter** | Any model via ID | Free & paid options |
| **Ollama** | Any local model | 100% free (runs locally) |
| **OpenAI** | GPT-4o Mini | ~$0.00015/1K tokens |
| **Anthropic** | Claude Haiku | Pay-as-you-go |

---

## Installation

### Load as unpacked extension

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions`
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** and select the project folder
5. The extension icon will appear in your toolbar

---

## Configuration

Click the extension icon to open the settings popup:

1. **Select a provider** from the dropdown
2. **Enter your API key** for the chosen provider
3. Click **Save settings**

### Getting API Keys

- **Groq** — [console.groq.com](https://console.groq.com) (free)
- **OpenRouter** — [openrouter.ai/keys](https://openrouter.ai/keys) (free & paid)
- **Ollama** — no key needed; install at [ollama.ai](https://ollama.ai)
- **OpenAI** — [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- **Anthropic** — [console.anthropic.com](https://console.anthropic.com)

### OpenRouter model IDs

OpenRouter's free model list changes frequently. To find current free models:

1. Visit [openrouter.ai/models](https://openrouter.ai/models?order=pricing&supported_parameters=free)
2. Filter by **"free"**
3. Copy the model ID (e.g. `google/gemma-2-9b-it:free`) and paste it into the popup

---

## Usage

### Floating toolbar

1. Select any text on a webpage
2. A floating toolbar appears above the selection
3. Click **✨ Improve**, **🌐 EN**, or **📝 Summarize**
4. The text is replaced in-place (or copied to clipboard if the field is read-only)

### Right-click menu

1. Select any text
2. Right-click → **Text Improver AI** → choose an action
3. The result replaces the selection or is copied to clipboard

---

## File Structure

```
text-improver/
├── manifest.json      # Extension manifest (MV3)
├── background.js      # Service worker — AI API calls & context menu
├── content.js         # Content script — floating toolbar & text replacement
├── popup.html         # Settings popup UI
├── popup.js           # Settings popup logic
└── icons/
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

---

## Development

No build step required — it's plain JavaScript.

After editing any file:

1. Go to `chrome://extensions`
2. Click **Reload** on the extension
3. Reload the tab you're testing on (required after content script changes)

---

## License

MIT
