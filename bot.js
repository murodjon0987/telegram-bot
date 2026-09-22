import { Bot, InlineKeyboard } from 'grammy';
import dotenv from 'dotenv';
import { analyzeAudio } from './aiService.js';
import { saveTranscript, getAllTranscripts } from './storage.js';

dotenv.config();

const token = process.env.BOT_TOKEN;
const webappUrl = process.env.WEBAPP_URL || 'http://localhost:3000';

export function createBot() {
  if (!token || token.trim() === '' || token.includes('YOUR_TELEGRAM_BOT_TOKEN')) {
    console.log(`
========================================================================
⚠️  DIQQAT: TELEGRAM BOT TOKENI KIRITILMAGAN!
------------------------------------------------------------------------
1. Telegramda @BotFather ga kiring: https://t.me/BotFather
2. /newbot buyrug'ini yozing va botingizga nom bering.
3. Berilgan HTTP API tokenni olib, loyihadagi .env fayliga yozing:
   BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ
4. Keyin 'npm run bot' yoki 'npm start' ni qayta ishga tushiring.
========================================================================
    `);
    return null;
  }

  const bot = new Bot(token);

  // /start buyrug'i
  bot.command('start', async (ctx) => {
    const firstName = ctx.from?.first_name || 'foydalanuvchi';
    
    const keyboard = new InlineKeyboard()
      .webApp('🌐 Web App Konspektlar', webappUrl)
      .row()
      .text('💡 Qanday ishlaydi?', 'help_info')
      .text('📊 Mening statistikalarim', 'my_stats');

    const welcomeText = `
👋 Assalomu alaykum, <b>${firstName}</b>!

Men <b>"Ovozli Xabarlar Konspekti & Majlis Protokoli"</b> botiman.

🎙️ <b>Nimalar qila olaman?</b>
• Menga istalgan <b>ovozli xabar (voice)</b> yoki <b>audio fayl</b> yuboring;
• Boshqa guruh yoki suhbatlardan kelgan uzun audiolar/ovozlarni menga <b>Forward</b> qiling;
• Men bir necha soniyada:
  1. 📜 So'zma-so'z matnga aylantiraman (Transkripsiya)
  2. 💡 Qisqacha xulosasini chiqaraman (TL;DR)
  3. ✅ Berilgan topshiriqlar va vazifalar ro'yxatini (To-Do) tuzaman!

<i>Sinab ko'rish uchun hoziroq menga qisqa ovozli xabar yuboring! 🎙️</i>
    `.trim();

    await ctx.reply(welcomeText, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  });

  // /help buyrug'i
  bot.command('help', async (ctx) => {
    const helpText = `
📖 <b>Botdan foydalanish bo'yicha qo'llanma:</b>

1. <b>Ovozli xabar:</b> Ovoz yozish tugmasini bosib, gapiring va yuboring.
2. <b>Forward:</b> Majlis yozuvlari yoki do'stingizning audio xabarini forward qilib yuboring.
3. <b>Tillar:</b> O'zbekcha, Ruscha, Inglizcha va boshqa tillar avtomatik aniqlanadi.
4. <b>Web App:</b> Pastdagi tugma orqali barcha saqlangan protokollarni qidirish, topshiriqlarni belgilash va PDF formatda nusxalash mumkin.
    `.trim();

    await ctx.reply(helpText, { parse_mode: 'HTML' });
  });

  // Callback query-lar (tugmalar bosilganda)
  bot.callbackQuery('help_info', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(`
💡 <b>Tezkor maslahat:</b>
Majlis yoki darslarda suhbatni ovozli xabar qilib botga tashlasangiz, kim qanday vazifa bajarishi kerakligini darhol ro'yxat qilib beradi!
    `, { parse_mode: 'HTML' });
  });

  bot.callbackQuery('my_stats', async (ctx) => {
    await ctx.answerCallbackQuery();
    const userId = ctx.from?.id;
    const items = getAllTranscripts(userId);
    await ctx.reply(`
📊 <b>Sizning konspektlaringiz:</b>
• Jami tahlil qilingan audiolar: <b>${items.length} ta</b>
• Platforma: <i>Telegram Web App faol</i>
    `, { parse_mode: 'HTML' });
  });

  // Ovozli xabarlar va audio fayllarni ushlash
  bot.on(['message:voice', 'message:audio'], async (ctx) => {
    const isVoice = !!ctx.message.voice;
    const fileMeta = isVoice ? ctx.message.voice : ctx.message.audio;
    const durationSec = fileMeta.duration || 0;
    const mins = Math.floor(durationSec / 60);
    const secs = durationSec % 60;
    const durationStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    // Foydalanuvchiga jarayon boshlanganini bildirish
    const statusMsg = await ctx.reply('⏳ <i>Ovozli xabar qabul qilindi. Audio tinglanmoqda va AI tahlil qilinmoqda...</i>', {
      parse_mode: 'HTML'
    });

    try {
      await ctx.api.sendChatAction(ctx.chat.id, 'typing');

      // Telegram serveridan faylni yuklab olish
      const file = await ctx.getFile();
      const fileUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
      
      const fileResponse = await fetch(fileUrl);
      if (!fileResponse.ok) {
        throw new Error(`Faylni yuklab bo'lmadi: ${fileResponse.statusText}`);
      }
      
      const arrayBuffer = await fileResponse.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const mimeType = isVoice ? 'audio/ogg' : (fileMeta.mime_type || 'audio/mpeg');

      const titleHint = isVoice ? `Ovozli xabar (${durationStr})` : (fileMeta.file_name || 'Audio yozuv');

      // AI tahlil qilish
      const result = await analyzeAudio(buffer, mimeType, titleHint);

      // Natijani saqlash
      const savedItem = saveTranscript({
        userId: String(ctx.from.id),
        userName: ctx.from.username || ctx.from.first_name || 'Foydalanuvchi',
        title: result.title,
        language: result.language,
        duration: durationStr,
        summary: result.summary,
        action_items: result.action_items,
        full_transcript: result.full_transcript,
        isDemo: result.isDemo
      });

      // Status xabarini o'chirish
      try {
        await ctx.api.deleteMessage(ctx.chat.id, statusMsg.message_id);
      } catch (delErr) {
        // e'tiborsiz qoldirish
      }

      // Xabarni chiroyli formatlash
      let messageText = `✨ <b>${result.title}</b>\n`;
      messageText += `🌐 <i>Til: ${result.language} | ⏱️ Davomiyligi: ${durationStr}</i>\n\n`;
      
      messageText += `💡 <b>QISQACHA MAZMUN:</b>\n${result.summary}\n\n`;

      if (result.action_items && result.action_items.length > 0) {
        messageText += `✅ <b>TOPSHIRIQLAR & VAZIFALAR:</b>\n`;
        result.action_items.forEach((item, idx) => {
          messageText += `  ${idx + 1}. ${item}\n`;
        });
        messageText += `\n`;
      }

      messageText += `📜 <b>TO'LIQ TRANSKRIPSIYA:</b>\n<i>${result.full_transcript}</i>\n`;

      if (result.isDemo) {
        messageText += `\n⚠️ <i>(Eslatma: Bu demo tahlil natijasi. Haqiqiy AI ovoz tahlili uchun .env faylida GEMINI_API_KEY ko'rsating)</i>`;
      }

      const itemKeyboard = new InlineKeyboard()
        .webApp('🌐 Web App\'da ochish', `${webappUrl}?item=${savedItem.id}`)
        .row()
        .text('📋 Vazifalar ro\'yxati', `show_actions_${savedItem.id}`);

      await ctx.reply(messageText, {
        parse_mode: 'HTML',
        reply_markup: itemKeyboard
      });

    } catch (error) {
      console.error('Audio qayta ishlashda xatolik:', error);
      try {
        await ctx.api.editMessageText(
          ctx.chat.id,
          statusMsg.message_id,
          `❌ <b>Kechirasiz, audio faylni tahlil qilishda xatolik yuz berdi.</b>\n<i>Xatolik: ${error.message}</i>`,
          { parse_mode: 'HTML' }
        );
      } catch (editErr) {
        await ctx.reply(`❌ Xatolik yuz berdi: ${error.message}`);
      }
    }
  });

  return bot;
}

// Agar to'g'ridan-to'g'ri 'node bot.js' bilan chaqirilsa
if (process.argv[1]?.endsWith('bot.js')) {
  const bot = createBot();
  if (bot) {
    console.log('🚀 Telegram bot ishga tushirilmoqda...');
    bot.start({
      onStart: (botInfo) => {
        console.log(`✅ Bot muvaffaqiyatli ishga tushdi: @${botInfo.username}`);
      }
    });
  }
}
