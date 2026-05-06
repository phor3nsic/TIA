let floatingBtn = null;
let savedRange = null;
let savedSelection = null;

// ─── Context Menu Messages ────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === 'contextMenuProcessing') {
    const labels = { improve: '⏳ Improving...', translate: '⏳ Translating...', summarize: '⏳ Summarizing...' };
    showToast(labels[msg.type] || '⏳ Processing...', 'info');
    sendResponse({ ok: true });
    return;
  }

  if (msg.action === 'contextMenuResult') {
    const { result } = msg;
    if (!result || result.error) {
      showToast('❌ ' + (result?.error || 'AI request failed. Check your settings.'), 'error');
      sendResponse({ ok: false });
      return;
    }
    const replaced = tryReplace(result.text);
    if (!replaced) {
      navigator.clipboard.writeText(result.text).then(() => {
        showToast('📋 Copied to clipboard!', 'success');
      }).catch(() => {
        showToast('✅ Text processed (no clipboard permission)', 'success');
      });
    } else {
      showToast('✅ Text replaced!', 'success');
    }
    sendResponse({ ok: true });
  }
});

document.addEventListener('mouseup', (e) => {
  if (floatingBtn && floatingBtn.contains(e.target)) return;

  const selection = window.getSelection();
  const text = selection?.toString().trim();

  if (floatingBtn) floatingBtn.remove(), floatingBtn = null;
  if (!text || text.length < 5) return;

  savedSelection = text;
  savedRange = selection.getRangeAt(0).cloneRange();

  const rect = selection.getRangeAt(0).getBoundingClientRect();

  floatingBtn = document.createElement('div');
  floatingBtn.id = '__text_improver_btn__';
  floatingBtn.innerHTML = `
    <button id="__ti_improve__" title="Improve text">✨ Improve</button>
    <button id="__ti_translate__" title="Translate to English">🌐 EN</button>
    <button id="__ti_summarize__" title="Summarize">📝 Summarize</button>
  `;
  floatingBtn.style.cssText = `
    position: fixed;
    top: ${Math.max(rect.top - 44, 4)}px;
    left: ${Math.min(rect.left + rect.width / 2 - 110, window.innerWidth - 240)}px;
    z-index: 2147483647;
    display: flex;
    gap: 4px;
    background: #1a1a2e;
    border-radius: 8px;
    padding: 5px 8px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.4);
    font-family: system-ui, sans-serif;
  `;

  const btnStyle = `
    background: transparent;
    color: #e0e0e0;
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 5px;
    padding: 4px 10px;
    font-size: 12px;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.15s;
  `;

  floatingBtn.querySelectorAll('button').forEach(b => {
    b.style.cssText = btnStyle;
    b.addEventListener('mouseenter', () => b.style.background = 'rgba(255,255,255,0.12)');
    b.addEventListener('mouseleave', () => b.style.background = 'transparent');
  });

  floatingBtn.querySelector('#__ti_improve__').addEventListener('click', () => handleAction('improve'));
  floatingBtn.querySelector('#__ti_translate__').addEventListener('click', () => handleAction('translate'));
  floatingBtn.querySelector('#__ti_summarize__').addEventListener('click', () => handleAction('summarize'));

  document.body.appendChild(floatingBtn);
});

document.addEventListener('mousedown', (e) => {
  if (floatingBtn && !floatingBtn.contains(e.target)) {
    floatingBtn.remove();
    floatingBtn = null;
  }
});

async function handleAction(action) {
  if (!floatingBtn) return;

  const labels = { improve: '⏳ Improving...', translate: '⏳ Translating...', summarize: '⏳ Summarizing...' };
  floatingBtn.innerHTML = `<span style="color:#ccc;font-size:12px;padding:4px 8px;">${labels[action]}</span>`;

  const result = await chrome.runtime.sendMessage({ action: 'processText', type: action, text: savedSelection });

  if (!result || result.error) {
    showToast('❌ ' + (result?.error || 'AI request failed. Check your settings.'), 'error');
    floatingBtn.remove();
    floatingBtn = null;
    return;
  }

  const replaced = tryReplace(result.text);
  if (!replaced) {
    await navigator.clipboard.writeText(result.text);
    showToast('📋 Copied to clipboard!', 'success');
  } else {
    showToast('✅ Text replaced!', 'success');
  }

  floatingBtn.remove();
  floatingBtn = null;
}

function tryReplace(newText) {
  const active = document.activeElement;

  // textarea / input
  if (active && (active.tagName === 'TEXTAREA' || active.tagName === 'INPUT')) {
    const start = active.selectionStart;
    const end = active.selectionEnd;
    if (start !== end) {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set
        || Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(active, active.value.slice(0, start) + newText + active.value.slice(end));
        active.dispatchEvent(new Event('input', { bubbles: true }));
        active.dispatchEvent(new Event('change', { bubbles: true }));
        active.selectionStart = start;
        active.selectionEnd = start + newText.length;
      } else {
        active.value = active.value.slice(0, start) + newText + active.value.slice(end);
      }
      return true;
    }
  }

  // contenteditable (Gmail, Notion, etc.)
  if (savedRange) {
    try {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(savedRange);
      const success = document.execCommand('insertText', false, newText);
      if (success) return true;

      // manual fallback for contenteditable
      savedRange.deleteContents();
      savedRange.insertNode(document.createTextNode(newText));
      return true;
    } catch (err) {
      console.warn('Text Improver: replace failed', err);
    }
  }

  return false;
}

function showToast(msg, type = 'success') {
  const toast = document.createElement('div');
  toast.innerText = msg;
  const bg = type === 'error' ? '#7f1d1d' : type === 'info' ? '#1e3a5f' : '#14532d';
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 2147483647;
    background: ${bg};
    color: white;
    padding: 10px 18px;
    border-radius: 8px;
    font-size: 13px;
    font-family: system-ui;
    box-shadow: 0 4px 16px rgba(0,0,0,0.3);
    opacity: 0;
    transition: opacity 0.2s;
  `;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.style.opacity = '1');
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}
