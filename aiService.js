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
 * Rejimga qarab Prompt tuzish
 */
function buildPromptByMode(mode = 'standard') {
  if (mode === 'meeting') {
    return `
Siz korporativ majlis kotibi va rasmiy protokol mutaxassisisiz.
Audioni tinglab, RASMIY MAJLIS PROTOKOLI tuzing.
Talablar:
- title: Majlisning rasmiy mavzusi
- summary: Majlisning asosiy maqsadi va qisqacha mazmuni (2-3 gap)
- action_items: Kimga qanday vazifa topshirildi va muddatlar (aniq ro'yxat)
- decisions: Majlisda qabul qilingan yakuniy qarorlar (massiv)
- participants: Aytilgan qatnashuvchilar yoki ismlar
- full_transcript: So'zma-so'z to'liq matn

JAVOBNI FAQAT JSON FORMATIDA QAYTARING:
{
  "title": "Majlis mavzusi",
  "language": "Til",
  "summary": "Majlis mazmuni",
  "action_items": ["1-topshiriq", "2-topshiriq"],
  "decisions": ["1-qaror", "2-qaror"],
  "full_transcript": "To'liq matn"
}
`;
  }

  if (mode === 'study') {
    return `
Siz universitet professori va dars konspektlari tuzuvchi mutaxassisisiz.
Ushbu dars/ma'ruza audiosidan TALABALAR UCHUN MUKAMMAL KONSPEKT tuzing.
Talablar:
- title: Dars yoki mavzu nomi
- summary: Mavzuning asosiy g'oyasi va tushuntirilgan qoidalar
- key_terms: Darsda aytilgan asosiy atamalar va formulalar (massiv)
- exam_questions: Ushbu audiodan kelib chiqadigan 3-5 ta imtihon / nazorat savollari (massiv)
- action_items: Uyga vazifalar yoki o'rganish kerak bo'lgan manbalar (agar aytilgan bo'lsa)
- full_transcript: So'zma-so'z to'liq matn

JAVOBNI FAQAT JSON FORMATIDA QAYTARING:
{
  "title": "Dars mavzusi",
  "language": "Til",
  "summary": "Asosiy qoidalar va konspekt",
  "key_terms": ["Atama 1", "Atama 2"],
  "exam_questions": ["1-savol?", "2-savol?"],
  "action_items": [],
  "full_transcript": "To'liq matn"
}
`;
  }

  if (mode === 'finance') {
    return `
Siz moliyaviy tahlilchi va auditor bo'yicha sun'iy intellektsiz.
Ushbu audiodagi barcha PUL, NARX, XARAJAT va BYUDJET ma'lumotlarini hisoblang.
Talablar:
- title: Moliyaviy mavzu
- summary: Moliyaviy holat, kelishuv yoki hisob-kitob xulosasi
- financial_items: Aytilgan har bir summa va xarajat bandi (masalan: "Server xarajati - 150$", "Ish haqi - 500$")
- total_estimated: Aytilgan taxminiy umumiy summa
- action_items: To'lov yoki moliyaviy topshiriqlar
- full_transcript: So'zma-so'z to'liq matn

JAVOBNI FAQAT JSON FORMATIDA QAYTARING:
{
  "title": "Moliyaviy tahlil mavzusi",
  "language": "Til",
  "summary": "Moliyaviy xulosa",
  "financial_items": ["Band 1 - narxi", "Band 2 - narxi"],
  "total_estimated": "Umumiy summa (agar aytilgan bo'lsa)",
  "action_items": [],
  "full_transcript": "To'liq matn"
}
`;
  }

  if (mode === 'english') {
    return `
You are an expert IELTS and English language examiner.
Listen to this audio. If it is English, analyze pronunciation, grammar, and fluency. If it is another language, translate and give English learning advice.
Requirements:
- title: Topic of speech
- summary: English summary and grammar analysis
- errors_and_corrections: List of mistakes and how to fix them (array of strings)
- vocabulary_suggestions: 3-5 advanced vocabulary words to replace simple words
- action_items: Practice tips
- full_transcript: Verbatim transcript

RETURN ONLY VALID JSON:
{
  "title": "Topic",
  "language": "English",
  "summary": "Fluency and grammar analysis",
  "errors_and_corrections": ["Instead of 'X' say 'Y'"],
  "vocabulary_suggestions": ["Word 1 (meaning)", "Word 2 (meaning)"],
  "action_items": [],
  "full_transcript": "Transcript"
}
`;
  }

  // Standart rejim
  return `
Siz o'ta aniq ishlaydigan professional transkriptor va nutq tahlilchisisiz.
Audioni diqqat bilan eshitib/ko'rib, o'ta aniqlik bilan tahlil qiling.

TALABLAR:
1. TRANSKRIPSIYA (full_transcript):
   - Har bir so'zni 100% so'zma-so'z yozing. So'zlashuv tili, shevalarni aynan aytilganidek yozing.
2. QISQACHA MAZMUN (summary):
   - Asl mohiyatni 1-2 ta lo'nda gap bilan ifodalang. Ortiqcha rasmiy so'zlar ("Murojaatchi aytmoqda...") ishlatmang!
3. TOPSHIRIQLAR & VAZIFALAR (action_items):
   - Faqat va faqat kimgadir vazifa, kelishuv yoki aniq reja aytilgan bo'lsa yozing. Bo'lmasa bo'sh [] qoldiring!
4. JAVOB / MASLAHAT (answer_or_advice):
   - Agar savol yoki maslahat so'ralgan bo'lsa foydali javob yozing, aks holda bo'sh qator.

JAVOBNI FAQAT JSON FORMATIDA QAYTARING:
{
  "title": "Aniq va qisqa mavzu (2-4 so'z)",
  "language": "Til (masalan: O'zbekcha)",
  "summary": "Ortiqcha so'zlarsiz lo'nda xulosa",
  "action_items": [],
  "answer_or_advice": "",
  "full_transcript": "So'zma-so'z to'liq matn"
}
`;
}

