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

/**
 * Audio faylni tahlil qilish (Transkripsiya + Xulosa + Topshiriqlar)
 * @param {Buffer} audioBuffer - Audio fayl buferi (.ogg, .mp3, .m4a, etc.)
 * @param {string} mimeType - Audio mime turi (masalan: audio/ogg)
 * @param {string} titleHint - Fayl nomi yoki dastlabki sarlavha
 */
export async function analyzeAudio(audioBuffer, mimeType = 'audio/ogg', titleHint = 'Ovozli xabar') {
  const apiKey = process.env.GEMINI_API_KEY;

  // Agar API kalit kiritilmagan bo'lsa, sinov uchun demo ma'lumot qaytaramiz
  if (!apiKey || apiKey.trim() === '' || apiKey.includes('YOUR_GEMINI_API_KEY')) {
    console.warn('⚠️ GEMINI_API_KEY topilmadi! Demo rejimida namunaviy natija qaytarilmoqda.');
    return {
      title: `${titleHint} (Demo Tahlil)`,
      language: "O'zbekcha",
      summary: "Ushbu ovozli xabarda yangi haftalik loyiha rejalari, dizayn talablari va server arxitekturasi muhokama qilindi. Jamoa a'zolariga tegishli vazifalar taqsimlandi.",
      action_items: [
        "Backend server va ma'lumotlar bazasi sxemasini yakunlash",
        "Telegram Web App interfeysi dizaynini tasdiqlash",
        "Juma kuniga qadar MVP test versiyasini taqdim etish"
      ],
      full_transcript: "Assalomu alaykum jamoa. Bugungi majlisimizda yangi startup loyihasini muhokama qilamiz. Hamma o'z vazifalarini vaqtida topshirishi kerak. Dizayn tayyor bo'lgach, frontend va botni ulaymiz. Rahmat hammaga!",
      isDemo: true
    };
  }

  const client = getAIClient();
  const base64Data = audioBuffer.toString('base64');

  const systemPrompt = `
Siz professional audio tahlilchi va majlis protokollarini tuzuvchi sun'iy intellektsiz.
Sizga Telegram ovozli xabari yoki audio fayl beriladi. Siz uni diqqat bilan eshitib:
1. Audioda aytilgan so'zma-so'z matnni (transkripsiya) aniqlang (o'zbek, rus, ingliz yoki aralash so'zlashuv bo'lsa ham to'g'ri yozing).
2. Qisqacha mazmun (Xulosa / TL;DR) chiqaring.
3. Barcha aytilgan topshiriqlar, kelishuvlar yoki harakatlar ro'yxatini (Action items / To-Do) aniqlang.
4. Mos sarlavha tanlang.

JAVOBNI FAQAT QUYIDAGI VALID JSON FORMATIDA QAYTARING:
{
  "title": "Qisqa va aniq sarlavha (masalan: Marketing majlisi yoki Loyiha topshiriqlari)",
  "language": "Audioda gapirilgan til (masalan: O'zbekcha, Ruscha, Inglizcha)",
  "summary": "Audio haqida 2-4 gapdan iborat qisqacha asosiy xulosa",
  "action_items": [
    "1-vazifa yoki kelishuv",
    "2-vazifa..."
  ],
  "full_transcript": "Audiodagi gaplarning to'liq, so'zma-so'z matni"
}
Eslatma: Faqat JSON qaytaring, boshqa hech qanday belgi yoki kirish so'zi qo'shmang!
`;

  try {
    const modelsToTry = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash'];
    let lastError = null;

    for (const model of modelsToTry) {
      try {
        const response = await client.models.generateContent({
          model,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType: mimeType || 'audio/ogg',
                    data: base64Data
                  }
                },
                {
                  text: systemPrompt
                }
              ]
            }
          ]
        });

        const rawText = response.text ? response.text.trim() : '';
        // JSON tozalash (agar markdown ```json ... ``` bilan o'ralgan bo'lsa)
        const cleanedJson = rawText
          .replace(/^```json/i, '')
          .replace(/^```/, '')
          .replace(/```$/, '')
          .trim();

        try {
          const parsed = JSON.parse(cleanedJson);
          return {
            title: parsed.title || titleHint,
            language: parsed.language || "Aniqlanmadi",
            summary: parsed.summary || "Xulosa mavjud emas.",
            action_items: Array.isArray(parsed.action_items) ? parsed.action_items : [],
            full_transcript: parsed.full_transcript || rawText,
            isDemo: false
          };
        } catch (jsonErr) {
          // Agar JSON parse bo'lmasa, umumiy matn sifatida qaytaramiz
          return {
            title: titleHint,
            language: "Aniqlanmadi",
            summary: rawText.slice(0, 300) + '...',
            action_items: [],
            full_transcript: rawText,
            isDemo: false
          };
        }
      } catch (err) {
        lastError = err;
        console.warn(`Model ${model} bilan xatolik yuz berdi:`, err.message);
        // Keyingi modelga o'tish
      }
    }

    throw lastError || new Error("Gemini modellari javob bermadi");
  } catch (error) {
    console.error("AI tahlilida xatolik:", error);
    throw error;
  }
}
