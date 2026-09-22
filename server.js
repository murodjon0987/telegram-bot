import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createBot } from './bot.js';
import { 
  getAllTranscripts, 
  getTranscriptById, 
  toggleActionItem, 
  deleteTranscript, 
  saveTranscript,
  getSystemStats
} from './storage.js';
import { analyzeMedia } from './aiService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Barcha konspektlar ro'yxati
app.get('/api/transcripts', (req, res) => {
  const userId = req.query.userId || null;
  const list = getAllTranscripts(userId);
  res.json({ success: true, count: list.length, data: list });
});

// Bitta konspekt
app.get('/api/transcripts/:id', (req, res) => {
  const item = getTranscriptById(req.params.id);
  if (!item) {
    return res.status(404).json({ success: false, message: "Konspekt topilmadi" });
  }
  res.json({ success: true, data: item });
});

// Tizim statistikasi
app.get('/api/stats', (req, res) => {
  const stats = getSystemStats();
  res.json({ success: true, data: stats });
});

// Topshiriqni bajarilgan / bajarilmagan qilib belgilash
app.post('/api/transcripts/:id/toggle-action', (req, res) => {
  const { actionIndex } = req.body;
  const updated = toggleActionItem(req.params.id, actionIndex);
  if (!updated) {
    return res.status(404).json({ success: false, message: "Element topilmadi" });
  }
  res.json({ success: true, data: updated });
});

// Konspektni o'chirish
app.delete('/api/transcripts/:id', (req, res) => {
  const deleted = deleteTranscript(req.params.id);
  res.json({ success: deleted });
});

// Web App orqali audio yuklash va tahlil qilish
app.post('/api/analyze-audio', async (req, res) => {
  try {
    const { audioBase64, mimeType, title } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ success: false, message: "Audio fayl topilmadi" });
    }

    const buffer = Buffer.from(audioBase64, 'base64');
    const result = await analyzeMedia(buffer, mimeType || 'audio/webm', title || 'Web Audio');

    const saved = saveTranscript({
      userId: 'webapp_user',
      userName: 'Web Foydalanuvchi',
      title: result.title,
      language: result.language,
      duration: '01:00',
      summary: result.summary,
      action_items: result.action_items,
      answer_or_advice: result.answer_or_advice,
      full_transcript: result.full_transcript,
      isDemo: result.isDemo
    });

    res.json({ success: true, data: saved });
  } catch (err) {
    console.error("Web audio tahlilida xato:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Asosiy sahifa
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serverni ishga tushirish
app.listen(PORT, () => {
  console.log(`
========================================================================
🌐 VoiceProtocol AI Server: http://localhost:${PORT}
📱 Telegram Web App interfeysi va Bot faol!
========================================================================
  `);

  try {
    const bot = createBot();
    if (bot) {
      console.log('🤖 Telegram bot ulanmoqda...');
      bot.start({
        onStart: (info) => {
          console.log(`✅ Telegram bot ishga tushdi: @${info.username}`);
        },
        drop_pending_updates: true
      }).catch(err => {
        console.error('❌ Bot xatosi:', err.message);
      });
    }
  } catch (botErr) {
    console.warn('Botni ishga tushirishda ogohlantirish:', botErr.message);
  }
});
