import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

let aiClient = null;

function getAIClient() {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

async function callGeminiText(prompt, temperature = 0.3) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return "API kalit topilmadi.";

  const client = getAIClient();
  const models = ['gemini-3.6-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

  for (const model of models) {
    try {
      const res = await client.models.generateContent({
        model,
        contents: prompt,
        config: { temperature }
      });
      if (res.text) return res.text.trim();
    } catch (e) {
      console.warn(`Tools model ${model} xatosi:`, e.message);
    }
  }

  return "Xizmat vaqtincha band, birozdan so'ng urinib ko'ring.";
}

/**
 * SMM va Ijtimoiy Tarmoqlar uchun Post Generatsiyasi
 */
export async function generateSocialPost(transcript, platform = 'telegram') {
  let instructions = '';
  if (platform === 'telegram') {
    instructions = "Telegram kanallari uchun zo'r post tayyorlang: diqqatni tortuvchi sarlavha, qisqa abzaslar, mos emojilar va 3-5 ta xeshteg.";
  } else if (platform === 'linkedin') {
    instructions = "LinkedIn uchun professional biznes uslubida post yozing: qimmatli xulosalar, fikrlash uchun savol va professional xeshteglar.";
  } else if (platform === 'twitter') {
    instructions = "Twitter/X uchun 3-4 ta ketma-ket qiziqarli tvitlar zanjiri (Thread) tayyorlang (har bir tvit raqamlansin: 1/4, 2/4...).";
  } else if (platform === 'reels') {
    instructions = "Instagram Reels / YouTube Shorts / TikTok uchun 30-45 soniyalik video ssenariy tayyorlang: [Vizual kadr], [Gapiriladigan matn], [Haraktga chaqiruv].";
  } else if (platform === 'email') {
    instructions = "Xodimlar yoki rahbariyatga yuboriladigan rasmiy va xushmuomala Email xat tayyorlang: Mavzu (Subject), Salomlashish, Asosiy mazmun va Xulosa.";
  }

  const prompt = `
Siz professional kopirayter va SMM mutaxassisisiz.
Quyidagi nutq matnidan foydalanib, belgilangan platforma uchun kontent tayyorlang.

Platforma talabi: ${instructions}

Nutq matni:
"""
${transcript}
"""

Faqat tayyor post matnini o'zbek tilida qaytaring.
`;

  return await callGeminiText(prompt, 0.5);
}

/**
 * Quiz / Test Savollari Generatsiyasi
 */
export async function generateQuiz(transcript) {
  const prompt = `
Siz professional o'qituvchisiz.
Quyidagi matn asosida talabalar yoki xodimlar bilimini tekshirish uchun 3 ta 4 variantli (A, B, C, D) test savoli tuzing.

Matn:
"""
${transcript}
"""

JAVOBNI FAQAT QUYIDAGI VALID JSON FORMATIDA QAYTARING:
[
  {
    "question": "1-savol matni?",
    "options": ["A) Variant", "B) Variant", "C) Variant", "D) Variant"],
    "correct": 0,
    "explanation": "Nega bu javob to'g'riligi haqida qisqa izoh"
  }
]
`;

  const raw = await callGeminiText(prompt, 0.2);
  const cleaned = raw.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    return [];
  }
}

/**
 * MindMap (G'oyalar Xaritasi) Generatsiyasi
 */
export async function generateMindmap(transcript) {
  const prompt = `
Quyidagi matnning g'oyaviy tuzilmasini (Mindmap) vizual daraxt ko'rinishida tuzing.
Faqat chiroyli emojilar va shoxlangan daraxt chiziqlari (├──, └──, │) bilan ifodalang.

Matn:
"""
${transcript}
"""

Natijani quyidagi ko'rinishda chiroyli matn qilib bering:
🧠 ASOSIY MAVZU
├── 📌 1-Bo'lim
│   ├── • Fikr A
│   └── • Fikr B
├── 🎯 2-Bo'lim
└── 🏁 Yakuniy qaror
`;

  return await callGeminiText(prompt, 0.3);
}

/**
 * ELI5 - "5 yoshli bolaga tushuntir"
 */
export async function generateELI5(transcript) {
  const prompt = `
Quyidagi matndagi mavzuni xuddi 5 yoshli bolaga tushuntirayotgandek, o'ta oddiy, qiziqarli, sodda o'xshatishlar va ertaknamo uslubda tushuntirib bering.
Hech qanday murakkab so'z ishlatmang.

Matn:
"""
${transcript}
"""
`;

  return await callGeminiText(prompt, 0.6);
}

/**
 * 10 Tilli Tarjimon
 */
export async function translateText(text, targetLangCode = 'ru') {
  const langNames = {
    ru: 'Rus tiliga (Русский)',
    en: 'Ingliz tiliga (English)',
    tr: 'Turk tiliga (Türkçe)',
    ar: 'Arab tiliga (العربية)',
    de: 'Nemis tiliga (Deutsch)',
    fr: 'Fransuz tiliga (Français)',
    zh: 'Xitoy tiliga (中文)',
    ko: 'Koreys tiliga (한국어)',
    ja: 'Yapon tiliga (日本語)',
    es: 'Ispan tiliga (Español)'
  };

  const targetLang = langNames[targetLangCode] || 'Ingliz tili';

  const prompt = `
Quyidagi matnni aniq, ravon va adabiy tarzda ${targetLang} tarjima qiling.
Faqat tarjimani qaytaring, boshqa hech narsa yozmang.

Matn:
"""
${text}
"""
`;

  return await callGeminiText(prompt, 0.2);
}

/**
 * Notiqlik tahlili va Parazit so'zlar detektori
 */
export async function analyzeSpeechQuality(transcript) {
  const prompt = `
Siz notiqlik mahorati bo'yicha professional ekspertsiz.
Ushbu nutq matnini tahlil qiling:
1. Nutqdagi parazit so'zlarni aniqlang ("haligi", "nima deydi", "anaqa", "eshityapsanmi", "xo'sh", "yani", "qanaqadir", "tak", "koroche" va hokazo).
2. Ularning sonini sanang.
3. Notiqqa 10 ballik tizimda baho qo'ying (Nutq ravonligi va tozaligi).
4. Barcha parazit so'zlardan tozalangan, chiroyli va mukammal matn variantini yozing.
5. Notiqqa nutqini yaxshilash uchun 2 ta maslahat bering.

JAVOBNI FAQAT VALID JSON FORMATIDA QAYTARING:
{
  "score": 8,
  "filler_count": 5,
  "filler_words": ["haligi (2 marta)", "anaqa (3 marta)"],
  "advice": ["Maslahat 1", "Maslahat 2"],
  "cleaned_text": "Barcha keraksiz so'zlardan tozalangan ideal matn"
}
`;

  const raw = await callGeminiText(prompt, 0.2);
  const cleaned = raw.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    return {
      score: 8,
      filler_count: 0,
      filler_words: [],
      advice: ["Nutq yaxshi va ravon."],
      cleaned_text: transcript
    };
  }
}
