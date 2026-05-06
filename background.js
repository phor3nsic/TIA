// ─── Context Menu Setup ───────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'text-improver',
      title: 'Text Improver AI',
      contexts: ['selection'],
    });
    chrome.contextMenus.create({
      id: 'improve',
      parentId: 'text-improver',
      title: '✨ Melhorar texto',
      contexts: ['selection'],
    });
    chrome.contextMenus.create({
      id: 'translate',
      parentId: 'text-improver',
      title: '🌐 Traduzir para inglês',
      contexts: ['selection'],
    });
    chrome.contextMenus.create({
      id: 'summarize',
      parentId: 'text-improver',
      title: '📝 Resumir texto',
      contexts: ['selection'],
    });
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const validActions = ['improve', 'translate', 'summarize'];
  if (!validActions.includes(info.menuItemId) || !info.selectionText) return;

  const sendToTab = async (msg) => {
    try {
      await chrome.tabs.sendMessage(tab.id, msg);
    } catch {
      // Content script indisponível — injeta toast e copia texto diretamente
      if (msg.action === 'contextMenuResult') {
        const isError = !!msg.result?.error;
        const resultText = msg.result?.text || '';
        const toastText = isError ? '❌ ' + msg.result.error : '📋 Copiado para o clipboard!';
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (toast, isErr, text) => {
            if (!isErr && text && navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
            const d = document.createElement('div');
            d.textContent = toast;
            d.style.cssText = `position:fixed;bottom:24px;right:24px;z-index:2147483647;background:${isErr ? '#7f1d1d' : '#14532d'};color:white;padding:10px 18px;border-radius:8px;font-size:13px;font-family:system-ui;box-shadow:0 4px 16px rgba(0,0,0,.3);`;
            document.body.appendChild(d);
            setTimeout(() => d.remove(), 3000);
          },
          args: [toastText, isError, resultText],
        }).catch(() => {});
      }
    }
  };

  await sendToTab({ action: 'contextMenuProcessing', type: info.menuItemId });
  const result = await processText(info.menuItemId, info.selectionText);
  await sendToTab({ action: 'contextMenuResult', result, type: info.menuItemId });
});

// ─── Extension Message Handler ────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'processText') {
    processText(msg.type, msg.text).then(sendResponse);
    return true;
  }
});

const PROMPTS = {
  improve: (text) =>
    `Improve the text below by correcting grammar, clarity, and style. 
Do NOT change the original language and do NOT translate it. 
Return ONLY the corrected text, without explanations, quotes, or prefixes.

Text:
${text}`,

  translate: (text) =>
    `Translate the following text into English. 
Preserve the original meaning and tone as much as possible. 
Return ONLY the translated text, without explanations, quotes, or prefixes.

Text:
${text}`,

  summarize: (text) =>
    `Summarize the text below concisely while preserving the key points. 
Return ONLY the summary, without explanations, quotes, or prefixes.

Text:
${text}`,
};

async function processText(type, text) {
  const config = await chrome.storage.sync.get([
    'provider',
    'apiKey_groq', 'apiKey_openrouter', 'apiKey_openai', 'apiKey_anthropic',
    'openrouterModel', 'ollamaModel', 'ollamaUrl'
  ]);

  const provider = config.provider || 'groq';
  const apiKey = config['apiKey_' + provider] || '';
  const prompt = PROMPTS[type]?.(text);
  if (!prompt) return { error: 'Invalid action' };

  try {
    switch (provider) {
      case 'groq':       return { text: await callGroq(prompt, apiKey) };
      case 'openrouter': return { text: await callOpenRouter(prompt, apiKey, config.openrouterModel) };
      case 'ollama':     return { text: await callOllama(prompt, config.ollamaModel, config.ollamaUrl) };
      case 'openai':     return { text: await callOpenAI(prompt, apiKey) };
      case 'anthropic':  return { text: await callAnthropic(prompt, apiKey) };
      default:           return { error: 'Unknown provider' };
    }
  } catch (e) {
    console.error('[TextImprover]', e);
    return { error: e.message || 'Unknown error' };
  }
}

// ─── Groq ────────────────────────────────────────────────────────────────────
async function callGroq(prompt, apiKey) {
  if (!apiKey) throw new Error('Groq API Key not configured');
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1024,
      temperature: 0.3,
    }),
  });
  if (!res.ok) throw new Error(`Groq HTTP ${res.status}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('Empty response from Groq');
  return text;
}

// ─── OpenRouter ───────────────────────────────────────────────────────────────
async function callOpenRouter(prompt, apiKey, model) {
  if (!apiKey) throw new Error('OpenRouter API Key not configured');
  const selectedModel = model || 'mistralai/mistral-7b-instruct:free';
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://github.com/text-improver-extension',
      'X-Title': 'Text Improver Extension',
    },
    body: JSON.stringify({
      model: selectedModel,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1024,
      temperature: 0.3,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`OpenRouter HTTP ${res.status}: ${err?.error?.message || ''}`);
  }
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('Empty response from OpenRouter');
  return text;
}

// ─── Ollama ───────────────────────────────────────────────────────────────────
async function callOllama(prompt, model, baseUrl) {
  const url = (baseUrl || 'http://localhost:11434').replace(/\/$/, '');
  const selectedModel = model || 'llama3';
  const res = await fetch(`${url}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: selectedModel, prompt, stream: false }),
  });
  if (!res.ok) throw new Error(`Ollama HTTP ${res.status} — is model "${selectedModel}" running?`);
  const data = await res.json();
  const text = data.response?.trim();
  if (!text) throw new Error('Empty response from Ollama');
  return text;
}

// ─── OpenAI ───────────────────────────────────────────────────────────────────
async function callOpenAI(prompt, apiKey) {
  if (!apiKey) throw new Error('OpenAI API Key not configured');
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1024,
      temperature: 0.3,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('Empty response from OpenAI');
  return text;
}

// ─── Anthropic ────────────────────────────────────────────────────────────────
async function callAnthropic(prompt, apiKey) {
  if (!apiKey) throw new Error('Anthropic API Key not configured');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic HTTP ${res.status}`);
  const data = await res.json();
  const text = data.content?.[0]?.text?.trim();
  if (!text) throw new Error('Empty response from Anthropic');
  return text;
}
