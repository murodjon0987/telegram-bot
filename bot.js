import { Bot, InlineKeyboard, Keyboard, InputFile } from 'grammy';
import dotenv from 'dotenv';
import { analyzeMedia, chatWithAI } from './aiService.js';
import { 
  generateSocialPost, 
  generateQuiz, 
  generateMindmap, 
  generateELI5, 
  translateText, 
  analyzeSpeechQuality 
} from './toolsService.js';
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
  getUserData,
  setCachedQuiz,
  getCachedQuiz,
  getPromptCategories,
  searchPrompts,
  getPromptById,
  getRandomPrompt,
  getUserFavorites,
  toggleFavoritePrompt,
  isPromptFavorited
} from './storage.js';

dotenv.config();

const token = process.env.BOT_TOKEN;
const webappUrl = process.env.WEBAPP_URL || 'http://localhost:3000';
const ADMIN_ID = process.env.ADMIN_ID || '6268220201';

// Asosiy doimiy klaviatura
function getMainKeyboard() {
  return new Keyboard()
    .text("💡 4000 ta AI Promptlar").text("📋 Mening To-Do'larim")
    .row()
    .text("🎯 AI Rejimlari").text("⚡ AI Vositalar")
    .row()
    .text("📊 Statistika").text("🌐 Web App")
    .row()
    .text("🎙️ Qo'llanma")
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
      inlineKeyboard.webApp('🌐 Web App & Promptlar', webappUrl).row();
    }
    inlineKeyboard
      .text('💡 4000 AI Promptlar', 'open_prompts')
      .row()
      .text('🎯 AI Rejimini tanlash', 'open_modes')
      .text('⚡ AI Vositalar Do\'koni', 'open_tools');

    const welcomeText = `
👋 Assalomu alaykum, <b>${firstName}</b>!

Men <b>VoiceProtocol Super AI</b> — audio va videoni tahlil qiluvchi, kontent yaratuvchi va <b>4,000 ta AI Promptlar</b> bilan qurollangan universal platformaman!

🎯 <b>Hozirgi rejim:</b> <code>${getModeLabel(currentMode)}</code>

🎙️ <b>Nimalar qila olaman?</b>
• 🎙️ <b>Ovozli xabar & Krujochek</b> tahlili
• 💡 <b>4,000 ta AI Promptlar:</b> SMM, Biznes, Marketing, IT va Kopirayting shablonlari
• 📱 <b>SMM Post:</b> Telegram, LinkedIn, Twitter, Reels ssenariysi
• 🧠 <b>Quiz & Test:</b> Audiodan 4 variantli testlar tuzish
• 🗺️ <b>MindMap:</b> G'oyalarning daraxtsimon grafik xaritasi
• 🌐 <b>Tarjimon:</b> 10 xil xorijiy tilga lahzalik tarjima
• 🧼 <b>Nutq tahlili:</b> Parazit so'zlarni sanash va notiqlik bahosi

⚡ <b>Tezkor komandalar:</b>
/prompts — 4,000 ta AI promptlar kutubxonasi
/tools — Barcha aqlli AI vositalar
/mode — AI tahlil rejimini tanlash
/todo — Topshiriqlar ro'yxati
/export — .txt fayl qilib yuklab olish
/ref — Shaxsiy referal va ballar

<i>Sinab ko'rish uchun hoziroq ovozli xabar yuboring yoki /prompts ni bosing! 👇</i>
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

  // /prompts buyrug'i (4,000 ta AI Promptlar)
  bot.command(['prompts', 'prompt', 'shablonlar', 'ai4000'], async (ctx) => {
    const textParts = (ctx.message.text || '').split(' ');
    if (textParts.length > 1) {
      const q = textParts.slice(1).join(' ').trim();
      if (q) return await sendPromptSearchResult(ctx, q);
    }
    await sendPromptCategoriesMenu(ctx);
  });

  bot.hears(["💡 4000 ta AI Promptlar", "💡 Promptlar", "4000 ta prompt", "Promptlar"], async (ctx) => {
    await sendPromptCategoriesMenu(ctx);
  });

  // /tools buyrug'i (Universal Vositalar Menyusi)
  bot.command(['tools', 'vositalar'], async (ctx) => {
    await sendToolsMenu(ctx);
  });

  bot.hears("⚡ AI Vositalar", async (ctx) => {
    await sendToolsMenu(ctx);
  });

  async function sendToolsMenu(ctx) {
    const kb = new InlineKeyboard()
      .text("📱 Post yaratish (SMM)", "tool_menu_post")
      .text("🧠 Test / Quiz tuzish", "tool_menu_quiz")
      .row()
      .text("🗺️ MindMap (Xarita)", "tool_menu_mindmap")
      .text("🌐 10 Tilli Tarjimon", "tool_menu_translate")
      .row()
      .text("🧼 Parazit so'zlar tahlili", "tool_menu_clean")
      .text("👶 Oson tushuntir (ELI5)", "tool_menu_eli5");

    await ctx.reply(`
🛠️ <b>Universal AI Vositalar Suite:</b>

Oxirgi yuborgan ovozli xabaringiz yoki krujochekingizdan qanday natija olmoqchisiz? Tanlang:

