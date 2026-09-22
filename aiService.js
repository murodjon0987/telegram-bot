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
 * Audio yoki Video faylni tahlil qilish (Transkripsiya + Xulosa + Topshiriqlar)
 * @param {Buffer} mediaBuffer - Audio/Video fayl buferi
 * @param {string} mimeType - Media turi (audio/ogg, video/mp4, audio/mpeg, etc.)
 * @param {string} titleHint - Sarlavha
 * @param {string} userLang - Foydalanuvchi tili (uz, ru, en)
 */
export async function analyzeMedia(mediaBuffer, mimeType = 'audio/ogg', titleHint = 'Ovozli xabar', userLang = 'uz') {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === '' || apiKey.includes('YOUR_GEMINI_API_KEY')) {
    console.warn('⚠️ GEMINI_API_KEY topilmadi! Demo natija qaytarilmoqda.');
    return {
      title: `${titleHint} (Demo)`,
      language: "O'zbekcha",
      summary: "Ushbu xabarda loyiha talablari, vazifalar taqsimoti va navbatdagi qadamlar muhokama qilingan.",
      action_items: [
        "Loyiha rejasini jamoa bilan kelishish",
        "Topshiriqlarni belgilangan muddatda yakunlash"
      ],
      answer_or_advice: "",
      full_transcript: "Assalomu alaykum. Reja bo'yicha ishlarni davom ettiramiz. Yangilanishlarni vaqtida sinab ko'ringlar. Rahmat!",
      isDemo: true
    };
  }

  const client = getAIClient();
  const base64Data = mediaBuffer.toString('base64');

  const systemPrompt = `
Siz o'ta aniq ishlaydigan professional transkriptor va nutq tahlilchisisiz.
Sizga Telegram ovozli xabari, audio yoki dumaloq video xabar (krujochek) beriladi. Uni diqqat bilan eshitib/ko'rib, quyidagi talablar asosida tahlil qiling.

MUHIM TALABLAR:
1. TRANSKRIPSIYA (full_transcript):
   - Har bir so'zni 100% so'zma-so'z, aniq yozing.
   - Hech qanday so'zni tushirib qoldirmang, o'zgartirmang va ortiqcha so'z to'qimang!
   - So'zlashuv tili, sheva yoki jargonlarni aynan qanday aytilgan bo'lsa shunday yozing.

2. QISQACHA MAZMUN (summary):
   - Asl mohiyatni 1-2 ta lo'nda, aniq gap bilan ifodalang.
   - "Murojaatchi aytmoqda", "Foydalanuvchi ma'lum qildi" kabi quruq so'zlardan QAT'IYAN FOYDALANMANG! To'g'ridan-to'g'ri nima deyilgan bo'lsa, o'shani yozing.

3. TOPSHIRIQLAR & VAZIFALAR (action_items):
   - QAT'IY QOIDA: Faqat audioda kimgadir topshiriq berilgan, kelishuv qilingan yoki reja aytilgan bo'lsa vazifani yozing!
   - Agar shunchaki savol, salom-alik yoki oddiy gap bo'lsa, HECH QANDAY VAZIFA TO'QIMANG va "action_items" massivini BO'SH [] qoldiring!

4. JAVOB / MASLAHAT (answer_or_advice):
   - Agar gapiruvchi biror savol so'ragan yoki maslahat so'ragan bo'lsa (masalan, salomatlik, texnik, qanday qilish), unga qisqa, aniq va foydali javob yozing.
   - Agar savol bo'lmasa, bo'sh satr "" qoldiring.

JAVOBNI FAQAT QUYIDAGI VALID JSON FORMATIDA QAYTARING:
{
  "title": "Aniq va qisqa mavzu (2-4 so'z)",
  "language": "Audiodagi til (masalan: O'zbekcha)",
  "summary": "Ortiqcha so'zlarsiz, aniq va lo'nda xulosa",
  "action_items": [],
  "answer_or_advice": "",
  "full_transcript": "So'zma-so'z to'liq matn"
}
`;

  const modelsToTry = ['gemini-3.6-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
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
      console.warn(`Model ${model} xatosi:`, err.message);
    }
  }

  throw lastError || new Error("Gemini javob bermadi");
}

// Qadimgi chaqiriqlar bilan moslik uchun
export const analyzeAudio = analyzeMedia;

/**
 * Matnli xabarga aqlli AI javob qaytarish
 * @param {string} userMessage - Foydalanuvchi yozgan savol yoki matn
 * @param {string} contextInfo - Kontekst (masalan, oxirgi tahlil qilingan audio matni)
 */
export async function chatWithAI(userMessage, contextInfo = '') {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return "Assalomu alaykum! Men VoiceProtocol AI botiman. Menga ovozli xabar yoki dumaloq video (krujochek) yuborsangiz, uni bir zumda tahlil qilib beraman!";
  }

  const client = getAIClient();
  const prompt = `
Siz VoiceProtocol AI yordamchisisiz.
Foydalanuvchi siz bilan muloqot qilmoqda.

Kontekst: ${contextInfo ? `Oxirgi tahlil qilingan audio matni: "${contextInfo}"` : "Hali audio yuborilmadi."}

Foydalanuvchi xabari: "${userMessage}"

Vazifangiz: Foydalanuvchiga xushmuomala, lo'nda va foydali javob bering (o'zbek tilida). Agar audiodan biror narsa so'rayotgan bo'lsa, audiodagi ma'lumotlarga tayanib aniq javob bering. Ovozli xabar yoki krujochek yuborishi mumkinligini ham eslatib o'ting.
`;

  try {
    const response = await client.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: { temperature: 0.5 }
    });
    return response.text ? response.text.trim() : "Tushundim. Menga istalgan ovozli xabar yuborsangiz, uni matnga aylantirib beraman!";
  } catch (err) {
    console.error("AI Chat xatolik:", err);
    return "Kechirasiz, savolingizni tushunishda xatolik yuz berdi. Iltimos, ovozli xabar yoki krujochek yuborib ko'ring!";
  }
}
