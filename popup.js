const allSections = ['groq', 'openrouter', 'ollama', 'openai', 'anthropic'];
const providerSelect = document.getElementById('provider');

function showSection(provider) {
  allSections.forEach(p => {
    document.getElementById('section-' + p).classList.toggle('hidden', p !== provider);
  });
}

providerSelect.addEventListener('change', () => showSection(providerSelect.value));

// Load saved config — each provider has its own key slot
chrome.storage.sync.get([
  'provider',
  'apiKey_groq', 'apiKey_openrouter', 'apiKey_openai', 'apiKey_anthropic',
  'openrouterModel', 'ollamaModel', 'ollamaUrl'
], (cfg) => {
  const p = cfg.provider || 'groq';
  providerSelect.value = p;
  showSection(p);

  ['groq', 'openrouter', 'openai', 'anthropic'].forEach(provider => {
    const key = cfg['apiKey_' + provider];
    if (key) {
      const field = document.getElementById('apiKey-' + provider);
      if (field) field.value = key;
    }
  });

  if (cfg.openrouterModel) document.getElementById('openrouterModel').value = cfg.openrouterModel;
  if (cfg.ollamaModel) document.getElementById('ollamaModel').value = cfg.ollamaModel;
  if (cfg.ollamaUrl) document.getElementById('ollamaUrl').value = cfg.ollamaUrl;
});

document.getElementById('save').addEventListener('click', () => {
  const provider = providerSelect.value;
  const apiKeyField = document.getElementById('apiKey-' + provider);
  const apiKey = apiKeyField ? apiKeyField.value.trim() : '';

  const data = {
    provider,
    ['apiKey_' + provider]: apiKey,
    openrouterModel: document.getElementById('openrouterModel').value,
    ollamaModel: document.getElementById('ollamaModel').value.trim() || 'llama3',
    ollamaUrl: document.getElementById('ollamaUrl').value.trim() || 'http://localhost:11434',
  };

  chrome.storage.sync.set(data, () => {
    const status = document.getElementById('status');
    status.textContent = '✅ Configurações salvas!';
    setTimeout(() => status.textContent = '', 2000);
  });
});
