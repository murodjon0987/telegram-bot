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
Siz o'ta aniq ishlaydigan professional audio transkriptor va nutq tahlilchisisiz.
Sizga Telegram ovozli xabari yoki audio yozuv beriladi. Uni diqqat bilan tinglab, o'ta aniqlik bilan tahlil qiling.

MUHIM TALABLAR:
1. TRANSKRIPSIYA (full_transcript):
   - Audiodagi har bir so'zni 100% so'zma-so'z, aniq yozing.
   - Hech qanday so'zni tushirib qoldirmang, o'zgartirmang va ortiqcha so'z qo'shmang!
   - So'zlashuv tili, sheva yoki jargonlarni aynan qanday aytilgan bo'lsa shunday yozing.

2. QISQACHA MAZMUN (summary):
   - Audioning asl mohiyatini 1-2 ta aniq va lo'nda gap bilan ifodalang.
   - "Murojaatchi shuni aytmoqda", "Foydalanuvchi ma'lum qildi", "Ushbu xabarda" kabi keraksiz va quruq rasmiy so'zlarni UMUMAN ISHLATMANG! To'g'ridan-to'g'ri asosiy fikrni yozing.

3. TOPSHIRIQLAR & VAZIFALAR (action_items):
   - QAT'IY QOIDA: Faqat va faqat audioda kimgadir topshiriq berilgan, kelishuv qilingan yoki aniq reja aytilgan holatlardagina vazifani yozing!
   - Agar audioda shunchaki savol so'ralgan bo'lsa, oddiy gaplashilgan yoki fikr bildirilgan bo'lsa, hech qanday vazifa TO'QIMANG va "action_items" massivini BO'SH [] qoldiring!

4. JAVOB / MASLAHAT (answer_or_advice):
   - Agar gapiruvchi biror savol so'ragan yoki maslahat so'ragan bo'lsa (masalan, tibbiy, texnik yoki umumiy savol), unga qisqa, aniq va foydali maslahat/javob yozing.
   - Agar savol bo'lmasa, bu maydonga bo'sh satr "" qoldiring.

JAVOBNI FAQAT QUYIDAGI VALID JSON FORMATIDA QAYTARING:
{
  "title": "Audioning aniq va qisqa sarlavhasi (2-4 so'z)",
  "language": "Audiodagi til (masalan: O'zbekcha)",
  "summary": "Ortiqcha so'zlarsiz, aniq va lo'nda xulosa",
  "action_items": [],
  "answer_or_advice": "Savol bo'lsa qisqa javob, aks holda bo'sh qator",
  "full_transcript": "Audiodagi so'zma-so'z to'liq matn"
}
Eslatma: Faqat toza JSON qaytaring, boshqa hech qanday izoh qo'shmang!
`;

  try {
    const modelsToTry = ['gemini-3.6-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.5-flash'];
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
          ],
          config: {
            temperature: 0.2
          }
        });

        const rawText = response.text ? response.text.trim() : '';
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
            answer_or_advice: parsed.answer_or_advice || "",
            full_transcript: parsed.full_transcript || rawText,
            isDemo: false
          };
        } catch (jsonErr) {
          return {
            title: titleHint,
            language: "Aniqlanmadi",
            summary: rawText.slice(0, 250),
            action_items: [],
            answer_or_advice: "",
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
