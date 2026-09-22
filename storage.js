import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'transcripts.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const GROUPS_FILE = path.join(DATA_DIR, 'groups.json');

// Papka va fayllarni tekshirish
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function safeRead(filePath, fallback = []) {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2), 'utf-8');
      return fallback;
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (e) {
    console.error(`Xatolik o'qishda ${filePath}:`, e);
    return fallback;
  }
}

function safeWrite(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error(`Xatolik yozishda ${filePath}:`, e);
  }
}

// Barcha konspektlar
export function getAllTranscripts(userId = null) {
  const items = safeRead(DATA_FILE, []);
  if (!userId || userId === 'demo') return items;
  return items.filter(i => i.userId === String(userId) || i.userId === 'demo');
}

// Bitta konspekt
export function getTranscriptById(id) {
  const items = getAllTranscripts();
  return items.find(i => i.id === id) || null;
}

// Foydalanuvchining eng oxirgi audiosi (Chat konteksti uchun)
export function getLastTranscriptByUser(userId) {
  const items = getAllTranscripts(userId);
  return items[0] || null;
}

// Yangi konspekt saqlash
export function saveTranscript(data) {
  const items = safeRead(DATA_FILE, []);
  
  // Avtomatik kategoriya aniqlash
  let category = 'Umumiy';
  const text = ((data.title || '') + ' ' + (data.summary || '')).toLowerCase();
  if (text.includes('dori') || text.includes("ko'z") || text.includes('shifokor') || text.includes("og'riq")) {
    category = 'Salomatlik';
  } else if (text.includes('majlis') || text.includes('loyiha') || text.includes('backend') || text.includes('reja') || text.includes('topshiriq')) {
    category = 'Ish & Biznes';
  } else if (text.includes('dars') || text.includes('imtihon') || text.includes('universitet')) {
    category = "Ta'lim";
  } else if (text.includes('pul') || text.includes('byudjet') || text.includes('dollar') || text.includes('to\'lov')) {
    category = 'Moliya';
  }

  const newItem = {
    id: 'item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    date: new Date().toISOString(),
    category,
    isCompleted: false,
    ...data
  };

  items.unshift(newItem);
  safeWrite(DATA_FILE, items);

  // Foydalanuvchi statistikasini oshirish
  if (data.userId) {
    incrementUserAudioCount(data.userId);
  }

  return newItem;
}

// Topshiriq holatini o'zgartirish
export function toggleActionItem(id, itemIndex) {
  const items = safeRead(DATA_FILE, []);
  const item = items.find(i => i.id === id);
  if (item) {
    if (!item.completedActions) item.completedActions = {};
    item.completedActions[itemIndex] = !item.completedActions[itemIndex];
    safeWrite(DATA_FILE, items);
    return item;
  }
  return null;
}

// Konspektni o'chirish
export function deleteTranscript(id) {
  let items = safeRead(DATA_FILE, []);
  const filtered = items.filter(i => i.id !== id);
  safeWrite(DATA_FILE, filtered);
  return true;
}

// Foydalanuvchilarni saqlash / yangilash
export function registerOrUpdateUser(user) {
  if (!user || !user.id) return;
  const users = safeRead(USERS_FILE, []);
  const uid = String(user.id);
  let existing = users.find(u => u.id === uid);

  if (!existing) {
    existing = {
      id: uid,
      username: user.username || '',
      firstName: user.first_name || '',
      language: user.language_code || 'uz',
      joinedAt: new Date().toISOString(),
      audioCount: 0
    };
    users.push(existing);
  } else {
    existing.username = user.username || existing.username;
    existing.firstName = user.first_name || existing.firstName;
    existing.lastActive = new Date().toISOString();
  }

  safeWrite(USERS_FILE, users);
  return existing;
}

export function getAllUsers() {
  return safeRead(USERS_FILE, []);
}

function incrementUserAudioCount(userId) {
  const users = safeRead(USERS_FILE, []);
  const user = users.find(u => u.id === String(userId));
  if (user) {
    user.audioCount = (user.audioCount || 0) + 1;
    safeWrite(USERS_FILE, users);
  }
}

// Guruhlarni qayd qilish
export function registerGroup(chat) {
  if (!chat || !chat.id) return;
  const groups = safeRead(GROUPS_FILE, []);
  const gid = String(chat.id);
  let existing = groups.find(g => g.id === gid);

  if (!existing) {
    existing = {
      id: gid,
      title: chat.title || 'Noma\'lum guruh',
      type: chat.type,
      joinedAt: new Date().toISOString(),
      messagesCount: 1
    };
    groups.push(existing);
  } else {
    existing.title = chat.title || existing.title;
    existing.messagesCount = (existing.messagesCount || 0) + 1;
  }

  safeWrite(GROUPS_FILE, groups);
}

export function getAllGroups() {
  return safeRead(GROUPS_FILE, []);
}

// Tizim umumiy statistikasi (Admin uchun)
export function getSystemStats() {
  const transcripts = safeRead(DATA_FILE, []);
  const users = safeRead(USERS_FILE, []);
  const groups = safeRead(GROUPS_FILE, []);

  let totalTasks = 0;
  let completedTasks = 0;
  transcripts.forEach(t => {
    const acts = t.action_items || [];
    totalTasks += acts.length;
    acts.forEach((_, i) => {
      if (t.completedActions && t.completedActions[i]) completedTasks++;
    });
  });

  return {
    totalTranscripts: transcripts.length,
    totalUsers: users.length,
    totalGroups: groups.length,
    totalTasks,
    completedTasks,
    taskCompletionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100
  };
}
