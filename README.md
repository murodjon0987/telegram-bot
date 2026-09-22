# 🎙️ VoiceProtocol AI — Telegram Ovozli Xabarlar Konspekti & Majlis Protokoli Boti

> **Telegram ovozli xabarlarini so'zma-so'z matnga aylantirish, qisqacha xulosa (Summary) va topshiriqlar (Action Items) ro'yxatini tuzuvchi sun'iy intellektli Telegram boti va zamonaviy Web App (Mini App).**

---

## 🌟 Asosiy Imkoniyatlar

1. 🎙️ **Ovozli xabarlar va audio fayllarni tahlil qilish:**
   - Foydalanuvchi yuborgan yoki forward qilgan istalgan ovozli xabarni qabul qiladi.
   - O'zbek, Rus, Ingliz va boshqa tillarni avtomatik aniqlaydi.
2. 💡 **Aqlli Protokol:**
   - **Qisqacha mazmun (TL;DR):** Audio nima haqida ekanligi.
   - **Topshiriqlar va kelishuvlar (To-Do list):** Kim nima qilishi kerakligi ro'yxati.
   - **So'zma-so'z transkripsiya:** To'liq nutq matni.
3. 💡 **4,000 ta AI Promptlar & Biznes Shablonlari To'plami:**
   - **10 ta toifa** (SMM, Biznes, Marketing, Kopirayting, Sotuv, HR, IT, Moliya, Ta'lim, Kreativ AI) bo'yicha har birida 400 tadan jami 4000 ta sifatli master-prompt.
   - Botda `/prompts` buyrug'i, interaktiv toifalar, sahifalash va bir bosishda **"⚡ AI da ishlatish"** imkoniyati.
   - Telegram Inline Mode: `@bot prompt [so'z]` orqali istalgan chatda lahzalik prompt qidirish.
   - Web App (Mini App)da zamonaviy toifalar karuseli, jonli qidiruv, sevimlilar va 1-click nusxalash.
4. 📱 **Telegram Web App (TWA) Interfeysi:**
   - Qorong'u rejim (dark mode), neon va glassmorphic dizayn.
   - Ovozli konspektlar va 4,000 AI promptlar tablari.
   - Topshiriqlarni bir bosish bilan bajarilgan qilib belgilash (Interactive checklist).
   - Qidiruv, nusxalash va ulashish imkoniyatlari.
   - Telegram Haptic Feedback (tebranish effektlari) bilan to'liq integratsiya.

---

## 🚀 O'rnatish va Ishga Tushirish

### 1-qadam: Paketlarni o'rnatish
Agar hali o'rnatmagan bo'lsangiz:
```bash
npm install
```

### 2-qadam: .env faylini sozlash
Loyihadagi `.env` faylini oching va quyidagi kalitlarni kiriting:

```env
# 1. Telegram Bot Token (@BotFather orqali olinadi)
BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ

# 2. Google Gemini API Kaliti (https://aistudio.google.com/ orqali bepul olinadi)
GEMINI_API_KEY=AIzaSy...

# 3. Server porti
PORT=3000

# 4. WebApp manzili
WEBAPP_URL=http://localhost:3000
```

> 💡 **Eslatma:** Agar sizda hozircha API kalitlar bo'lmasa ham, loyiha avtomatik ravishda **Demo rejimida** ishlaydi va brauzerda Web App interfeysini sinab ko'rishingiz mumkin!

### 3-qadam: Dasturni ishga tushirish
Server va Telegram botni bir vaqtda ishga tushirish uchun:
```bash
npm start
```

Server ishga tushgach, brauzerda oching:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🤖 Telegram Bot va Mini App'ni ulash (Qo'llanma)

1. **Telegramda @BotFather ga kiring:**
   - `/newbot` buyrug'ini yuboring.
   - Botingizga nom va username bering (masalan: `VoiceProtocolBot`).
   - Berilgan tokenni `.env` faylidagi `BOT_TOKEN` ga qo'ying.

2. **Mini App menyu tugmasini ulash:**
   - @BotFather ga `/setmenubutton` yozing.
   - Botingizni tanlang.
   - Tugma nomiga masalan: `🌐 Web App` deb yozing.
   - Havolaga o'zingizning WebApp URL'ingizni yuboring (Masalan: `https://your-domain.com` yoki `ngrok` havolasi).

---

## 📁 Loyiha Tuzilmasi

```
├── bot.js            # Telegram bot boshqaruvchisi (grammY)
├── aiService.js      # Gemini 2.5 Flash audio tahlili (Transcribe + Summary)
├── server.js         # Express server va WebApp REST API
├── storage.js        # Protokollar va topshiriqlarni saqlovchi baza
├── public/
│   ├── index.html    # Telegram Web App asosiy sahifasi
│   ├── style.css     # Dark mode & glassmorphism dizayn tizimi
│   └── app.js        # Telegram SDK, filtrlash, checklist va interaktivlik
├── package.json      # Bog'liqliklar va skriptlar
└── .env              # Konfiguratsiya va maxfiy kalitlar
```

---

## 💡 Texnologiyalar
- **Backend:** Node.js (ES Modules), Express
- **Telegram Bot:** grammY (zamonaviy TypeScript/JS bot framework)
- **AI Tahlil:** Google Gemini 2.5 Flash (`@google/genai`)
- **Frontend:** Vanilla HTML5, Zamonaviy CSS3, Vanilla JS, Telegram WebApp SDK
