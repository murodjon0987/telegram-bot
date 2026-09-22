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

// Telegram WebApp sozlamalari
function initTelegram() {
  if (tg) {
    try {
      tg.ready();
      tg.expand();
      
      // Ranglarni moslash
      if (tg.setHeaderColor) {
        tg.setHeaderColor('#0a0d14');
      }
      if (tg.setBackgroundColor) {
        tg.setBackgroundColor('#0a0d14');
      }

      // Foydalanuvchi ma'lumotlarini o'qish
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

// Haptic (tebranish) effekti
function triggerHaptic(type = 'light') {
  if (tg?.HapticFeedback) {
    try {
      tg.HapticFeedback.impactOccurred(type);
    } catch (e) {}
  }
}

// Toast xabarini chiqarish
function showToast(message) {
  if (!toastNotify || !toastMessageText) return;
  toastMessageText.textContent = message;
  toastNotify.style.display = 'block';
  setTimeout(() => {
    toastNotify.style.display = 'none';
  }, 2200);
}

// Konspektlarni serverdan yuklash
async function loadTranscripts() {
  try {
    const res = await fetch('/api/transcripts');
    const json = await res.json();
    if (json.success) {
      allTranscripts = json.data || [];
      renderTranscripts();
      updateMetrics();

      // Agar URL da maxsus ?item= parametri bo'lsa, uni topib ajratib ko'rsatish
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

// Metrikalarni hisoblash
function updateMetrics() {
  if (!metricTotalCount) return;
  metricTotalCount.textContent = allTranscripts.length;

  // Jami topshiriqlar va bajarilganlarini hisoblash
  let totalTasks = 0;
  let completedTasks = 0;

  allTranscripts.forEach(item => {
    const actions = item.action_items || [];
    totalTasks += actions.length;
    actions.forEach((_, idx) => {
      if (item.completedActions && item.completedActions[idx]) {
        completedTasks++;
      }
    });
  });

  const percent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100;
  if (metricProgressPercent) metricProgressPercent.textContent = `${percent}%`;
  if (metricProgressBar) metricProgressBar.style.width = `${percent}%`;
}

// Ro'yxatni render qilish
function renderTranscripts() {
  if (!listContainer) return;

  // Filtrlash
  let filtered = allTranscripts.filter(item => {
    // Qidiruv filtri
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (item.title || '').toLowerCase().includes(q);
      const matchSummary = (item.summary || '').toLowerCase().includes(q);
      const matchTranscript = (item.full_transcript || '').toLowerCase().includes(q);
      const matchActions = (item.action_items || []).some(a => a.toLowerCase().includes(q));
      if (!matchTitle && !matchSummary && !matchTranscript && !matchActions) {
        return false;
      }
    }

    // Tab filtri
    if (activeFilter === 'with-tasks') {
      return (item.action_items && item.action_items.length > 0);
    }
    if (activeFilter === 'uzbek') {
      return (item.language || '').toLowerCase().includes("o'zbek");
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

  // Hodisalarni ulash
  attachCardEvents();
}

// Bitta karta HTML kodini generatsiya qilish
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

  return `
    <article class="transcript-card" id="card-${item.id}">
      <div class="card-header">
        <div>
          <div class="card-tags">
            <span class="tag tag-time">📅 ${formattedDate}</span>
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

      <!-- Xulosa -->
      <div class="card-summary">
        <div class="summary-heading">💡 Qisqacha Mazmun</div>
        <p class="summary-text">${escapeHTML(item.summary || "Xulosa yo'q.")}</p>
      </div>

      <!-- Topshiriqlar ro'yxati -->
      ${actionsHTML}

      <!-- To'liq transkripsiya akordeoni -->
      <div class="transcript-accordion">
        <button class="accordion-toggle" data-accordion-id="${item.id}">
          <span>📜 So'zma-so'z matnni ko'rish</span>
          <span class="toggle-icon">▼</span>
        </button>
        <div class="transcript-body" id="transcript-body-${item.id}">
          ${escapeHTML(item.full_transcript || "Matn mavjud emas.")}
        </div>
      </div>

      <!-- Karta pastki tugmalari -->
      <div class="card-footer">
        <button class="card-btn btn-copy" data-copy-id="${item.id}">
          📋 Xulosani nusxalash
        </button>
        <button class="card-btn btn-share" data-share-id="${item.id}">
          📤 Ulashish
        </button>
      </div>
    </article>
  `;
}

// Hodisalarni ulash (Checkboxes, Accordions, Delete, Copy)
function attachCardEvents() {
  // Checkbox bosilishi
  document.querySelectorAll('.action-item').forEach(label => {
    label.addEventListener('click', async (e) => {
      // Input yoki label o'ziga bitta event bo'lishi uchun
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
          if (item) {
            item.completedActions = json.data.completedActions;
          }
          label.classList.toggle('completed');
          updateMetrics();
        }
      } catch (err) {
        console.error("Topshiriq holatini yangilashda xato:", err);
      }
    });
  });

  // Akordeonni ochish / yopish
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

  // Nusxalash
  document.querySelectorAll('.btn-copy').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.copyId;
      const item = allTranscripts.find(t => t.id === id);
      if (!item) return;

      let textToCopy = `📌 ${item.title}\n\n💡 QISQACHA MAZMUN:\n${item.summary}\n\n`;
      if (item.action_items && item.action_items.length > 0) {
        textToCopy += `✅ TOPSHIRIQLAR:\n` + item.action_items.map((a, i) => `${i + 1}. ${a}`).join('\n') + `\n\n`;
      }
      textToCopy += `📜 TO'LIQ MATN:\n${item.full_transcript}`;

      navigator.clipboard.writeText(textToCopy).then(() => {
        showToast("Protokol matni nusxalandi! 📋");
        triggerHaptic('medium');
      }).catch(() => {
        showToast("Nusxalash imkoni bo'lmadi");
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
        navigator.share({
          title: item.title,
          text: shareText
        }).catch(() => {});
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

// Xavfsiz matn
function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// Yangi namuna qo'shish (Tezkor test)
function setupSimulator() {
  const btnAdd = document.getElementById('btn-add-demo-sample');
  if (btnAdd) {
    btnAdd.addEventListener('click', async () => {
      triggerHaptic('medium');
      const sampleTopics = [
        {
          title: "Mobil ilova release & QA test rejalari",
          language: "O'zbekcha",
          duration: "03:12",
          summary: "Yangi versiyadagi barcha xatolar (buglar) tekshirildi. Android va iOS platformalariga yangilanish yuborish vaqti belgilandi.",
          action_items: [
            "Bugungi release buildini test serveriga yuklash",
            "To'lov integratsiyasini oxirgi marta qayta tekshirish",
            "App Store va Play Market uchun skrinshotlarni tayyorlash"
          ],
          full_transcript: "Jamoa, yangilanish tayyor. QA barcha testlarni o'tkazdi. Ertaga ertalab soat 9:00 da yangi versiyani do'konlarga yuklaymiz. Hammaga rahmat!"
        },
        {
          title: "Sotuv bo'limi haftalik tahlili",
          language: "O'zbekcha / Ruscha",
          duration: "02:40",
          summary: "O'tgan haftada 45 ta yangi mijoz bilan shartnoma imzolandi. Konversiya 18% ga oshdi. Yangi CRM tizimiga o'tish taklif qilindi.",
          action_items: [
            "CRM tizimi tariflarini solishtirish",
            "Sotuvchilarga yangi skriptlarni tarqatish"
          ],
          full_transcript: "Bu hafta yaxshi natija ko'rsatdik. Ayniqsa korporativ mijozlar soni oshdi. Keyingi haftadan yangi skriptlar bo'yicha qo'ng'iroqlarni boshlaymiz."
        }
      ];

      const chosen = sampleTopics[Math.floor(Math.random() * sampleTopics.length)];

      try {
        const res = await fetch('/api/transcripts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: 'demo',
            ...chosen
          })
        });
        const json = await res.json();
        if (json.success) {
          allTranscripts.unshift(json.data);
          renderTranscripts();
          updateMetrics();
          showToast("Yangi konspekt qo'shildi! ⚡");
          
          // Yangi qo'shilgan kartaga scroll qilish
          const newCard = document.getElementById(`card-${json.data.id}`);
          if (newCard) {
            newCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      } catch (err) {
        showToast("Qo'shishda xatolik");
      }
    });
  }

  // Modal ko'rsatish
  const btnGuide = document.getElementById('btn-open-bot-guide');
  const modal = document.getElementById('guide-modal');
  const closeBtn = document.getElementById('close-guide-modal-btn');
  const gotItBtn = document.getElementById('btn-modal-got-it');

  if (btnGuide && modal) {
    btnGuide.addEventListener('click', () => {
      modal.style.display = 'flex';
      triggerHaptic('light');
    });
  }

  const hideModal = () => {
    if (modal) modal.style.display = 'none';
  };

  if (closeBtn) closeBtn.addEventListener('click', hideModal);
  if (gotItBtn) gotItBtn.addEventListener('click', hideModal);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) hideModal();
    });
  }
}

// Qidiruv va filtrlar
function setupFilters() {
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim();
      if (clearSearchBtn) {
        clearSearchBtn.style.display = searchQuery ? 'block' : 'none';
      }
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

// Dasturni ishga tushirish
document.addEventListener('DOMContentLoaded', () => {
  initTelegram();
  setupFilters();
  setupSimulator();
  loadTranscripts();
});
