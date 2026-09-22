import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'transcripts.json');

// Papka va fayl mavjudligini tekshirish
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Boshlang'ich namunaviy ma'lumotlar
const initialSamples = [
  {
    id: "sample-1",
    userId: "demo",
    title: "Startup MVP va Dizayn Muhokamasi",
    language: "O'zbekcha",
    date: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    duration: "02:15",
    summary: "Haftalik dasturlash rejalari, Telegram Web App integratsiyasi va foydalanuvchi interfeysidagi asosiy tugmalar dizayni tasdiqlandi.",
    action_items: [
      "Telegram bot uchun @BotFather orqali yangi token olish",
      "Web App interfeysini qorong'u rejim (dark mode) bilan sinash",
      "Juma kuniga qadar demo versiyani guruhga ulashish"
    ],
    full_transcript: "Assalomu alaykum do'stlar. Bugungi rejamiz bo'yicha Telegram botimizning frontend qismini yakunlashimiz kerak. Ovozli xabarlar kelganda bir zumda tahlil qilinishi juda muhim. Web App dizayniga ham e'tibor beringlar, qorong'u rejimda juda chiroyli ko'rinsin. Kimda savol bo'lsa, chatda yozing.",
    isCompleted: false
  },
  {
    id: "sample-2",
    userId: "demo",
    title: "Mijoz bilan muzokara: E-commerce loyihasi",
    language: "O'zbekcha",
    date: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    duration: "04:30",
    summary: "Mijoz onlayn do'kon uchun to'lov tizimlarini (Click, Payme) ulashni va buyurtmalar holatini SMS orqali yuborishni so'radi.",
    action_items: [
      "Click va Payme API hujjatlarini o'rganish",
      "Hisob-kitob sahifasini yangilash va hisob-faktura (invoice) generatsiyasini qo'shish",
      "Dushanba soat 10:00 da oraliq hisobot berish"
    ],
    full_transcript: "Mijoz bilan gaplashdik. Ular buyurtmalarni avtomatik tarzda qabul qilib, to'lov muvaffaqiyatli bo'lsa xaridorga chek yuborishni xohlashyapti. Texnik topshiriqni tayyorlab, jamoaga yuboraman.",
    isCompleted: true
  },
  {
    id: "sample-3",
    userId: "demo",
    title: "Marketing va Target Reklama Byudjeti",
    language: "Ruscha / O'zbekcha",
    date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    duration: "01:45",
    summary: "Kelasi oy uchun 500$ byudjet ajratildi. Asosiy e'tibor Instagram Reels va Telegram kanallaridagi postlarga qaratiladi.",
    action_items: [
      "3 ta yangi video rolik tayyorlash",
      "Kreativ bannerlar dizaynini yakunlash",
      "A/B test natijalarini haftalik hisobotga kiritish"
    ],
    full_transcript: "Biz target byudjetini tasdiqladik. Birinchi navbatda qiziqarli video kontentga urg'u beramiz. Samaradorlikni har kuni kuzatib borish shart.",
    isCompleted: false
  }
];

if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(initialSamples, null, 2), 'utf-8');
}

export function getAllTranscripts(userId = null) {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const items = JSON.parse(raw);
    if (!userId || userId === 'demo') return items;
    return items.filter(i => i.userId === String(userId) || i.userId === 'demo');
  } catch (err) {
    console.error("Storage o'qishda xatolik:", err);
    return [];
  }
}

export function getTranscriptById(id) {
  const items = getAllTranscripts();
  return items.find(i => i.id === id) || null;
}

export function saveTranscript(data) {
  try {
    const items = getAllTranscripts();
    const newItem = {
      id: 'item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      date: new Date().toISOString(),
      isCompleted: false,
      ...data
    };
    items.unshift(newItem); // Eng yangisini boshiga qo'shish
    fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2), 'utf-8');
    return newItem;
  } catch (err) {
    console.error("Storage yozishda xatolik:", err);
    throw err;
  }
}

export function toggleActionItem(id, itemIndex) {
  try {
    const items = getAllTranscripts();
    const item = items.find(i => i.id === id);
    if (item) {
      if (!item.completedActions) item.completedActions = {};
      item.completedActions[itemIndex] = !item.completedActions[itemIndex];
      fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2), 'utf-8');
      return item;
    }
    return null;
  } catch (err) {
    console.error("Storage yangilashda xatolik:", err);
    return null;
  }
}

export function deleteTranscript(id) {
  try {
    let items = getAllTranscripts();
    items = items.filter(i => i.id !== id);
    fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error("Storage o'chirishda xatolik:", err);
    return false;
  }
}
