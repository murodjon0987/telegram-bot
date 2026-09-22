import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createBot } from './bot.js';
import { getAllTranscripts, getTranscriptById, toggleActionItem, deleteTranscript, saveTranscript } from './storage.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Barcha konspektlar ro'yxati
app.get('/api/transcripts', (req, res) => {
  const userId = req.query.userId || null;
  const list = getAllTranscripts(userId);
  res.json({ success: true, count: list.length, data: list });
});

// Bitta konspektni olish
app.get('/api/transcripts/:id', (req, res) => {
  const item = getTranscriptById(req.params.id);
  if (!item) {
    return res.status(404).json({ success: false, message: "Konspekt topilmadi" });
  }
  res.json({ success: true, data: item });
});

// Topshiriqni bajarilgan / bajarilmagan qilib belgilash (Toggle action)
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

// Yangi demo/test konspekt qo'shish
app.post('/api/transcripts', (req, res) => {
  try {
    const newItem = saveTranscript(req.body);
    res.json({ success: true, data: newItem });
  } catch (err) {
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
🌐 Web App Server faol: http://localhost:${PORT}
📱 Telegram Web App interfeysi tayyor!
========================================================================
  `);

  // Agar BOT_TOKEN bo'lsa, Telegram botni ham avtomatik start qilish
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
        console.error('❌ Bot ulanishida xatolik:', err.message);
      });
    }
  } catch (botErr) {
    console.warn('Botni ishga tushirib bo\'lmadi:', botErr.message);
  }
});