/**
 * Media tahlil qilish (Mode qo'llab-quvvatlaydi)
 */
export async function analyzeMedia(mediaBuffer, mimeType = 'audio/ogg', titleHint = 'Ovozli xabar', mode = 'standard') {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === '' || apiKey.includes('YOUR_GEMINI_API_KEY')) {
    return {
      title: `${titleHint} (Demo)`,
      mode,
      language: "O'zbekcha",
      summary: "Ushbu xabarda loyiha rejalari va yangilanishlar muhokama qilingan.",
      action_items: ["Demo topshiriq: Tizimni sinab ko'rish"],
      full_transcript: "Assalomu alaykum. VoiceProtocol AI tizimi demo rejimida ishlamoqda.",
      isDemo: true
    };
  }

  const client = getAIClient();
  const base64Data = mediaBuffer.toString('base64');
  const systemPrompt = buildPromptByMode(mode);

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
        config: { temperature: 0.2 }
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
          mode,
          language: parsed.language || "Aniqlanmadi",
          summary: parsed.summary || "Xulosa mavjud emas.",
          action_items: Array.isArray(parsed.action_items) ? parsed.action_items : [],
          decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
          key_terms: Array.isArray(parsed.key_terms) ? parsed.key_terms : [],
          exam_questions: Array.isArray(parsed.exam_questions) ? parsed.exam_questions : [],
          financial_items: Array.isArray(parsed.financial_items) ? parsed.financial_items : [],
          total_estimated: parsed.total_estimated || "",
          errors_and_corrections: Array.isArray(parsed.errors_and_corrections) ? parsed.errors_and_corrections : [],
          vocabulary_suggestions: Array.isArray(parsed.vocabulary_suggestions) ? parsed.vocabulary_suggestions : [],
          answer_or_advice: parsed.answer_or_advice || "",
          full_transcript: parsed.full_transcript || rawText,
          isDemo: false
        };
      } catch (jsonErr) {
        return {
          title: titleHint,
          mode,
          language: "Aniqlanmadi",
          summary: rawText.slice(0, 250),
          action_items: [],
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

export const analyzeAudio = analyzeMedia;

/**
 * Matnli AI yordamchi bilan muloqot
 */
export async function chatWithAI(userMessage, contextInfo = '') {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return "Assalomu alaykum! Menga ovozli xabar yoki krujochek yuborsangiz, uni bir zumda tahlil qilib beraman!";
  }

  const client = getAIClient();
  const prompt = `
Siz VoiceProtocol AI professional yordamchisisiz.
Foydalanuvchi sizga xabar yozmoqda.

Kontekst (oxirgi audio matni): "${contextInfo || 'Audio hali yuborilmadi'}"
Foydalanuvchi xabari: "${userMessage}"

Vazifa: Foydalanuvchiga do'stona, o'ta aniq va professional javob qaytaring (o'zbek tilida). Agar u audiodagi biror ma'lumotni so'rayotgan bo'lsa, audiodagi faktlarga tayanib javob bering.
`;

  const modelsToTry = ['gemini-3.6-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
  for (const model of modelsToTry) {
    try {
      const response = await client.models.generateContent({
        model,
        contents: prompt,
        config: { temperature: 0.4 }
      });
      return response.text ? response.text.trim() : "Tushundim. Menga ovozli xabar yoki krujochek yuborishingiz mumkin!";
    } catch (err) {
      console.warn(`Chat model ${model} xatosi:`, err.message);
    }
  }

  return "Hozirda sun'iy intellekt xizmati band. Birozdan so'ng qayta urinib ko'ring yoki ovozli xabar yuboring!";
}
