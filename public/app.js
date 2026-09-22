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

document.addEventListener('DOMContentLoaded', () => {
  initTelegram();
  setupFilters();
  setupLiveRecorder();
  loadTranscripts();
});