• 📱 <b>Post yaratish:</b> Telegram, LinkedIn, Twitter yoki Reels uchun
• 🧠 <b>Quiz / Test:</b> Bilimni tekshirish uchun testlar
• 🗺️ <b>MindMap:</b> Asosiy fikrlar va g'oyalar shajarasi
• 🌐 <b>Tarjimon:</b> Rus, Ingliz, Turk, Arab va boshqa tillarga
• 🧼 <b>Nutq tahlili:</b> Notiqlik bahosi va parazit so'zlar
• 👶 <b>ELI5:</b> 5 yoshli bolaga tushuntirgandek sodda tahlil
    `.trim(), { parse_mode: 'HTML', reply_markup: kb });
  }

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

<i>Tanlagan rejimingiz yangi ovozlarga qo'llanadi:</i>
    `.trim(), { parse_mode: 'HTML', reply_markup: kb });
  }

  // /todo buyrug'i
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

    allTasks.slice(0, 8).forEach((t, i) => {
      text += `${t.isDone ? '✅ <s>' : '🔘 '}<b>${i + 1}.</b> ${t.text}${t.isDone ? '</s>' : ''}\n`;
      text += `   <i>📁 ${t.title}</i>\n\n`;
      if (i < 4) {
        kb.text(`${t.isDone ? '✅ ' : '🔘 '} ${i + 1}`, `toggle_todo_${t.itemId}_${t.taskIdx}`);
      }
    });

    kb.row().text("🔄 Yangilash", "refresh_todo");
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: kb });
  }

  // /export buyrug'i
  bot.command('export', async (ctx) => {
    const last = getLastTranscriptByUser(ctx.from.id);
    if (!last) return ctx.reply("⚠️ Hali hech qanday konspekt mavjud emas.");
    await sendTranscriptDocument(ctx, last);
  });

  async function sendTranscriptDocument(ctx, item) {
    let docText = `========================================\n`;
    docText += `VOICEPROTOCOL AI — PROTOKOL\n`;
    docText += `Mavzu: ${item.title}\n`;
    docText += `Sana: ${new Date(item.date).toLocaleString('uz-UZ')}\n`;
    docText += `Davomiyligi: ${item.duration} | So'zlar: ${item.wordsCount || 0}\n`;
    docText += `========================================\n\n`;
    docText += `QISQACHA MAZMUN:\n${item.summary}\n\n`;

    if (item.action_items && item.action_items.length > 0) {
      docText += `TOPSHIRIQLAR & VAZIFALAR:\n`;
      item.action_items.forEach((a, i) => {
        docText += `  [ ] ${i + 1}. ${a}\n`;
      });
      docText += `\n`;
    }

    docText += `TO'LIQ SO'ZMA-SO'Z MATN:\n${item.full_transcript}\n\n`;
    docText += `Generated by VoiceProtocol AI (@voisai_bot)\n`;

    const buffer = Buffer.from(docText, 'utf-8');
    await ctx.replyWithDocument(new InputFile(buffer, `${item.title.replace(/[^a-zA-Z0-9]/g, '_')}.txt`), {
      caption: `📄 <b>${item.title}</b> hujjati tayyor!`,
      parse_mode: 'HTML'
    });
  }

  // /ref buyrug'i
  bot.command('ref', async (ctx) => {
    const u = getUserData(ctx.from.id);
    const botInfo = await bot.api.getMe();
    const refLink = `https://t.me/${botInfo.username}?start=ref_${ctx.from.id}`;

    const text = `
🎁 <b>Sizning Shaxsiy Referal Dasturingiz:</b>

💎 Sizning ballaringiz: <b>${u?.points || 10} ball</b>
👥 Taklif qilgan do'stlaringiz: <b>${u?.refCount || 0} nafar</b>

🔗 <b>Sizning taklif havolangiz:</b>
<code>${refLink}</code>

<i>Do'stlaringizga ulashing va har bir yangi foydalanuvchi uchun +10 ball oling!</i>
    `.trim();

    const kb = new InlineKeyboard().url("🚀 Do'stlarga ulashish", `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent("Ovozli xabarlarni matnga aylantirib, xulosa va postlar yasab beruvchi ajoyib AI bot! Sinab ko'r:")}`);
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: kb });
  });

  // /clean buyrug'i (Parazit so'zlar)
  bot.command('clean', async (ctx) => {
    const last = getLastTranscriptByUser(ctx.from.id);
    if (!last) return ctx.reply("⚠️ Avval ovozli xabar yoki krujochek yuboring.");
    await handleSpeechQualityAnalysis(ctx, last.full_transcript);
  });

  // /quiz buyrug'i
  bot.command('quiz', async (ctx) => {
    const last = getLastTranscriptByUser(ctx.from.id);
    if (!last) return ctx.reply("⚠️ Avval ovozli xabar yoki krujochek yuboring.");
    await handleQuizGeneration(ctx, last.full_transcript);
  });

  // /mindmap buyrug'i
  bot.command('mindmap', async (ctx) => {
    const last = getLastTranscriptByUser(ctx.from.id);
    if (!last) return ctx.reply("⚠️ Avval ovozli xabar yoki krujochek yuboring.");
    await handleMindmapGeneration(ctx, last.full_transcript);
  });

  // /post buyrug'i
  bot.command('post', async (ctx) => {
    await sendPostPlatformOptions(ctx);
  });

  // /translate buyrug'i
  bot.command('translate', async (ctx) => {
    await sendTranslateOptions(ctx);
  });

  // SMM Platformalar menyusi
  async function sendPostPlatformOptions(ctx, itemId = null) {
    const kb = new InlineKeyboard()
      .text("📱 Telegram Post", `gen_post_telegram_${itemId || 'last'}`)
      .text("💼 LinkedIn Post", `gen_post_linkedin_${itemId || 'last'}`)
      .row()
      .text("🐦 Twitter/X Thread", `gen_post_twitter_${itemId || 'last'}`)
      .text("🎬 Reels / Shorts Ssenariy", `gen_post_reels_${itemId || 'last'}`)
      .row()
      .text("📧 Rasmiy Email", `gen_post_email_${itemId || 'last'}`);

    await ctx.reply("📱 <b>Qaysi platforma uchun post tayyorlaymiz?</b>", { parse_mode: 'HTML', reply_markup: kb });
  }

  // Tarjima tillari menyusi
  async function sendTranslateOptions(ctx, itemId = null) {
    const id = itemId || 'last';
    const kb = new InlineKeyboard()
      .text("🇷🇺 Ruscha", `do_tr_ru_${id}`).text("🇬🇧 Inglizcha", `do_tr_en_${id}`).row()
      .text("🇹🇷 Turkcha", `do_tr_tr_${id}`).text("🇸🇦 Arabcha", `do_tr_ar_${id}`).row()
      .text("🇩🇪 Nemischa", `do_tr_de_${id}`).text("🇫🇷 Fransuzcha", `do_tr_fr_${id}`).row()
      .text("🇨🇳 Xitoycha", `do_tr_zh_${id}`).text("🇰🇷 Koreyscha", `do_tr_ko_${id}`);

    await ctx.reply("🌐 <b>Qaysi tilga tarjima qilamiz?</b>", { parse_mode: 'HTML', reply_markup: kb });
  }

  // Handlers for Tools
  async function handleSpeechQualityAnalysis(ctx, text) {
    const waitMsg = await ctx.reply("⏳ <i>Nutq tahlil qilinmoqda, parazit so'zlar sanalmoqda...</i>", { parse_mode: 'HTML' });
    const analysis = await analyzeSpeechQuality(text);
    try { await ctx.api.deleteMessage(ctx.chat.id, waitMsg.message_id); } catch(e) {}

    let res = `🧼 <b>NOTIQLIK & NUTQ TAHLILI:</b>\n\n`;
    res += `⭐️ <b>Nutq bahosi:</b> <code>${analysis.score}/10 ball</code>\n`;
    res += `⚠️ <b>Parazit so'zlar soni:</b> <code>${analysis.filler_count} ta</code>\n`;
    if (analysis.filler_words && analysis.filler_words.length > 0) {
      res += `🔍 <b>Aniqlangan so'zlar:</b> ${analysis.filler_words.join(', ')}\n`;
    }
    res += `\n💡 <b>Tavsiyalar:</b>\n`;
    (analysis.advice || []).forEach(a => { res += `• ${a}\n`; });
    res += `\n✨ <b>Tozalangan ideal matn:</b>\n<i>"${analysis.cleaned_text}"</i>`;

    await ctx.reply(res, { parse_mode: 'HTML' });
  }

  async function handleQuizGeneration(ctx, text) {
    const waitMsg = await ctx.reply("⏳ <i>Audiodan test savollari tuzilmoqda...</i>", { parse_mode: 'HTML' });
    const quizList = await generateQuiz(text);
    try { await ctx.api.deleteMessage(ctx.chat.id, waitMsg.message_id); } catch(e) {}

    if (!quizList || quizList.length === 0) {
      return ctx.reply("⚠️ Test savollari tuzish uchun audioda ma'lumot yetarli emas.");
    }

    setCachedQuiz(ctx.from.id, quizList);

    for (let i = 0; i < quizList.length; i++) {
      const q = quizList[i];
      let qText = `❓ <b>${i + 1}-SAVOL:</b>\n${q.question}\n\n`;
      const kb = new InlineKeyboard();

      q.options.forEach((opt, optIdx) => {
        qText += `${opt}\n`;
        const letter = String.fromCharCode(65 + optIdx); // A, B, C, D
        kb.text(letter, `ans_quiz_${i}_${optIdx}`);
      });

      await ctx.reply(qText, { parse_mode: 'HTML', reply_markup: kb });
    }
  }

  async function handleMindmapGeneration(ctx, text) {
    const waitMsg = await ctx.reply("⏳ <i>G'oyalar xaritasi (MindMap) tuzilmoqda...</i>", { parse_mode: 'HTML' });
    const mindmapText = await generateMindmap(text);
    try { await ctx.api.deleteMessage(ctx.chat.id, waitMsg.message_id); } catch(e) {}

    await ctx.reply(`🗺️ <b>G'OYALAR VA FIKRLAR XARITASI:</b>\n\n<pre>${mindmapText}</pre>`, { parse_mode: 'HTML' });
  }

  async function handleELI5Generation(ctx, text) {
    const waitMsg = await ctx.reply("⏳ <i>Sodda tilda bayon qilinmoqda...</i>", { parse_mode: 'HTML' });
    const eli5Text = await generateELI5(text);
    try { await ctx.api.deleteMessage(ctx.chat.id, waitMsg.message_id); } catch(e) {}

    await ctx.reply(`👶 <b>OSON VA SODDA TALQIN (ELI5):</b>\n\n${eli5Text}`, { parse_mode: 'HTML' });
  }

  // Callback query-lar (Tugmalar bosilganda)
  bot.callbackQuery('open_tools', async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendToolsMenu(ctx);
  });

  bot.callbackQuery('tool_menu_post', async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendPostPlatformOptions(ctx);
  });

  bot.callbackQuery('tool_menu_quiz', async (ctx) => {
    await ctx.answerCallbackQuery();
    const last = getLastTranscriptByUser(ctx.from.id);
    if (!last) return ctx.reply("⚠️ Avval ovozli xabar yuboring.");
    await handleQuizGeneration(ctx, last.full_transcript);
  });

  bot.callbackQuery('tool_menu_mindmap', async (ctx) => {
    await ctx.answerCallbackQuery();
    const last = getLastTranscriptByUser(ctx.from.id);
    if (!last) return ctx.reply("⚠️ Avval ovozli xabar yuboring.");
    await handleMindmapGeneration(ctx, last.full_transcript);
  });

  bot.callbackQuery('tool_menu_translate', async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendTranslateOptions(ctx);
  });

  bot.callbackQuery('tool_menu_clean', async (ctx) => {
    await ctx.answerCallbackQuery();
    const last = getLastTranscriptByUser(ctx.from.id);
    if (!last) return ctx.reply("⚠️ Avval ovozli xabar yuboring.");
    await handleSpeechQualityAnalysis(ctx, last.full_transcript);
  });

  bot.callbackQuery('tool_menu_eli5', async (ctx) => {
    await ctx.answerCallbackQuery();
    const last = getLastTranscriptByUser(ctx.from.id);
    if (!last) return ctx.reply("⚠️ Avval ovozli xabar yuboring.");
    await handleELI5Generation(ctx, last.full_transcript);
  });

  // Post generatsiyasi callback
  bot.callbackQuery(/^gen_post_/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const parts = ctx.callbackQuery.data.replace('gen_post_', '').split('_');
    const platform = parts[0];
    const itemId = parts[1];

    const targetItem = (itemId === 'last') ? getLastTranscriptByUser(ctx.from.id) : getTranscriptById(itemId);
    if (!targetItem) return ctx.reply("⚠️ Konspekt topilmadi.");

    const waitMsg = await ctx.reply(`⏳ <i>${platform.toUpperCase()} uchun post tayyorlanmoqda...</i>`, { parse_mode: 'HTML' });
    const postContent = await generateSocialPost(targetItem.full_transcript, platform);
    try { await ctx.api.deleteMessage(ctx.chat.id, waitMsg.message_id); } catch(e) {}

    await ctx.reply(`📱 <b>${platform.toUpperCase()} POSTI:</b>\n\n${postContent}`, { parse_mode: 'HTML' });
  });

  // Tarjima callback
  bot.callbackQuery(/^do_tr_/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const parts = ctx.callbackQuery.data.replace('do_tr_', '').split('_');
    const langCode = parts[0];
    const itemId = parts[1];

    const targetItem = (itemId === 'last') ? getLastTranscriptByUser(ctx.from.id) : getTranscriptById(itemId);
    if (!targetItem) return ctx.reply("⚠️ Konspekt topilmadi.");

    const waitMsg = await ctx.reply("⏳ <i>Tarjima qilinmoqda...</i>", { parse_mode: 'HTML' });
    const translated = await translateText(targetItem.full_transcript, langCode);
    try { await ctx.api.deleteMessage(ctx.chat.id, waitMsg.message_id); } catch(e) {}

    await ctx.reply(`🌐 <b>TARJIMA:</b>\n\n${translated}`, { parse_mode: 'HTML' });
  });

  // Quiz javoblari callback
  bot.callbackQuery(/^ans_quiz_/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const parts = ctx.callbackQuery.data.replace('ans_quiz_', '').split('_');
    const qIndex = parseInt(parts[0], 10);
    const chosenOpt = parseInt(parts[1], 10);

    const quizzes = getCachedQuiz(ctx.from.id);
    if (!quizzes || !quizzes[qIndex]) {
      return ctx.reply("⚠️ Test muddati tugagan. Qaytadan /quiz buyrug'ini bering.");
    }

    const q = quizzes[qIndex];
    const isCorrect = (chosenOpt === q.correct);
    const correctLetter = String.fromCharCode(65 + q.correct);

    if (isCorrect) {
      await ctx.reply(`🎉 <b>TO'G'RI JAVOB!</b>\n${q.options[q.correct]}\n\n💡 <i>${q.explanation}</i>`, { parse_mode: 'HTML' });
    } else {
      await ctx.reply(`❌ <b>Noto'g'ri.</b>\nTo'g'ri javob: <b>${correctLetter}) ${q.options[q.correct]}</b>\n\n💡 <i>${q.explanation}</i>`, { parse_mode: 'HTML' });
    }
  });

  // Tezkor tugmalar (Karta ostidagi)
  bot.callbackQuery(/^quick_post_/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const itemId = ctx.callbackQuery.data.replace('quick_post_', '');
    await sendPostPlatformOptions(ctx, itemId);
  });

  bot.callbackQuery(/^quick_quiz_/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const itemId = ctx.callbackQuery.data.replace('quick_quiz_', '');
    const item = getTranscriptById(itemId);
    if (item) await handleQuizGeneration(ctx, item.full_transcript);
  });

  bot.callbackQuery(/^quick_mindmap_/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const itemId = ctx.callbackQuery.data.replace('quick_mindmap_', '');
    const item = getTranscriptById(itemId);
    if (item) await handleMindmapGeneration(ctx, item.full_transcript);
  });

  bot.callbackQuery(/^quick_translate_/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const itemId = ctx.callbackQuery.data.replace('quick_translate_', '');
    await sendTranslateOptions(ctx, itemId);
  });

  bot.callbackQuery(/^quick_clean_/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const itemId = ctx.callbackQuery.data.replace('quick_clean_', '');
    const item = getTranscriptById(itemId);
    if (item) await handleSpeechQualityAnalysis(ctx, item.full_transcript);
  });

  bot.callbackQuery(/^quick_export_/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const itemId = ctx.callbackQuery.data.replace('quick_export_', '');
    const item = getTranscriptById(itemId);
    if (item) await sendTranscriptDocument(ctx, item);
  });

  // Rejim callback
  bot.callbackQuery(/^set_mode_/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const mode = ctx.callbackQuery.data.replace('set_mode_', '');
    setUserMode(ctx.from.id, mode);
    await ctx.reply(`✅ AI Tahlil rejimi o'zgartirildi: <b>${getModeLabel(mode)}</b>`, { parse_mode: 'HTML' });
  });

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

  // ==========================================
  // 💡 4,000 TA AI PROMPTLAR BOT MODULI
  // ==========================================

  function escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  async function sendPromptCategoriesMenu(ctx, isEdit = false) {
    const categories = getPromptCategories();
    const kb = new InlineKeyboard();

    for (let i = 0; i < categories.length; i += 2) {
      const c1 = categories[i];
      const c2 = categories[i + 1];
      if (c1 && c2) {
        kb.text(`${c1.icon} ${c1.name.split('&')[0].trim()} (${c1.count})`, `pr_cat_${c1.id}`)
          .text(`${c2.icon} ${c2.name.split('&')[0].trim()} (${c2.count})`, `pr_cat_${c2.id}`)
          .row();
      } else if (c1) {
        kb.text(`${c1.icon} ${c1.name.split('&')[0].trim()} (${c1.count})`, `pr_cat_${c1.id}`).row();
      }
    }

    kb.text("🎲 Tasodifiy prompt", "pr_rnd_all")
      .text("⭐ Sevimlilar", "pr_favs_list")
      .row();

    if (webappUrl && webappUrl.startsWith('https://')) {
      kb.webApp("🌐 Web App'da to'liq ko'rish", `${webappUrl}?tab=prompts`).row();
    }

    const text = `
💡 <b>4,000 TA AI PROMPTLAR & BIZNES SHABLONLARI</b>

Biznes, SMM, marketing, IT, HR va sotuv sohalarida amaliy qo'llanadigan eng sara <b>4,000 ta</b> tayyor AI master-promptlar kutubxonasi!

📂 <b>Yo'nalishni tanlang:</b>
<i>(Yoki botga <code>prompt [so'z]</code> deb yozib qidiring, masalan: <code>prompt reels</code>)</i>
    `.trim();

    if (isEdit) {
      try {
        await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: kb });
        return;
      } catch (e) {}
    }
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: kb });
  }

  async function sendPromptSubcategoriesMenu(ctx, categoryId, isEdit = false) {
    const categories = getPromptCategories();
    const cat = categories.find(c => c.id === categoryId);
    if (!cat) return ctx.reply("⚠️ Toifa topilmadi.");

    const kb = new InlineKeyboard();
    cat.subcategories.forEach(sub => {
      kb.text(`👉 ${sub.name}`, `pr_sub_${cat.id}_${sub.tag}_1`).row();
    });

    kb.text("🎲 Shu toifadan tasodifiy", `pr_rnd_${cat.id}`).row();
    kb.text("⬅️ Barcha toifalar", "pr_cats_menu");

    const text = `
${cat.icon} <b>${escapeHtml(cat.name.toUpperCase())}</b> (${cat.count} ta prompt)

Qaysi bo'limdagi promptlarni ko'rmoqchisiz? Tanlang:
    `.trim();

    if (isEdit) {
      try {
        await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: kb });
        return;
      } catch (e) {}
    }
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: kb });
  }

  async function sendPromptListMenu(ctx, categoryId, subTag, page = 1, isEdit = false) {
    const limit = 5;
    const result = searchPrompts({ categoryId, subcategoryTag: subTag, page, limit });
    
    if (result.prompts.length === 0) {
      return ctx.reply("⚠️ Bu bo'limda promptlar topilmadi.");
    }

    const first = result.prompts[0];
    let text = `📂 <b>${first.categoryIcon} ${escapeHtml(first.categoryName)}</b>\n`;
    text += `🔹 <b>${escapeHtml(first.subcategoryName)}</b> (Jami: ${result.total} ta)\n`;
    text += `📄 <i>Sahifa: ${result.page} / ${result.totalPages}</i>\n\n`;

    const kb = new InlineKeyboard();

    result.prompts.forEach((p, idx) => {
      const num = (result.page - 1) * limit + idx + 1;
      text += `<b>${num}. ${escapeHtml(p.title)}</b>\n`;
      text += `   📝 <i>${escapeHtml(p.description.slice(0, 75))}...</i>\n\n`;
      kb.text(`👁️ ${num}. Ko'rish`, `pr_view_${p.id}`);
      if ((idx + 1) % 2 === 0 || idx === result.prompts.length - 1) {
        kb.row();
      }
    });

    const navRow = [];
    if (result.page > 1) {
      navRow.push({ text: "⬅️ Oldingi", data: `pr_sub_${categoryId}_${subTag}_${result.page - 1}` });
    }
    if (result.page < result.totalPages) {
      navRow.push({ text: "Keyingi ➡️", data: `pr_sub_${categoryId}_${subTag}_${result.page + 1}` });
    }
    if (navRow.length > 0) {
      navRow.forEach(btn => kb.text(btn.text, btn.data));
      kb.row();
    }

    kb.text("📂 Bo'limlarga qaytish", `pr_cat_${categoryId}`);

    if (isEdit) {
      try {
        await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: kb });
        return;
      } catch (e) {}
    }
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: kb });
  }

  async function sendPromptCard(ctx, promptId, isEdit = false) {
    const p = getPromptById(promptId);
    if (!p) return ctx.reply("⚠️ Prompt topilmadi.");

    const userId = ctx.from?.id;
    const isFav = isPromptFavorited(userId, p.id);

    let text = `${p.categoryIcon} <b>${escapeHtml(p.title)}</b>\n\n`;
    text += `📁 <b>Toifa:</b> ${escapeHtml(p.categoryName)} » ${escapeHtml(p.subcategoryName)}\n`;
    text += `🎯 <b>Daraja:</b> <code>${escapeHtml(p.difficulty)}</code> | 🏷️ <i>#${p.tags.slice(0, 4).map(escapeHtml).join(' #')}</i>\n`;
    text += `💡 <b>Maqsad:</b> <i>${escapeHtml(p.description)}</i>\n\n`;
    text += `📋 <b>AI PROMPT MATNI (Nusxa olish uchun bosing):</b>\n`;
    text += `<pre><code>${escapeHtml(p.prompt)}</code></pre>\n`;
    text += `<i>💡 Qavs ichidagi [Mavzu] kabi parametrlarni o'zingizga moslab o'zgartiring.</i>`;

    const kb = new InlineKeyboard()
      .text("⚡ AI da ishlatish (Natija olish)", `pr_ai_${p.id}`).row()
      .text(isFav ? "⭐ Saqlangan (Olib tashlash)" : "☆ Sevimlilarga saqlash", `pr_fav_${p.id}`)
      .text("🎲 Boshqa prompt", `pr_rnd_${p.categoryId}`).row()
      .text("⬅️ Ro'yxatga qaytish", `pr_sub_${p.categoryId}_${p.subcategoryTag}_1`);

    if (isEdit) {
      try {
        await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: kb });
        return;
      } catch (e) {}
    }
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: kb });
  }

  async function executePromptWithAI(ctx, promptId) {
    const p = getPromptById(promptId);
    if (!p) return ctx.reply("⚠️ Prompt topilmadi.");

    const waitMsg = await ctx.reply(
      `⚡ <b>"${escapeHtml(p.title)}"</b> bo'yicha sun'iy intellekt ishga tushirildi...\n<i>Gemini AI orqali natija tayyorlanmoqda...</i>`,
      { parse_mode: 'HTML' }
    );

    try {
      await ctx.api.sendChatAction(ctx.chat.id, 'typing');
      const aiReply = await chatWithAI(p.prompt, `Soha: ${p.categoryName}, Yo'nalish: ${p.subcategoryName}`);
      try { await ctx.api.deleteMessage(ctx.chat.id, waitMsg.message_id); } catch(e) {}

      let resultText = `✨ <b>AI NATIJASI:</b>\n<i>(${escapeHtml(p.title)})</i>\n\n${escapeHtml(aiReply)}`;

      if (resultText.length > 4000) {
        const chunks = [];
        let curr = resultText;
        while (curr.length > 0) {
          chunks.push(curr.slice(0, 4000));
          curr = curr.slice(4000);
        }
        for (const ch of chunks) {
          try {
            await ctx.reply(ch, { parse_mode: 'HTML' });
          } catch(e) {
            await ctx.reply(ch);
          }
        }
      } else {
        const kb = new InlineKeyboard().text("⬅️ Promptga qaytish", `pr_view_${p.id}`);
        try {
          await ctx.reply(resultText, { parse_mode: 'HTML', reply_markup: kb });
        } catch(e) {
          await ctx.reply(`✨ AI NATIJASI:\n(${p.title})\n\n${aiReply}`, { reply_markup: kb });
        }
      }
    } catch (err) {
      try { await ctx.api.deleteMessage(ctx.chat.id, waitMsg.message_id); } catch(e) {}
      await ctx.reply(`❌ AI bilan ishlashda xatolik: ${err.message}`);
    }
  }

  async function sendUserFavoritesMenu(ctx, isEdit = false) {
    const userId = ctx.from?.id;
    const favs = getUserFavorites(userId);

    if (favs.length === 0) {
      const kb = new InlineKeyboard().text("📂 4000 Promptlar kutubxonasi", "pr_cats_menu");
      const text = "⭐ <b>Sizda hali saqlangan sevimli promptlar yo'q!</b>\nIstalgan prompt kartasida '☆ Sevimlilarga saqlash' tugmasini bosing.";
      if (isEdit) {
        try { await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: kb }); return; } catch(e) {}
      }
      return ctx.reply(text, { parse_mode: 'HTML', reply_markup: kb });
    }

    let text = `⭐ <b>SIZNING SEVIMLI PROMPTLARINGIZ (${favs.length} ta):</b>\n\n`;
    const kb = new InlineKeyboard();

    favs.slice(0, 10).forEach((p, idx) => {
      text += `<b>${idx + 1}. ${p.categoryIcon} ${escapeHtml(p.title)}</b>\n`;
      kb.text(`👁️ ${idx + 1}. Ko'rish`, `pr_view_${p.id}`);
      if ((idx + 1) % 2 === 0 || idx === favs.length - 1) kb.row();
    });

    kb.text("📂 Barcha toifalar", "pr_cats_menu");

    if (isEdit) {
      try { await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: kb }); return; } catch(e) {}
    }
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: kb });
  }

  async function sendPromptSearchResult(ctx, query) {
    const res = searchPrompts({ query, page: 1, limit: 6 });
    if (res.prompts.length === 0) {
      const kb = new InlineKeyboard().text("📂 Barcha toifalarni ko'rish", "pr_cats_menu");
      return ctx.reply(`🔍 <b>"${escapeHtml(query)}"</b> bo'yicha hech qanday prompt topilmadi.\nBoshqa kalit so'z bilan izlab ko'ring (masalan: <i>reels, sotuv, target, pitching, rezyume</i>).`, {
        parse_mode: 'HTML',
        reply_markup: kb
      });
    }

    let text = `🔍 <b>"${escapeHtml(query)}" BO'YICHA QIDIRUV NATIJALARI:</b>\n`;
    text += `<i>Topildi: ${res.total} ta prompt (dastlabki 6 tasi):</i>\n\n`;

    const kb = new InlineKeyboard();
    res.prompts.forEach((p, idx) => {
      text += `<b>${idx + 1}. ${p.categoryIcon} ${escapeHtml(p.title)}</b>\n`;
      text += `   <i>📁 ${escapeHtml(p.categoryName)} » ${escapeHtml(p.subcategoryName)}</i>\n\n`;
      kb.text(`👁️ ${idx + 1}. Ko'rish`, `pr_view_${p.id}`);
      if ((idx + 1) % 2 === 0 || idx === res.prompts.length - 1) kb.row();
    });

    kb.text("📂 Barcha toifalar", "pr_cats_menu");
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: kb });
  }

  // PROMPT CALLBACK HANDLERS
  bot.callbackQuery(['open_prompts', 'pr_cats_menu'], async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendPromptCategoriesMenu(ctx, true);
  });

  bot.callbackQuery(/^pr_cat_/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const catId = ctx.callbackQuery.data.replace('pr_cat_', '');
    await sendPromptSubcategoriesMenu(ctx, catId, true);
  });

  bot.callbackQuery(/^pr_sub_/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const parts = ctx.callbackQuery.data.replace('pr_sub_', '').split('_');
    const catId = parts[0];
    const subTag = parts[1];
    const page = parseInt(parts[2] || '1', 10);
    await sendPromptListMenu(ctx, catId, subTag, page, true);
  });

  bot.callbackQuery(/^pr_view_/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const id = ctx.callbackQuery.data.replace('pr_view_', '');
    await sendPromptCard(ctx, id, true);
  });

  bot.callbackQuery(/^pr_ai_/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const id = ctx.callbackQuery.data.replace('pr_ai_', '');
    await executePromptWithAI(ctx, id);
  });

  bot.callbackQuery(/^pr_fav_/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const id = ctx.callbackQuery.data.replace('pr_fav_', '');
    const res = toggleFavoritePrompt(ctx.from.id, id);
    if (res.isFavorited) {
      await ctx.reply("⭐ Prompt sevimli ro'yxatingizga qo'shildi!");
    } else {
      await ctx.reply("❌ Prompt sevimlilar ro'yxatidan olib tashlandi.");
    }
    await sendPromptCard(ctx, id, true);
  });

  bot.callbackQuery(/^pr_rnd_/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const cat = ctx.callbackQuery.data.replace('pr_rnd_', '');
    const rnd = getRandomPrompt(cat === 'all' ? null : cat);
    if (rnd) {
      await sendPromptCard(ctx, rnd.id, true);
    } else {
      await ctx.reply("⚠️ Prompt topilmadi.");
    }
  });

  bot.callbackQuery('pr_favs_list', async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendUserFavoritesMenu(ctx, true);
  });

  // TELEGRAM INLINE QUERY (@voisai_bot orqali qidirish)
  bot.on('inline_query', async (ctx) => {
    const rawQ = ctx.inlineQuery.query.trim();
    const q = rawQ.toLowerCase();

    // 1. Agar foydalanuvchi "prompt ..." yoki "shablon ..." deb qidirsa
    if (q.startsWith('prompt ') || q.startsWith('shablon ') || q.startsWith('/prompt ')) {
      const term = q.replace(/^(prompt|shablon|\/prompt)\s+/, '').trim();
      const promptRes = searchPrompts({ query: term, limit: 15 });

      const results = promptRes.prompts.map(p => ({
        type: 'article',
        id: `pr_inline_${p.id}`,
        title: `${p.categoryIcon} ${p.title}`,
        description: `${p.categoryName} » ${p.description.slice(0, 60)}...`,
        input_message_content: {
          message_text: `💡 <b>${p.categoryIcon} ${p.title}</b>\n📁 <i>${p.categoryName} » ${p.subcategoryName}</i>\n\n<code>${escapeHtml(p.prompt)}</code>\n\n🤖 <i>@voisai_bot — 4000 ta AI Promptlar</i>`,
          parse_mode: 'HTML'
        }
      }));

      return await ctx.answerInlineQuery(results, { cache_time: 5 });
    }

    // 2. Transkriptlardan qidirish
    const list = getAllTranscripts(ctx.from.id);
    const filtered = list.filter(item => {
      if (!q) return true;
      return (item.title || '').toLowerCase().includes(q) || (item.summary || '').toLowerCase().includes(q);
    }).slice(0, 10);

    let results = filtered.map((item, idx) => ({
      type: 'article',
      id: `inline_${item.id}_${idx}`,
      title: item.title,
      description: item.summary?.slice(0, 80) + '...',
      input_message_content: {
        message_text: `📌 <b>${item.title}</b>\n\n💡 <b>Xulosa:</b>\n${item.summary}\n\n📜 <b>Matn:</b>\n<i>"${item.full_transcript}"</i>\n\n🤖 <i>@voisai_bot orqali tayyorlandi</i>`,
        parse_mode: 'HTML'
      }
    }));

    // Agar transkriptlar kam bo'lsa yoki qidiruv mos kelsa, promptlardan ham qo'shish
    if (q && results.length < 5) {
      const promptRes = searchPrompts({ query: q, limit: 8 - results.length });
      promptRes.prompts.forEach(p => {
        results.push({
          type: 'article',
          id: `pr_inline_${p.id}`,
          title: `💡 ${p.categoryIcon} ${p.title}`,
          description: `Prompt: ${p.subcategoryName}`,
          input_message_content: {
            message_text: `💡 <b>${p.categoryIcon} ${p.title}</b>\n📁 <i>${p.categoryName}</i>\n\n<code>${escapeHtml(p.prompt)}</code>\n\n🤖 <i>@voisai_bot</i>`,
            parse_mode: 'HTML'
          }
        });
      });
    }

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

      // AI tahlil
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

      // Xabarni formatlash
      let messageText = `📌 <b>${result.title}</b>\n`;
      messageText += `🎯 <i>${getModeLabel(userMode)} | ⏱️ ${durationStr} | 📝 ${savedItem.wordsCount} ta so'z</i>\n`;
      if (savedItem.timeSavedSec > 0) {
        const savedMin = Math.floor(savedItem.timeSavedSec / 60);
        const savedSec = savedItem.timeSavedSec % 60;
        messageText += `⏳ <i>Tejalgan vaqtingiz: ~${savedMin > 0 ? savedMin + ' daqiqa ' : ''}${savedSec} soniya!</i>\n\n`;
      } else {
        messageText += `\n`;
      }
      
      messageText += `💡 <b>Xulosa:</b>\n${result.summary}\n\n`;

      if (result.decisions && result.decisions.length > 0) {
        messageText += `🏛️ <b>Qabul qilingan qarorlar:</b>\n`;
        result.decisions.forEach(d => { messageText += `• ${d}\n`; });
        messageText += `\n`;
      }

      if (result.key_terms && result.key_terms.length > 0) {
        messageText += `🔑 <b>Muhim atamalar:</b>\n`;
        result.key_terms.forEach(k => { messageText += `• ${k}\n`; });
        messageText += `\n`;
      }
      if (result.exam_questions && result.exam_questions.length > 0) {
        messageText += `❓ <b>Imtihon savollari:</b>\n`;
        result.exam_questions.forEach((q, i) => { messageText += `${i + 1}. ${q}\n`; });
        messageText += `\n`;
      }

      if (result.financial_items && result.financial_items.length > 0) {
        messageText += `💰 <b>Hisob-kitoblar:</b>\n`;
        result.financial_items.forEach(f => { messageText += `• ${f}\n`; });
        if (result.total_estimated) messageText += `💵 <b>Jami taxminiy:</b> ${result.total_estimated}\n`;
        messageText += `\n`;
      }

      if (result.errors_and_corrections && result.errors_and_corrections.length > 0) {
        messageText += `🇬🇧 <b>IELTS Grammatika tuzatmalari:</b>\n`;
        result.errors_and_corrections.forEach(ec => { messageText += `⚠️ ${ec}\n`; });
        messageText += `\n`;
      }

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

      // Kengaytirilgan interaktiv tugmalar
      const itemKeyboard = new InlineKeyboard();
      if (hasActions) {
        result.action_items.slice(0, 4).forEach((_, idx) => {
          itemKeyboard.text(`🔘 ${idx + 1}`, `toggle_todo_${savedItem.id}_${idx}`);
        });
        itemKeyboard.row();
      }

      itemKeyboard
        .text('📱 Post yasash', `quick_post_${savedItem.id}`)
        .text('🧠 Test / Quiz', `quick_quiz_${savedItem.id}`)
        .row()
        .text('🗺️ MindMap', `quick_mindmap_${savedItem.id}`)
        .text('🌐 Tarjima', `quick_translate_${savedItem.id}`)
        .row()
        .text('🧼 Nutq tahlili', `quick_clean_${savedItem.id}`)
        .text('📄 .txt Yuklash', `quick_export_${savedItem.id}`);

      if (webappUrl && webappUrl.startsWith('https://')) {
        itemKeyboard.row().webApp('🌐 Web App\'da ochish', `${webappUrl}?item=${savedItem.id}`);
      }

      await ctx.reply(messageText, {
        parse_mode: 'HTML',
        reply_markup: itemKeyboard
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
    const lowerText = userText.toLowerCase();

    // Prompt qidiruviga tekshirish
    if (lowerText.startsWith('prompt ') || lowerText.startsWith('shablon ')) {
      const q = userText.replace(/^(prompt|shablon)\s+/i, '').trim();
      if (q) return await sendPromptSearchResult(ctx, q);
    }
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
