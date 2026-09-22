// Telegram WebApp obyektini olish
const tg = window.Telegram?.WebApp;

// Holat (State)
let allTranscripts = [];
let activeFilter = 'all';
let searchQuery = '';

// DOM elementlar
const listContainer = document.getElementById('transcripts-list-container');
const loadingSpinner = document.getElementById('loading-spinner');
const emptyStateView = document.getElementById('empty-state-view');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search-btn');
const filterPills = document.querySelectorAll('.filter-pill');
const itemsCounterBadge = document.getElementById('items-counter-badge');
const metricTotalCount = document.getElementById('metric-total-count');
const metricProgressPercent = document.getElementById('metric-progress-percent');
const metricProgressBar = document.getElementById('metric-progress-bar');
const toastNotify = document.getElementById('toast-notify');
const toastMessageText = document.getElementById('toast-message-text');

// Audio Yozish DOM
const recordMicBtn = document.getElementById('record-mic-btn');
const recordStatusText = document.getElementById('record-status-text');
const recordTimerText = document.getElementById('record-timer-text');
const btnStopAnalyze = document.getElementById('btn-stop-analyze');

let mediaRecorder = null;
let audioChunks = [];
let recordInterval = null;
let recordSeconds = 0;

// Telegram WebApp sozlamalari
function initTelegram() {
  if (tg) {
    try {
      tg.ready();
      tg.expand();
      if (tg.setHeaderColor) tg.setHeaderColor('#0a0d14');
      if (tg.setBackgroundColor) tg.setBackgroundColor('#0a0d14');

      const user = tg.initDataUnsafe?.user;
      if (user) {
        const userNameElem = document.getElementById('user-display-name');
        const userAvatarElem = document.getElementById('user-avatar-img');
        const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || 'Foydalanuvchi';
        if (userNameElem) userNameElem.textContent = fullName;
        if (userAvatarElem) {
          const initials = (user.first_name?.[0] || 'U') + (user.last_name?.[0] || '');
          userAvatarElem.textContent = initials.toUpperCase();
        }
      }
    } catch (e) {
      console.log('Telegram SDK sozlashda ogohlantirish:', e);
    }
  }
}

function triggerHaptic(type = 'light') {
  if (tg?.HapticFeedback) {
    try { tg.HapticFeedback.impactOccurred(type); } catch (e) {}
  }
}

function showToast(message) {
  if (!toastNotify || !toastMessageText) return;
  toastMessageText.textContent = message;
  toastNotify.style.display = 'block';
  setTimeout(() => {
    toastNotify.style.display = 'none';
  }, 2200);
}

