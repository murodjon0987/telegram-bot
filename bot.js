import { Bot, InlineKeyboard, Keyboard, InputFile } from 'grammy';
import dotenv from 'dotenv';
import { analyzeMedia, chatWithAI } from './aiService.js';
import { 
  saveTranscript, 
  getAllTranscripts, 
  registerOrUpdateUser, 
  registerGroup, 
  getLastTranscriptByUser, 
  getTranscriptById,
  toggleActionItem,
  getSystemStats,
  getAllUsers,
  getUserMode,
  setUserMode,
  getUserData
} from './storage.js';

dotenv.config();

const token = process.env.BOT_TOKEN;
const webappUrl = process.env.WEBAPP_URL || 'http://localhost:3000';
const ADMIN_ID = process.env.ADMIN_ID || '6268220201';

// Asosiy doimiy klaviatura
function getMainKeyboard() {
  return new Keyboard()
    .text("🎙️ Qo'llanma").text("📋 Mening To-Do'larim")
    .row()
    .text("🎯 AI Rejimlari").text("🎁 Taklif & Ballar")
    .row()
    .text("📊 Statistika").text("🌐 Web App")
    .resized();
}

export function createBot() {
  if (!token || token.trim() === '' || token.includes('YOUR_TELEGRAM_BOT_TOKEN')) {
    console.log('⚠️ TELEGRAM BOT TOKENI KIRITILMAGAN!');
    return null;
  }

  const bot = new Bot(token);

  // Global xatolik tutuvchi
  bot.catch((err) => {
    console.error(`❌ Bot xatosi:`, err.error?.message || err.error || err);
  });

  // Har bir xabarda foydalanuvchini ro'yxatga olish
  bot.use(async (ctx, next) => {
    if (ctx.from) {
      // Referal parametri tekshiruvi
      let refBy = null;
      if (ctx.message?.text?.startsWith('/start ref_')) {
        refBy = ctx.message.text.replace('/start ref_', '').trim();
      }
      registerOrUpdateUser(ctx.from, refBy);
    }
    if (ctx.chat && (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup')) {
      registerGroup(ctx.chat);
    }
    await next();
  });

  // /start buyrug'i
  bot.command('start', async (ctx) => {
    const firstName = ctx.from?.first_name || 'foydalanuvchi';
    const currentMode = getUserMode(ctx.from.id);

    const inlineKeyboard = new InlineKeyboard();
    if (webappUrl && webappUrl.startsWith('https://')) {
      inlineKeyboard.webApp('🌐 Web App Konspektlar', webappUrl).row();
    }
    inlineKeyboard
      .text('🎯 AI Rejimini tanlash', 'open_modes')
      .text('🎁 Shaxsiy Referal', 'open_ref');

    const welcomeText = `
👋 Assalomu alaykum, <b>${firstName}</b>!

Men <b>VoiceProtocol Super AI</b> — ovoz va videoni yuqori aniqlikda tahlil qiluvchi flagman assistentman!

🎯 <b>Hozirgi faol rejim:</b> <code>${getModeLabel(currentMode)}</code>

🎙️ <b>Nimalar yubora olasiz?</b>
• 🎙️ <b>Ovozli xabar (Voice)</b>
• 📹 <b>Dumaloq video ("Krujochek")</b>
• 🎵 <b>Audio va Video fayllar</b>
• ⏩ <b>Boshqa chatlardan forward qilingan yozuvlar</b>

⚡ <b>Qo'shimcha komandalar:</b>
/mode — AI tahlil rejimini o'zgartirish
/todo — Barcha topshiriqlar ro'yxati
/export — Oxirgi matnni .txt fayl qilib olish
/ref — Do'stlarni taklif qilib ball to'plash

<i>Sinab ko'rish uchun hoziroq ovozli xabar yoki krujochek yuboring! 👇</i>
    `.trim();

    await ctx.reply(welcomeText, {
      parse_mode: 'HTML',
      reply_markup: inlineKeyboard
    });

    if (ctx.chat.type === 'private') {
      await ctx.reply("👇 Menyudan ham foydalanishingiz mumkin:", {
        reply_markup: getMainKeyboard()
      });
    }
  });

  // /mode buyrug'i (Rejimlar)
  bot.command(['mode', 'rejim'], async (ctx) => {
    await sendModeSelection(ctx);
  });

  bot.hears("🎯 AI Rejimlari", async (ctx) => {
    await sendModeSelection(ctx);
  });

  async function sendModeSelection(ctx) {
    const current = getUserMode(ctx.from.id);
    const kb = new InlineKeyboard()
      .text(`${current === 'standard' ? '✅ ' : ''}⚡ Standart`, 'set_mode_standard')
      .text(`${current === 'meeting' ? '✅ ' : ''}🏛️ Rasmiy Majlis`, 'set_mode_meeting')
      .row()
      .text(`${current === 'study' ? '✅ ' : ''}🎓 Dars & Ta'lim`, 'set_mode_study')
      .text(`${current === 'finance' ? '✅ ' : ''}💰 Moliya & Narxlar`, 'set_mode_finance')
      .row()
      .text(`${current === 'english' ? '✅ ' : ''}🇬🇧 IELTS & English`, 'set_mode_english');

    await ctx.reply(`
🎯 <b>AI Tahlil Rejimini Tanlang:</b>

• ⚡ <b>Standart:</b> Xulosa, topshiriqlar va to'liq matn
• 🏛️ <b>Rasmiy Majlis:</b> Kun tartibi, qarorlar, mas'ullar
• 🎓 <b>Dars Konspekti:</b> Muhim qoidalar + Imtihon savollari
• 💰 <b>Moliya:</b> Barcha aytilgan pullar va narxlar hisobi
• 🇬🇧 <b>IELTS & English:</b> Talaffuz va grammatika tekshiruvi

<i>Tanlagan rejimingiz barcha yangi audiolarga qo'llanadi:</i>
    `.trim(), { parse_mode: 'HTML', reply_markup: kb });
  }

  // /todo buyrug'i (Topshiriqlar markazi)
  bot.command('todo', async (ctx) => {
    await sendUserTodos(ctx);
  });

  bot.hears("📋 Mening To-Do'larim", async (ctx) => {
    await sendUserTodos(ctx);
  });

  async function sendUserTodos(ctx) {
    const list = getAllTranscripts(ctx.from.id);
    let allTasks = [];

    list.forEach(item => {
      (item.action_items || []).forEach((task, idx) => {
        const isDone = item.completedActions && item.completedActions[idx];
        allTasks.push({ itemId: item.id, taskIdx: idx, text: task, isDone, title: item.title });
      });
    });

    if (allTasks.length === 0) {
      return ctx.reply("🎉 <b>Sizda hali hech qanday topshiriq yo'q!</b>\nOvozli xabarlar yuborsangiz, topshiriqlar avtomatik shu yerga yig'iladi.", { parse_mode: 'HTML' });
    }

    let text = `📋 <b>Sizning Topshiriqlaringiz:</b>\n\n`;
    const kb = new InlineKeyboard();

    allTasks.slice(0, 10).forEach((t, i) => {
      text += `${t.isDone ? '✅ <s>' : '🔘 '}<b>${i + 1}.</b> ${t.text}${t.isDone ? '</s>' : ''}\n`;
      text += `   <i>📁 ${t.title}</i>\n\n`;

      if (i < 5) {
        kb.text(`${t.isDone ? '✅ ' : '🔘 '} ${i + 1}`, `toggle_todo_${t.itemId}_${t.taskIdx}`);
      }
    });

    kb.row().text("🔄 Yangilash", "refresh_todo");

    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: kb });
  }

  // /export buyrug'i (Oxirgi konspektni fayl qilib olish)
  bot.command('export', async (ctx) => {
    const last = getLastTranscriptByUser(ctx.from.id);
    if (!last) {
      return ctx.reply("⚠️ Hali hech qanday konspekt mavjud emas.");
    }

    let docText = `========================================\n`;
    docText += `VOICEPROTOCOL AI — PROTOKOL\n`;
    docText += `Mavzu: ${last.title}\n`;
    docText += `Sana: ${new Date(last.date).toLocaleString('uz-UZ')}\n`;
    docText += `Davomiyligi: ${last.duration}\n`;
    docText += `Rejim: ${last.mode || 'Standart'}\n`;
    docText += `========================================\n\n`;
    docText += `QISQACHA MAZMUN:\n${last.summary}\n\n`;

    if (last.action_items && last.action_items.length > 0) {
      docText += `TOPSHIRIQLAR & VAZIFALAR:\n`;
      last.action_items.forEach((a, i) => {
        docText += `  [ ] ${i + 1}. ${a}\n`;
      });
      docText += `\n`;
    }

    docText += `TO'LIQ SO'ZMA-SO'Z MATN:\n${last.full_transcript}\n\n`;
    docText += `Generated by VoiceProtocol AI (@voisai_bot)\n`;

    const buffer = Buffer.from(docText, 'utf-8');
    await ctx.replyWithDocument(new InputFile(buffer, `${last.title.replace(/[^a-zA-Z0-9]/g, '_')}.txt`), {
      caption: `📄 <b>${last.title}</b> hujjati tayyor!`,
      parse_mode: 'HTML'
    });
  });

  // /ref buyrug'i (Referal)
  bot.command('ref', async (ctx) => {
    await sendReferralInfo(ctx);
  });

  bot.hears("🎁 Taklif & Ballar", async (ctx) => {
    await sendReferralInfo(ctx);
  });

  async function sendReferralInfo(ctx) {
    const u = getUserData(ctx.from.id);
    const botInfo = await bot.api.getMe();
    const refLink = `https://t.me/${botInfo.username}?start=ref_${ctx.from.id}`;

    const text = `
🎁 <b>Sizning Shaxsiy Referal Dasturingiz:</b>

💎 Sizning ballaringiz: <b>${u?.points || 10} ball</b>
👥 Taklif qilgan do'stlaringiz: <b>${u?.refCount || 0} nafar</b>

🔗 <b>Sizning taklif havolangiz:</b>
<code>${refLink}</code>

<i>Har bir taklif qilingan do'stingiz uchun sizga +10 ball beriladi! Ushbu havolani do'stlaringizga ulashing.</i>
    `.trim();

    const kb = new InlineKeyboard().url("🚀 Do'stlarga ulashish", `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent("Ovozli xabarlarni matnga aylantirib, xulosa chiqarib beruvchi ajoyib AI bot! Sinab ko'r:")}`);
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: kb });
  }

  // Boshqa doimiy tugmalar
  bot.hears("🎙️ Qo'llanma", async (ctx) => {
    await ctx.reply("🎙️ Menga ixtiyoriy ovozli xabar (voice) yoki krujochek yuboring — bir zumda so'zma-so'z matn, xulosa va vazifalar ro'yxatini chiqarib beraman!");
  });

  bot.hears("📊 Statistika", async (ctx) => {
    const list = getAllTranscripts(ctx.from.id);
    const u = getUserData(ctx.from.id);
    await ctx.reply(`📊 <b>Sizning profilingiz:</b>\n• Tahlil qilingan xabarlar: <b>${list.length} ta</b>\n• To'plangan ballar: <b>${u?.points || 10} ball</b>\n• Tanlangan rejim: <b>${getModeLabel(u?.mode || 'standard')}</b>`, {
      parse_mode: 'HTML'
    });
  });

  bot.hears("🌐 Web App", async (ctx) => {
    if (webappUrl && webappUrl.startsWith('https://')) {
      const kb = new InlineKeyboard().webApp("🌐 Web App'ni ochish", webappUrl);
      await ctx.reply("📱 Konspektlar boshqaruv panelini ochish:", { reply_markup: kb });
    } else {
      await ctx.reply(`🌐 Web App mahalliy serverda: ${webappUrl}`);
    }
  });

  // Admin komandalari
  bot.command(['admin', 'stats'], async (ctx) => {
    if (String(ctx.from?.id) !== String(ADMIN_ID)) {
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

  bot.command('broadcast', async (ctx) => {
    if (String(ctx.from?.id) !== String(ADMIN_ID)) return;
    const text = ctx.message?.text?.replace('/broadcast', '').trim();
    if (!text) return ctx.reply("⚠️ Xabar matnini kiriting! Masalan: <code>/broadcast Yangilanish!</code>", { parse_mode: 'HTML' });

    const users = getAllUsers();
    let sent = 0;
    for (const u of users) {
      try {
        await ctx.api.sendMessage(u.id, `📢 <b>ADMIN XABARI:</b>\n\n${text}`, { parse_mode: 'HTML' });
        sent++;
      } catch (e) {}
    }
    await ctx.reply(`✅ Xabar <b>${sent}</b> ta foydalanuvchiga yetkazildi.`, { parse_mode: 'HTML' });
  });

  // Rejimni o'zgartirish callback query
  bot.callbackQuery(/^set_mode_/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const mode = ctx.callbackQuery.data.replace('set_mode_', '');
    setUserMode(ctx.from.id, mode);
    await ctx.reply(`✅ AI Tahlil rejimi o'zgartirildi: <b>${getModeLabel(mode)}</b>`, { parse_mode: 'HTML' });
  });

  // To-Do toggle callback query
  bot.callbackQuery(/^toggle_todo_/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const parts = ctx.callbackQuery.data.replace('toggle_todo_', '').split('_');
    const itemId = parts[0] + '_' + parts[1] + '_' + parts[2];
    const taskIdx = parseInt(parts[3], 10);

    toggleActionItem(itemId, taskIdx);
    await ctx.reply("✅ Topshiriq holati yangilandi!");
  });

  bot.callbackQuery('refresh_todo', async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendUserTodos(ctx);
  });

  bot.callbackQuery('open_modes', async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendModeSelection(ctx);
  });

  bot.callbackQuery('open_ref', async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendReferralInfo(ctx);
  });

  // TELEGRAM INLINE QUERY (@voisai_bot orqali qidirish)
  bot.on('inline_query', async (ctx) => {
    const q = ctx.inlineQuery.query.toLowerCase().trim();
    const list = getAllTranscripts(ctx.from.id);

    const filtered = list.filter(item => {
      if (!q) return true;
      return (item.title || '').toLowerCase().includes(q) || (item.summary || '').toLowerCase().includes(q);
    }).slice(0, 10);

    const results = filtered.map((item, idx) => ({
      type: 'article',
      id: `inline_${item.id}_${idx}`,
      title: item.title,
      description: item.summary?.slice(0, 80) + '...',
      input_message_content: {
        message_text: `📌 <b>${item.title}</b>\n\n💡 <b>Xulosa:</b>\n${item.summary}\n\n📜 <b>Matn:</b>\n<i>"${item.full_transcript}"</i>\n\n🤖 <i>@voisai_bot orqali tayyorlandi</i>`,
        parse_mode: 'HTML'
      }
    }));

    await ctx.answerInlineQuery(results, { cache_time: 5 });
  });

  // OVOZLI, VIDEO VA KRUJOCHEK XABARLARNI TAHLIL QILISH
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
      titleHint = 'Krujochek';
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
    const userMode = getUserMode(ctx.from.id);

    const statusMsg = await ctx.reply(
      `⏳ <i>${ctx.message.video_note ? '📹 Krujochek' : '🎙️ Audio'} qabul qilindi. <b>[${getModeLabel(userMode)}]</b> rejimida tahlil qilinmoqda...</i>`, 
      { parse_mode: 'HTML' }
    );

    try {
      await ctx.api.sendChatAction(ctx.chat.id, 'typing');

      const file = await ctx.getFile();
      const fileUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
      
      const fileResponse = await fetch(fileUrl);
      if (!fileResponse.ok) throw new Error(`Faylni yuklab bo'lmadi: ${fileResponse.statusText}`);
      
      const arrayBuffer = await fileResponse.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // AI tahlil (foydalanuvchi rejimi bilan)
      const result = await analyzeMedia(buffer, mimeType, `${titleHint} (${durationStr})`, userMode);

      const savedItem = saveTranscript({
        userId: String(ctx.from.id),
        userName: ctx.from.username || ctx.from.first_name || 'Foydalanuvchi',
        chatType: ctx.chat.type,
        mode: userMode,
        title: result.title,
        language: result.language,
        duration: durationStr,
        summary: result.summary,
        action_items: result.action_items,
        decisions: result.decisions,
        key_terms: result.key_terms,
        exam_questions: result.exam_questions,
        financial_items: result.financial_items,
        total_estimated: result.total_estimated,
        errors_and_corrections: result.errors_and_corrections,
        vocabulary_suggestions: result.vocabulary_suggestions,
        answer_or_advice: result.answer_or_advice,
        full_transcript: result.full_transcript,
        isDemo: result.isDemo
      });

      try { await ctx.api.deleteMessage(ctx.chat.id, statusMsg.message_id); } catch (e) {}

      // Xabarni rejimga qarab moslash
      let messageText = `📌 <b>${result.title}</b>\n`;
      messageText += `🎯 <i>Rejim: ${getModeLabel(userMode)} | ⏱️ ${durationStr} | 📝 ${savedItem.wordsCount} ta so'z</i>\n\n`;
      
      messageText += `💡 <b>Xulosa:</b>\n${result.summary}\n\n`;

      // Rasmiy majlis qarorlari
      if (result.decisions && result.decisions.length > 0) {
        messageText += `🏛️ <b>Qabul qilingan qarorlar:</b>\n`;
        result.decisions.forEach(d => { messageText += `• ${d}\n`; });
        messageText += `\n`;
      }

      // Dars atamalari va imtihon savollari
      if (result.key_terms && result.key_terms.length > 0) {
        messageText += `🔑 <b>Muhim atamalar:</b>\n`;
        result.key_terms.forEach(k => { messageText += `• ${k}\n`; });
        messageText += `\n`;
      }
      if (result.exam_questions && result.exam_questions.length > 0) {
        messageText += `❓ <b>Imtihon / Nazorat savollari:</b>\n`;
        result.exam_questions.forEach((q, i) => { messageText += `${i + 1}. ${q}\n`; });
        messageText += `\n`;
      }

      // Moliyaviy xarajatlar
      if (result.financial_items && result.financial_items.length > 0) {
        messageText += `💰 <b>Hisob-kitoblar & Xarajatlar:</b>\n`;
        result.financial_items.forEach(f => { messageText += `• ${f}\n`; });
        if (result.total_estimated) messageText += `💵 <b>Jami taxminiy:</b> ${result.total_estimated}\n`;
        messageText += `\n`;
      }

      // IELTS & Ingliz tili xatolari
      if (result.errors_and_corrections && result.errors_and_corrections.length > 0) {
        messageText += `🇬🇧 <b>Grammar & Vocabulary Corrections:</b>\n`;
        result.errors_and_corrections.forEach(ec => { messageText += `⚠️ ${ec}\n`; });
        messageText += `\n`;
      }

      // Topshiriqlar
      const hasActions = result.action_items && result.action_items.length > 0;
      if (hasActions) {
        messageText += `✅ <b>Vazifalar & Topshiriqlar:</b>\n`;
        result.action_items.forEach((item, idx) => {
          messageText += `  <b>${idx + 1}.</b> ${item}\n`;
        });
        messageText += `\n`;
      }

      if (result.answer_or_advice && result.answer_or_advice.trim() !== '') {
        messageText += `💬 <b>Javob / Maslahat:</b>\n${result.answer_or_advice}\n\n`;
      }

      messageText += `📜 <b>So'zma-so'z matn:</b>\n<i>"${result.full_transcript}"</i>`;

      // Interaktiv inline tugmalar
      const itemKeyboard = new InlineKeyboard();
      if (hasActions) {
        result.action_items.slice(0, 4).forEach((_, idx) => {
          itemKeyboard.text(`🔘 ${idx + 1}`, `toggle_todo_${savedItem.id}_${idx}`);
        });
        itemKeyboard.row();
      }

      if (webappUrl && webappUrl.startsWith('https://')) {
        itemKeyboard.webApp('🌐 Web App\'da ochish', `${webappUrl}?item=${savedItem.id}`);
      }

      await ctx.reply(messageText, {
        parse_mode: 'HTML',
        reply_markup: itemKeyboard.inline_keyboard.length > 0 ? itemKeyboard : undefined
      });

    } catch (error) {
      console.error('Tahlilda xatolik:', error);
      await ctx.reply(`❌ Xatolik yuz berdi: ${error.message}`);
    }
  });

  // AI BILAN MATNLI SUHBAT
  bot.on('message:text', async (ctx) => {
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

function getModeLabel(mode) {
  switch(mode) {
    case 'meeting': return '🏛️ Rasmiy Majlis';
    case 'study': return "🎓 Dars & Ta'lim";
    case 'finance': return '💰 Moliya & Narxlar';
    case 'english': return '🇬🇧 IELTS & English';
    default: return '⚡ Standart';
  }
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
