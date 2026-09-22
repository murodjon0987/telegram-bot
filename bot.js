import { Bot, InlineKeyboard, Keyboard } from 'grammy';
import dotenv from 'dotenv';
import { analyzeMedia, chatWithAI } from './aiService.js';
import { 
  saveTranscript, 
  getAllTranscripts, 
  registerOrUpdateUser, 
  registerGroup, 
  getLastTranscriptByUser, 
  getSystemStats,
  getAllUsers 
} from './storage.js';

dotenv.config();

const token = process.env.BOT_TOKEN;
const webappUrl = process.env.WEBAPP_URL || 'http://localhost:3000';
const ADMIN_ID = process.env.ADMIN_ID || '6268220201'; // Bot egasining Telegram ID si

// Doimiy qulay pastki menyu (Reply Keyboard)
function getMainKeyboard() {
  return new Keyboard()
    .text("🎙️ Qo'llanma").text("📊 Mening hisobotim")
    .row()
    .text("⚙️ Sozlamalar").text("💡 Maslahat olish")
    .resized();
}

export function createBot() {
  if (!token || token.trim() === '' || token.includes('YOUR_TELEGRAM_BOT_TOKEN')) {
    console.log('⚠️ TELEGRAM BOT TOKENI KIRITILMAGAN!');
    return null;
  }

  const bot = new Bot(token);

  // Global xatolik tutuvchi (bot to'xtab qolmasligi uchun)
  bot.catch((err) => {
    console.error(`❌ Botda xatolik:`, err.error?.message || err.error || err);
  });

  // Har bir xabarda foydalanuvchi/guruhni ro'yxatga olish
  bot.use(async (ctx, next) => {
    if (ctx.from) registerOrUpdateUser(ctx.from);
    if (ctx.chat && (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup')) {
      registerGroup(ctx.chat);
    }
    await next();
  });

  // /start buyrug'i
  bot.command('start', async (ctx) => {
    const firstName = ctx.from?.first_name || 'foydalanuvchi';
    
    const inlineKeyboard = new InlineKeyboard();
    if (webappUrl && webappUrl.startsWith('https://')) {
      inlineKeyboard.webApp('🌐 Web App Konspektlar', webappUrl).row();
    }
    inlineKeyboard
      .text('💡 Imkoniyatlar', 'help_info')
      .text('🌐 Tilni tanlash', 'change_lang');

    const welcomeText = `
👋 Assalomu alaykum, <b>${firstName}</b>!

Men <b>VoiceProtocol AI</b> — eng aqlli ovozli konspekt va majlis protokoli assistentiman!

🎙️ <b>Nimalar yuborishingiz mumkin?</b>
• 🎙️ <b>Ovozli xabarlar (Voice)</b>
• 📹 <b>Dumaloq video xabarlar ("Krujochek")</b>
• 🎵 <b>Audio yoki Video fayllar</b>
• ⏩ <b>Boshqa chatlardan forward qilingan yozuvlar</b>

⚡ <b>Natijada nima olasiz?</b>
1. 📜 <b>So'zma-so'z to'liq matn</b>
2. 💡 <b>Qisqa va lo'nda xulosa</b>
3. ✅ <b>Topshiriqlar ro'yxati (To-Do)</b>
4. 💬 <b>Savollaringizga aniq AI maslahati!</b>

<i>Sinab ko'rish uchun hoziroq ovozli xabar yoki krujochek yuboring! 👇</i>
    `.trim();

    await ctx.reply(welcomeText, {
      parse_mode: 'HTML',
      reply_markup: inlineKeyboard
    });

    // Pastki klaviaturani ham chiqarish (agar shaxsiy chat bo'lsa)
    if (ctx.chat.type === 'private') {
      await ctx.reply("👇 Tezkor menyudan ham foydalanishingiz mumkin:", {
        reply_markup: getMainKeyboard()
      });
    }
  });

  // /help buyrug'i
  bot.command('help', async (ctx) => {
    const helpText = `
📖 <b>VoiceProtocol AI Qo'llanmasi:</b>

1. 🎙️ <b>Ovozli xabar:</b> Gapiring va botga yuboring.
2. 📹 <b>Krujochek:</b> Dumaloq video yuborsangiz ham ovozini tahlil qiladi.
3. 👥 <b>Guruhlar:</b> Botni guruhga qo'shing — guruhdagi barcha ovozli xabarlarni darhol tahlil qilib beradi!
4. 💬 <b>Savol bering:</b> Oxirgi yuborgan audiongiz bo'yicha matn yozib savol bersangiz, bot javob beradi.
5. 🌐 <b>Web App:</b> Barcha protokollarni saqlash va boshqarish paneli.
    `.trim();

    await ctx.reply(helpText, { parse_mode: 'HTML' });
  });

  // /admin yoki /stats buyrug'i (faqat admin uchun)
  bot.command(['admin', 'stats'], async (ctx) => {
    if (String(ctx.from?.id) !== String(ADMIN_ID)) {
      // Oddiy foydalanuvchiga shaxsiy statistikasini ko'rsatamiz
      const userTranscripts = getAllTranscripts(ctx.from?.id);
      return ctx.reply(`📊 <b>Sizning statistikangiz:</b>\n• Tahlil qilingan xabarlaringiz: <b>${userTranscripts.length} ta</b>`, {
        parse_mode: 'HTML'
      });
    }

    const stats = getSystemStats();
    const adminText = `
👑 <b>ADMIN PANEL STATISTIKASI:</b>

👥 Jami foydalanuvchilar: <b>${stats.totalUsers} nafar</b>
👥 Ulangan guruhlar: <b>${stats.totalGroups} ta</b>
📝 Jami konspektlar: <b>${stats.totalTranscripts} ta</b>
✅ Aniqlangan topshiriqlar: <b>${stats.totalTasks} ta</b>
🎯 Topshiriqlar bajarilishi: <b>${stats.taskCompletionRate}%</b>

📢 <i>Barchaga xabar yuborish: /broadcast Xabar_matni</i>
    `.trim();

    await ctx.reply(adminText, { parse_mode: 'HTML' });
  });

  // /broadcast buyrug'i (Admin e'lon tarqatishi)
  bot.command('broadcast', async (ctx) => {
    if (String(ctx.from?.id) !== String(ADMIN_ID)) return;

    const text = ctx.message?.text?.replace('/broadcast', '').trim();
    if (!text) {
      return ctx.reply("⚠️ Xabar matnini kiriting! Masalan: <code>/broadcast Yangilanish chiqdi!</code>", { parse_mode: 'HTML' });
    }

    const users = getAllUsers();
    let sent = 0;
    for (const u of users) {
      try {
        await ctx.api.sendMessage(u.id, `📢 <b>ADMIN XABARI:</b>\n\n${text}`, { parse_mode: 'HTML' });
        sent++;
      } catch (e) {
        // Bloklagan bo'lishi mumkin
      }
    }
    await ctx.reply(`✅ Xabar <b>${sent}</b> ta foydalanuvchiga yetkazildi.`, { parse_mode: 'HTML' });
  });

  // /lang buyrug'i
  bot.command('lang', async (ctx) => {
    const kb = new InlineKeyboard()
      .text("🇺🇿 O'zbekcha", "set_lang_uz")
      .text("🇷🇺 Русский", "set_lang_ru")
      .text("🇬🇧 English", "set_lang_en");
    await ctx.reply("🌐 Tilni tanlang / Выберите язык / Select language:", { reply_markup: kb });
  });

  // Pastki tugmalar bosilganda
  bot.hears("🎙️ Qo'llanma", async (ctx) => {
    await ctx.reply("🎙️ Menga ixtiyoriy ovozli xabar (voice) yoki krujochek yuboring — bir zumda so'zma-so'z matn, xulosa va vazifalar ro'yxatini chiqarib beraman!");
  });

  bot.hears("📊 Mening hisobotim", async (ctx) => {
    const list = getAllTranscripts(ctx.from?.id);
    await ctx.reply(`📊 <b>Sizning hisobingiz:</b>\n• Jami tahlillar: <b>${list.length} ta</b>\n• Tizim: <i>VoiceProtocol AI v2.0 Faol</i>`, {
      parse_mode: 'HTML'
    });
  });

  bot.hears("⚙️ Sozlamalar", async (ctx) => {
    const kb = new InlineKeyboard()
      .text("🌐 Tilni o'zgartirish", "change_lang")
      .row()
      .text("🗑️ Tarixni tozalash", "clear_history_prompt");
    await ctx.reply("⚙️ <b>Sozlamalar bo'limi:</b>", { parse_mode: 'HTML', reply_markup: kb });
  });

  bot.hears("💡 Maslahat olish", async (ctx) => {
    await ctx.reply("💡 Menga istalgan savolingizni matn yoki ovoz qilib yuboring, sun'iy intellekt sizga eng to'g'ri maslahatni beradi!");
  });

  // Inline callback query-lar
  bot.callbackQuery('help_info', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply("💡 Majlis, suhbat yoki dars audioyozuvini forward qilsangiz, bot kim nima vazifa bajarishi kerakligini ajratib beradi!");
  });

  bot.callbackQuery('change_lang', async (ctx) => {
    await ctx.answerCallbackQuery();
    const kb = new InlineKeyboard()
      .text("🇺🇿 O'zbekcha", "set_lang_uz")
      .text("🇷🇺 Русский", "set_lang_ru")
      .text("🇬🇧 English", "set_lang_en");
    await ctx.reply("🌐 Muloqot tilini tanlang:", { reply_markup: kb });
  });

  bot.callbackQuery(/^set_lang_/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const lang = ctx.callbackQuery.data.replace('set_lang_', '');
    registerOrUpdateUser({ id: ctx.from.id, language_code: lang });
    await ctx.reply("✅ Til muvaffaqiyatli saqlandi!");
  });

  // OVOZ, AUDIO, KRUJOCHEK VA VIDEO XABARLARNI USHLASH
  bot.on([
    'message:voice', 
    'message:audio', 
    'message:video_note', 
    'message:video'
  ], async (ctx) => {
    let fileMeta = null;
    let mimeType = 'audio/ogg';
    let titleHint = 'Ovozli xabar';

    if (ctx.message.voice) {
      fileMeta = ctx.message.voice;
      mimeType = 'audio/ogg';
      titleHint = 'Ovozli xabar';
    } else if (ctx.message.video_note) {
      fileMeta = ctx.message.video_note;
      mimeType = 'video/mp4';
      titleHint = 'Dumaloq video (krujochek)';
    } else if (ctx.message.audio) {
      fileMeta = ctx.message.audio;
      mimeType = fileMeta.mime_type || 'audio/mpeg';
      titleHint = fileMeta.file_name || 'Audio fayl';
    } else if (ctx.message.video) {
      fileMeta = ctx.message.video;
      mimeType = 'video/mp4';
      titleHint = fileMeta.file_name || 'Video yozuv';
    }

    const durationSec = fileMeta.duration || 0;
    const mins = Math.floor(durationSec / 60);
    const secs = durationSec % 60;
    const durationStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    const statusMsg = await ctx.reply(
      `⏳ <i>${ctx.message.video_note ? 'Video xabar' : 'Audio'} qabul qilindi. AI tinglamoqda va tahlil qilmoqda...</i>`, 
      { parse_mode: 'HTML' }
    );

    try {
      await ctx.api.sendChatAction(ctx.chat.id, 'typing');

      // Faylni yuklab olish
      const file = await ctx.getFile();
      const fileUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
      
      const fileResponse = await fetch(fileUrl);
      if (!fileResponse.ok) {
        throw new Error(`Faylni yuklab bo'lmadi: ${fileResponse.statusText}`);
      }
      
      const arrayBuffer = await fileResponse.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // AI tahlil qilish
      const result = await analyzeMedia(buffer, mimeType, `${titleHint} (${durationStr})`);

      // Baza uchun saqlash
      const savedItem = saveTranscript({
        userId: String(ctx.from.id),
        userName: ctx.from.username || ctx.from.first_name || 'Foydalanuvchi',
        chatType: ctx.chat.type,
        title: result.title,
        language: result.language,
        duration: durationStr,
        summary: result.summary,
        action_items: result.action_items,
        answer_or_advice: result.answer_or_advice,
        full_transcript: result.full_transcript,
        isDemo: result.isDemo
      });

      // Status xabarini o'chirish
      try {
        await ctx.api.deleteMessage(ctx.chat.id, statusMsg.message_id);
      } catch (delErr) {}

      // Xabarni formatlash
      let messageText = `📌 <b>${result.title}</b>\n\n`;
      messageText += `💡 <b>Xulosa:</b>\n${result.summary}\n\n`;

      if (result.action_items && result.action_items.length > 0) {
        messageText += `✅ <b>Vazifalar & Topshiriqlar:</b>\n`;
        result.action_items.forEach((item) => {
          messageText += `• ${item}\n`;
        });
        messageText += `\n`;
      }

      if (result.answer_or_advice && result.answer_or_advice.trim() !== '') {
        messageText += `💬 <b>Javob / Maslahat:</b>\n${result.answer_or_advice}\n\n`;
      }

      messageText += `📜 <b>So'zma-so'z matn:</b>\n<i>"${result.full_transcript}"</i>`;

      const itemKeyboard = new InlineKeyboard();
      if (webappUrl && webappUrl.startsWith('https://')) {
        itemKeyboard.webApp('🌐 Web App\'da ochish', `${webappUrl}?item=${savedItem.id}`);
      }

      await ctx.reply(messageText, {
        parse_mode: 'HTML',
        reply_markup: itemKeyboard.inline_keyboard.length > 0 ? itemKeyboard : undefined
      });

    } catch (error) {
      console.error('Tahlilda xatolik:', error);
      try {
        await ctx.api.editMessageText(
          ctx.chat.id,
          statusMsg.message_id,
          `❌ <b>Kechirasiz, faylni tahlil qilishda xatolik yuz berdi.</b>\n<i>${error.message}</i>`,
          { parse_mode: 'HTML' }
        );
      } catch (editErr) {
        await ctx.reply(`❌ Xatolik yuz berdi: ${error.message}`);
      }
    }
  });

  // MATNLI XABARLAR BILAN ISHLASH (AI Chat / Audio haqida savol so'rash)
  bot.on('message:text', async (ctx) => {
    // Agar komanda bo'lsa yoki guruhdagi oddiy xabarlar bo'lsa tegmaymiz
    if (ctx.message.text.startsWith('/')) return;
    if (ctx.chat.type !== 'private') return;

    const userText = ctx.message.text.trim();
    const lastTranscript = getLastTranscriptByUser(ctx.from.id);
    const contextInfo = lastTranscript ? lastTranscript.full_transcript : '';

    await ctx.api.sendChatAction(ctx.chat.id, 'typing');
    const aiReply = await chatWithAI(userText, contextInfo);

    await ctx.reply(aiReply, {
      reply_to_message_id: ctx.message.message_id
    });
  });

  return bot;
}

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