// Konspektlarni yuklash
async function loadTranscripts() {
  try {
    const res = await fetch('/api/transcripts');
    const json = await res.json();
    if (json.success) {
      allTranscripts = json.data || [];
      renderTranscripts();
      updateMetrics();

      const urlParams = new URLSearchParams(window.location.search);
      const targetId = urlParams.get('item');
      if (targetId) {
        setTimeout(() => {
          const el = document.getElementById(`card-${targetId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.style.borderColor = 'var(--accent-cyan)';
            el.style.boxShadow = '0 0 25px rgba(56, 189, 248, 0.4)';
          }
        }, 300);
      }
    }
  } catch (err) {
    console.error('Konspektlarni yuklashda xatolik:', err);
    showToast("Server bilan ulanishda xatolik");
  } finally {
    if (loadingSpinner) loadingSpinner.style.display = 'none';
  }
}

// Metrikalar
function updateMetrics() {
  if (!metricTotalCount) return;
  metricTotalCount.textContent = allTranscripts.length;

  let totalTasks = 0;
  let completedTasks = 0;

  allTranscripts.forEach(item => {
    const actions = item.action_items || [];
    totalTasks += actions.length;
    actions.forEach((_, idx) => {
      if (item.completedActions && item.completedActions[idx]) completedTasks++;
    });
  });

  const percent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100;
  if (metricProgressPercent) metricProgressPercent.textContent = `${percent}%`;
  if (metricProgressBar) metricProgressBar.style.width = `${percent}%`;
}

// Render
function renderTranscripts() {
  if (!listContainer) return;

  let filtered = allTranscripts.filter(item => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (item.title || '').toLowerCase().includes(q);
      const matchSummary = (item.summary || '').toLowerCase().includes(q);
      const matchTranscript = (item.full_transcript || '').toLowerCase().includes(q);
      const matchActions = (item.action_items || []).some(a => a.toLowerCase().includes(q));
      if (!matchTitle && !matchSummary && !matchTranscript && !matchActions) return false;
    }

    if (activeFilter === 'with-tasks') {
      return (item.action_items && item.action_items.length > 0);
    }
    if (activeFilter !== 'all') {
      return (item.category === activeFilter);
    }

    return true;
  });

  if (itemsCounterBadge) {
    itemsCounterBadge.textContent = `${filtered.length} ta`;
  }

  if (filtered.length === 0) {
    listContainer.innerHTML = '';
    if (emptyStateView) emptyStateView.style.display = 'block';
    return;
  }

  if (emptyStateView) emptyStateView.style.display = 'none';
  listContainer.innerHTML = filtered.map(item => createCardHTML(item)).join('');
  attachCardEvents();
}

function createCardHTML(item) {
  const dateObj = new Date(item.date);
  const formattedDate = dateObj.toLocaleDateString('uz-UZ', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const actions = item.action_items || [];
  const hasActions = actions.length > 0;
  const category = item.category || 'Umumiy';

  const actionsHTML = hasActions ? `
    <div class="card-actions-box">
      <div class="actions-heading">
        <span>✅ Topshiriqlar (${actions.length})</span>
      </div>
      <div class="action-items-list">
        ${actions.map((act, idx) => {
          const isDone = item.completedActions && item.completedActions[idx];
          return `
            <label class="action-item ${isDone ? 'completed' : ''}" data-id="${item.id}" data-index="${idx}">
              <input type="checkbox" class="action-checkbox" ${isDone ? 'checked' : ''}>
              <span class="action-item-text">${escapeHTML(act)}</span>
            </label>
          `;
        }).join('')}
      </div>
    </div>
  ` : '';

  const adviceHTML = item.answer_or_advice ? `
    <div class="card-summary" style="border-left-color: var(--accent-indigo); margin-top: 10px;">
      <div class="summary-heading" style="color: var(--accent-indigo);">💬 Javob / Maslahat</div>
      <p class="summary-text">${escapeHTML(item.answer_or_advice)}</p>
    </div>
  ` : '';

  return `
    <article class="transcript-card" id="card-${item.id}">
      <div class="card-header">
        <div>
          <div class="card-tags">
            <span class="tag tag-time">📅 ${formattedDate}</span>
            <span class="tag tag-cat">🏷️ ${category}</span>
            <span class="tag tag-lang">🌐 ${item.language || "O'zbekcha"}</span>
            <span class="tag tag-duration">⏱️ ${item.duration || '01:00'}</span>
          </div>
          <h3 class="card-title">${escapeHTML(item.title || "Ovozli xabar")}</h3>
        </div>
        <button class="card-delete-btn" data-delete-id="${item.id}" title="O'chirish">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>

      <div class="card-summary">
        <div class="summary-heading">💡 Qisqacha Mazmun</div>
        <p class="summary-text">${escapeHTML(item.summary || "Xulosa yo'q.")}</p>
      </div>

      ${adviceHTML}
      ${actionsHTML}

      <div class="transcript-accordion">
        <button class="accordion-toggle" data-accordion-id="${item.id}">
          <span>📜 So'zma-so'z matnni ko'rish</span>
          <span class="toggle-icon">▼</span>
        </button>
        <div class="transcript-body" id="transcript-body-${item.id}">
          ${escapeHTML(item.full_transcript || "Matn mavjud emas.")}
        </div>
      </div>

      <div class="card-footer">
        <button class="card-btn btn-export-txt" data-export-id="${item.id}">
          📄 TXT Yuklash
        </button>
        <button class="card-btn btn-copy" data-copy-id="${item.id}">
          📋 Nusxalash
        </button>
        <button class="card-btn btn-share" data-share-id="${item.id}">
          📤 Ulashish
        </button>
      </div>
    </article>
  `;
}

// Hodisalarni ulash
function attachCardEvents() {
  document.querySelectorAll('.action-item').forEach(label => {
    label.addEventListener('click', async (e) => {
      if (e.target.tagName !== 'INPUT') return;
      const id = label.dataset.id;
      const index = parseInt(label.dataset.index, 10);
      triggerHaptic('light');

      try {
        const res = await fetch(`/api/transcripts/${id}/toggle-action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ actionIndex: index })
        });
        const json = await res.json();
        if (json.success) {
          const item = allTranscripts.find(t => t.id === id);
          if (item) item.completedActions = json.data.completedActions;
          label.classList.toggle('completed');
          updateMetrics();
        }
      } catch (err) {
        console.error("Xato:", err);
      }
    });
  });

  document.querySelectorAll('.accordion-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.accordionId;
      const body = document.getElementById(`transcript-body-${id}`);
      if (body) {
        body.classList.toggle('show');
        btn.classList.toggle('expanded');
        triggerHaptic('selection');
      }
    });
  });

  // TXT yuklash
  document.querySelectorAll('.btn-export-txt').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.exportId;
      const item = allTranscripts.find(t => t.id === id);
      if (!item) return;

      let content = `VOICEPROTOCOL AI — PROTOKOL\n`;
      content += `Mavzu: ${item.title}\nSana: ${new Date(item.date).toLocaleString('uz-UZ')}\n\n`;
      content += `QISQACHA MAZMUN:\n${item.summary}\n\n`;
      if (item.action_items && item.action_items.length > 0) {
        content += `TOPSHIRIQLAR:\n` + item.action_items.map((a, i) => `${i + 1}. ${a}`).join('\n') + `\n\n`;
      }
      content += `TO'LIQ TRANSKRIPSIYA:\n${item.full_transcript}\n`;

      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${item.title.replace(/[^a-zA-Z0-9]/g, '_')}_protokol.txt`;
      link.click();
      showToast("Fayl yuklab olindi! 📄");
      triggerHaptic('medium');
    });
  });

  // Nusxalash
  document.querySelectorAll('.btn-copy').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.copyId;
      const item = allTranscripts.find(t => t.id === id);
      if (!item) return;

      let textToCopy = `📌 ${item.title}\n\n💡 Qisqacha mazmun:\n${item.summary}\n\n`;
      if (item.action_items && item.action_items.length > 0) {
        textToCopy += `✅ Topshiriqlar:\n` + item.action_items.map((a, i) => `• ${a}`).join('\n') + `\n\n`;
      }
      textToCopy += `📜 To'liq matn:\n"${item.full_transcript}"`;

      navigator.clipboard.writeText(textToCopy).then(() => {
        showToast("Protokol nusxalandi! 📋");
        triggerHaptic('medium');
      });
    });
  });

  // Ulashish
  document.querySelectorAll('.btn-share').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.shareId;
      const item = allTranscripts.find(t => t.id === id);
      if (!item) return;

      const shareText = `📌 ${item.title}\n💡 Xulosa: ${item.summary}\n\nVoiceProtocol AI orqali tayyorlandi.`;
      if (navigator.share) {
        navigator.share({ title: item.title, text: shareText }).catch(() => {});
      } else {
        navigator.clipboard.writeText(shareText);
        showToast("Ulashish matni nusxalandi!");
      }
    });
  });

  // O'chirish
  document.querySelectorAll('.card-delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.deleteId;
      if (!confirm("Ushbu konspektni o'chirib tashlamoqchimisiz?")) return;

      try {
        const res = await fetch(`/api/transcripts/${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) {
          allTranscripts = allTranscripts.filter(t => t.id !== id);
          renderTranscripts();
          updateMetrics();
          showToast("Konspekt o'chirildi 🗑️");
          triggerHaptic('heavy');
        }
      } catch (err) {
        showToast("O'chirishda xatolik");
      }
    });
  });
}

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

// Jonli Ovoz Yozish (Audio Recorder)
function setupLiveRecorder() {
  if (!recordMicBtn) return;

  recordMicBtn.addEventListener('click', async () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      // To'xtatish
      stopRecording();
    } else {
      // Boshlash
      startRecording();
    }
  });

  if (btnStopAnalyze) {
    btnStopAnalyze.addEventListener('click', () => {
      stopRecording();
    });
  }
}

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) audioChunks.push(event.data);
    };

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      stream.getTracks().forEach(track => track.stop());

      // Base64 ga o'girish
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = reader.result.split(',')[1];
        if (recordStatusText) recordStatusText.textContent = "AI tahlil qilmoqda...";

        try {
          const res = await fetch('/api/analyze-audio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audioBase64: base64Audio,
              mimeType: 'audio/webm',
              title: `Jonli ovoz (${recordSeconds}s)`
            })
          });

          const json = await res.json();
          if (json.success) {
            allTranscripts.unshift(json.data);
            renderTranscripts();
            updateMetrics();
            showToast("Konspekt tayyor! ⚡");
            triggerHaptic('heavy');
          }
        } catch (e) {
          showToast("Tahlil qilishda xatolik");
        } finally {
          resetRecorderUI();
        }
      };
    };

    mediaRecorder.start();
    recordMicBtn.classList.add('recording');
    if (btnStopAnalyze) btnStopAnalyze.style.display = 'inline-flex';
    if (recordStatusText) recordStatusText.textContent = "Yozilmoqda...";
    recordSeconds = 0;
    recordInterval = setInterval(() => {
      recordSeconds++;
      const mins = String(Math.floor(recordSeconds / 60)).padStart(2, '0');
      const secs = String(recordSeconds % 60).padStart(2, '0');
      if (recordTimerText) recordTimerText.textContent = `Vaqt: ${mins}:${secs}`;
    }, 1000);

    triggerHaptic('medium');
  } catch (err) {
    console.error("Mikrofon xatosi:", err);
    showToast("Mikrofonga ruxsat berilmadi");
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
  }
  clearInterval(recordInterval);
}

function resetRecorderUI() {
  recordMicBtn.classList.remove('recording');
  if (btnStopAnalyze) btnStopAnalyze.style.display = 'none';
  if (recordStatusText) recordStatusText.textContent = "Jonli ovoz yozish";
  if (recordTimerText) recordTimerText.textContent = "Mikrofonni bosing va gapiring";
}

// Filtrlar
function setupFilters() {
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim();
      if (clearSearchBtn) clearSearchBtn.style.display = searchQuery ? 'block' : 'none';
      renderTranscripts();
    });
  }

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      searchQuery = '';
      clearSearchBtn.style.display = 'none';
      renderTranscripts();
    });
  }

  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeFilter = pill.dataset.filter;
      triggerHaptic('selection');
      renderTranscripts();
    });
  });
}

// ==========================================
// 💡 4,000 TA AI PROMPTLAR VA SHABLONLAR WEBAPP
// ==========================================

let promptCategories = [];
let currentPromptCat = 'all';
let currentPromptPage = 1;
let promptSearchQuery = '';
let isFavsOnly = false;
let userFavIds = new Set(JSON.parse(localStorage.getItem('vp_fav_prompts') || '[]'));
let currentModalPrompt = null;
let promptDebounceTimer = null;

// DOM
const tabBtnTranscripts = document.getElementById('tab-btn-transcripts');
const tabBtnPrompts = document.getElementById('tab-btn-prompts');
const viewTranscripts = document.getElementById('view-transcripts');
const viewPrompts = document.getElementById('view-prompts');

const promptSearchInput = document.getElementById('prompt-search-input');
const clearPromptSearchBtn = document.getElementById('clear-prompt-search-btn');
const btnRandomPrompt = document.getElementById('btn-random-prompt');
const btnFavoritesToggle = document.getElementById('btn-favorites-toggle');
const favCountBadge = document.getElementById('fav-count-badge');
const promptCategoriesContainer = document.getElementById('prompt-categories-container');
const promptsGridContainer = document.getElementById('prompts-grid-container');
const promptsCounterBadge = document.getElementById('prompts-counter-badge');
const promptsPagination = document.getElementById('prompts-pagination');
const btnPrevPage = document.getElementById('btn-prev-page');
const btnNextPage = document.getElementById('btn-next-page');
const pageIndicatorText = document.getElementById('page-indicator-text');

// Modal DOM
const promptModalOverlay = document.getElementById('prompt-modal-overlay');
const btnCloseModal = document.getElementById('btn-close-modal');
const modalPromptIcon = document.getElementById('modal-prompt-icon');
const modalPromptTitle = document.getElementById('modal-prompt-title');
const modalPromptMeta = document.getElementById('modal-prompt-meta');
const modalPromptDesc = document.getElementById('modal-prompt-desc');
const modalPromptText = document.getElementById('modal-prompt-text');
const btnCopyModalPrompt = document.getElementById('btn-copy-modal-prompt');
const btnUseModalPrompt = document.getElementById('btn-use-modal-prompt');

function switchTab(tab) {
  triggerHaptic('selection');
  if (tab === 'prompts') {
    tabBtnTranscripts?.classList.remove('active');
    tabBtnPrompts?.classList.add('active');
    if (viewTranscripts) viewTranscripts.style.display = 'none';
    if (viewPrompts) viewPrompts.style.display = 'block';

    if (promptCategories.length === 0) {
      loadPromptCategories();
    }
    loadPrompts();
  } else {
    tabBtnPrompts?.classList.remove('active');
    tabBtnTranscripts?.classList.add('active');
    if (viewPrompts) viewPrompts.style.display = 'none';
    if (viewTranscripts) viewTranscripts.style.display = 'block';
  }
}

async function loadPromptCategories() {
  try {
    const res = await fetch('/api/prompts/categories');
    const json = await res.json();
    if (json.success) {
      promptCategories = json.data;
      renderPromptCategories();
    }
  } catch (e) {
    console.error("Toifalarni yuklashda xato:", e);
  }
}

function renderPromptCategories() {
  if (!promptCategoriesContainer) return;

  let totalCount = 4000;
  let html = `<button class="cat-pill ${currentPromptCat === 'all' ? 'active' : ''}" data-cat="all">🌟 Barchasi (${totalCount})</button>`;

  promptCategories.forEach(cat => {
    const isActive = (currentPromptCat === cat.id);
    html += `<button class="cat-pill ${isActive ? 'active' : ''}" data-cat="${cat.id}">
      ${cat.icon} ${cat.name.split('&')[0].trim()} (${cat.count})
    </button>`;
  });

  promptCategoriesContainer.innerHTML = html;

  promptCategoriesContainer.querySelectorAll('.cat-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      triggerHaptic('selection');
      promptCategoriesContainer.querySelectorAll('.cat-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentPromptCat = btn.dataset.cat;
      currentPromptPage = 1;
      loadPrompts();
    });
  });
}

async function loadPrompts() {
  if (!promptsGridContainer) return;

  promptsGridContainer.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>4,000 ta AI promptlar bazasidan qidirilmoqda...</p>
    </div>
  `;

  try {
    let url = `/api/prompts?page=${currentPromptPage}&limit=15`;
    if (currentPromptCat !== 'all') {
      url += `&category=${encodeURIComponent(currentPromptCat)}`;
    }
    if (promptSearchQuery) {
      url += `&query=${encodeURIComponent(promptSearchQuery)}`;
    }

    const res = await fetch(url);
    const json = await res.json();

    if (json.success) {
      renderPrompts(json);
    } else {
      promptsGridContainer.innerHTML = `<div class="empty-state"><p>Promptlarni yuklab bo'lmadi.</p></div>`;
    }
  } catch (err) {
    console.error("Promptlarni yuklash xatosi:", err);
    promptsGridContainer.innerHTML = `<div class="empty-state"><p>Xatolik: ${err.message}</p></div>`;
  }
}

function renderPrompts(data) {
  if (!promptsGridContainer) return;

  let list = data.prompts || [];

  if (isFavsOnly) {
    list = list.filter(p => userFavIds.has(p.id));
  }

  if (promptsCounterBadge) {
    promptsCounterBadge.textContent = `${data.total.toLocaleString()} ta`;
  }

  if (favCountBadge) {
    favCountBadge.textContent = userFavIds.size;
  }

  if (list.length === 0) {
    promptsGridContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <h3>Hech qanday prompt topilmadi</h3>
        <p>${promptSearchQuery ? `"${promptSearchQuery}" bo'yicha hech narsa chiqmadi. Boshqa so'z bilan qidiring.` : 'Bu toifada promptlar yo\'q.'}</p>
      </div>
    `;
    if (promptsPagination) promptsPagination.style.display = 'none';
    return;
  }

  let html = '';
  list.forEach(p => {
    const isFav = userFavIds.has(p.id);
    const diffClass = (p.difficulty === 'Boshlang\'ich') ? 'diff-boshlangich' : (p.difficulty === 'Ekspert') ? 'diff-ekspert' : 'diff-orta';

    html += `
      <div class="prompt-card" data-prompt-id="${p.id}">
        <div class="prompt-card-top">
          <span class="prompt-category-badge">${p.categoryIcon} ${p.subcategoryName}</span>
          <span class="prompt-difficulty-badge ${diffClass}">${p.difficulty}</span>
        </div>
        <h3 class="prompt-card-title">${escapeHtml(p.title)}</h3>
        <p class="prompt-card-desc">${escapeHtml(p.description)}</p>
        
        <div class="prompt-code-preview" title="To'liq o'qish uchun bosing">
          <code>${escapeHtml(p.prompt)}</code>
        </div>

        <div class="prompt-card-footer">
          <div class="prompt-tags-list">
            ${(p.tags || []).slice(0, 3).map(t => `<span class="prompt-tag-item">#${escapeHtml(t)}</span>`).join(' ')}
          </div>
          <div class="prompt-card-actions">
            <button class="btn-card-action btn-copy-prompt" data-prompt-id="${p.id}" title="Nusxalash">
              📋 Nusxa
            </button>
            <button class="btn-card-action btn-fav-prompt ${isFav ? 'fav-active' : ''}" data-prompt-id="${p.id}" title="Sevimlilarga qo'shish">
              ${isFav ? '⭐' : '☆'}
            </button>
          </div>
        </div>
      </div>
    `;
  });

  promptsGridContainer.innerHTML = html;

  // Pagination ko'rsatish
  if (promptsPagination) {
    if (data.totalPages > 1) {
      promptsPagination.style.display = 'flex';
      if (pageIndicatorText) {
        pageIndicatorText.textContent = `Sahifa ${data.page} / ${data.totalPages}`;
      }
      if (btnPrevPage) btnPrevPage.disabled = (data.page <= 1);
      if (btnNextPage) btnNextPage.disabled = (data.page >= data.totalPages);
    } else {
      promptsPagination.style.display = 'none';
    }
  }

  // Card click eventlari
  promptsGridContainer.querySelectorAll('.prompt-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.btn-copy-prompt') || e.target.closest('.btn-fav-prompt')) return;
      const id = parseInt(card.dataset.promptId, 10);
      const found = list.find(x => x.id === id);
      if (found) openPromptModal(found);
    });
  });

  // Nusxalash
  promptsGridContainer.querySelectorAll('.btn-copy-prompt').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.promptId, 10);
      const found = list.find(x => x.id === id);
      if (found) {
        copyPromptText(found.prompt);
      }
    });
  });

  // Sevimlilar
  promptsGridContainer.querySelectorAll('.btn-fav-prompt').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.promptId, 10);
      togglePromptFavorite(id, btn);
    });
  });
}

function openPromptModal(prompt) {
  currentModalPrompt = prompt;
  if (!promptModalOverlay) return;

  if (modalPromptIcon) modalPromptIcon.textContent = prompt.categoryIcon;
  if (modalPromptTitle) modalPromptTitle.textContent = prompt.title;
  if (modalPromptMeta) {
    modalPromptMeta.innerHTML = `
      <span class="prompt-category-badge">${prompt.categoryIcon} ${prompt.categoryName} » ${prompt.subcategoryName}</span>
      <span class="prompt-difficulty-badge diff-orta">${prompt.difficulty}</span>
    `;
  }
  if (modalPromptDesc) modalPromptDesc.textContent = prompt.description;
  if (modalPromptText) modalPromptText.textContent = prompt.prompt;

  promptModalOverlay.style.display = 'flex';
  triggerHaptic('medium');
}

function closePromptModal() {
  if (promptModalOverlay) promptModalOverlay.style.display = 'none';
  currentModalPrompt = null;
}

function togglePromptFavorite(promptId, btnElem = null) {
  triggerHaptic('selection');
  if (userFavIds.has(promptId)) {
    userFavIds.delete(promptId);
    showToast("❌ Sevimlilardan olib tashlandi");
    if (btnElem) {
      btnElem.classList.remove('fav-active');
      btnElem.innerHTML = '☆';
    }
  } else {
    userFavIds.add(promptId);
    showToast("⭐ Sevimli ro'yxatga saqlandi!");
    if (btnElem) {
      btnElem.classList.add('fav-active');
      btnElem.innerHTML = '⭐';
    }
  }

  localStorage.setItem('vp_fav_prompts', JSON.stringify(Array.from(userFavIds)));
  if (favCountBadge) favCountBadge.textContent = userFavIds.size;
}

function copyPromptText(text) {
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    showToast("📋 AI Prompt nusxalandi! Chatga qo'yib ishlatishingiz mumkin.");
    triggerHaptic('success');
  }).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast("📋 AI Prompt nusxalandi!");
    triggerHaptic('success');
  });
}

async function fetchRandomPrompt() {
  triggerHaptic('medium');
  try {
    let url = '/api/prompts/random';
    if (currentPromptCat !== 'all') {
      url += `?category=${encodeURIComponent(currentPromptCat)}`;
    }
    const res = await fetch(url);
    const json = await res.json();
    if (json.success && json.data) {
      openPromptModal(json.data);
    }
  } catch (e) {
    showToast("⚠️ Promptni yuklab bo'lmadi");
  }
}

function setupPromptsUI() {
  // Tab tugmalari
  if (tabBtnTranscripts) {
    tabBtnTranscripts.addEventListener('click', () => switchTab('transcripts'));
  }
  if (tabBtnPrompts) {
    tabBtnPrompts.addEventListener('click', () => switchTab('prompts'));
  }

  // URL parametridan tabni tekshirish
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('tab') === 'prompts') {
    switchTab('prompts');
  }

  // Qidiruv
  if (promptSearchInput) {
    promptSearchInput.addEventListener('input', (e) => {
      clearTimeout(promptDebounceTimer);
      const val = e.target.value.trim();
      if (clearPromptSearchBtn) clearPromptSearchBtn.style.display = val ? 'block' : 'none';
      
      promptDebounceTimer = setTimeout(() => {
        promptSearchQuery = val;
        currentPromptPage = 1;
        loadPrompts();
      }, 350);
    });
  }

  if (clearPromptSearchBtn) {
    clearPromptSearchBtn.addEventListener('click', () => {
      if (promptSearchInput) promptSearchInput.value = '';
      promptSearchQuery = '';
      clearPromptSearchBtn.style.display = 'none';
      currentPromptPage = 1;
      loadPrompts();
    });
  }

  // Tasodifiy prompt
  if (btnRandomPrompt) {
    btnRandomPrompt.addEventListener('click', fetchRandomPrompt);
  }

  // Sevimlilar filtri
  if (btnFavoritesToggle) {
    btnFavoritesToggle.addEventListener('click', () => {
      isFavsOnly = !isFavsOnly;
      btnFavoritesToggle.classList.toggle('active', isFavsOnly);
      triggerHaptic('selection');
      currentPromptPage = 1;
      loadPrompts();
    });
  }

  // Sahifalash
  if (btnPrevPage) {
    btnPrevPage.addEventListener('click', () => {
      if (currentPromptPage > 1) {
        currentPromptPage--;
        triggerHaptic('selection');
        loadPrompts();
        window.scrollTo({ top: 180, behavior: 'smooth' });
      }
    });
  }

  if (btnNextPage) {
    btnNextPage.addEventListener('click', () => {
      currentPromptPage++;
      triggerHaptic('selection');
      loadPrompts();
      window.scrollTo({ top: 180, behavior: 'smooth' });
    });
  }

  // Modal yopish
  if (btnCloseModal) {
    btnCloseModal.addEventListener('click', closePromptModal);
  }
  if (promptModalOverlay) {
    promptModalOverlay.addEventListener('click', (e) => {
      if (e.target === promptModalOverlay) closePromptModal();
    });
  }

  // Modal Nusxalash
  if (btnCopyModalPrompt) {
    btnCopyModalPrompt.addEventListener('click', () => {
      if (currentModalPrompt) {
        copyPromptText(currentModalPrompt.prompt);
      }
    });
  }

  // Modal "AI Bilan Yozish"
  if (btnUseModalPrompt) {
    btnUseModalPrompt.addEventListener('click', () => {
      if (!currentModalPrompt) return;
      copyPromptText(currentModalPrompt.prompt);
      showToast("🚀 Prompt nusxalandi! Telegram botga yuboring yoki AI da sinang.");
      if (tg?.close) {
        setTimeout(() => {
          try { tg.close(); } catch(e) {}
        }, 1200);
      }
    });
  }

  if (favCountBadge) {
    favCountBadge.textContent = userFavIds.size;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initTelegram();
  setupFilters();
  setupLiveRecorder();
  loadTranscripts();
  setupPromptsUI();
});

