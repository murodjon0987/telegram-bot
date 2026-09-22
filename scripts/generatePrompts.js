import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const PROMPTS_FILE = path.join(DATA_DIR, 'prompts.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 10 ta asosiy toifa va har birida 8 tadan quyi toifa (har birida 50 tadan prompt = 400 * 10 = 4000)
const CATEGORIES = [
  {
    id: 'smm',
    name: 'SMM & Ijtimoiy Tarmoqlar',
    icon: '📱',
    subcategories: [
      { name: 'Reels & TikTok ssenariylari', tag: 'reels' },
      { name: 'Telegram kanallar uchun postlar', tag: 'telegram' },
      { name: 'Instagram karusel va infografika', tag: 'instagram' },
      { name: 'Stories interaktivlari va o\'yinlar', tag: 'stories' },
      { name: 'LinkedIn ekspert maqolalari', tag: 'linkedin' },
      { name: 'YouTube Shorts va videolar', tag: 'youtube' },
      { name: 'Twitter/X threadlar va fikrlar', tag: 'twitter' },
      { name: 'Virusli kontent va mem-marketing', tag: 'viral' }
    ]
  },
  {
    id: 'biznes',
    name: 'Biznes & Startaplar',
    icon: '💼',
    subcategories: [
      { name: 'Biznes reja va Lean Canvas', tag: 'lean-canvas' },
      { name: 'Pitch Deck va investorlar bilan muloqot', tag: 'pitch' },
      { name: 'Raqobatchilar tahlili va SWOT', tag: 'swot' },
      { name: 'B2B tijoriy takliflar', tag: 'b2b-offer' },
      { name: 'Startap MVP va g\'oya validatsiyasi', tag: 'mvp' },
      { name: 'Narxlash va daromad modellari', tag: 'pricing' },
      { name: 'Franchayzing va biznesni masshtablash', tag: 'scale' },
      { name: 'Biznes jarayonlar va operatsiyalar', tag: 'ops' }
    ]
  },
  {
    id: 'marketing',
    name: 'Marketing, Reklama & Target',
    icon: '🎯',
    subcategories: [
      { name: 'Facebook & Instagram Ads reklamalari', tag: 'fb-ads' },
      { name: 'Google Ads va qidiruv reklamalari', tag: 'google-ads' },
      { name: 'E-mail marketing va zanjirlar', tag: 'email' },
      { name: 'Influencer va blogerlar bilan ishlash', tag: 'influencer' },
      { name: 'Sotuv voronkalari (Funnel)', tag: 'funnel' },
      { name: 'A/B test va konversiya optimallashtirish', tag: 'ab-test' },
      { name: 'Mijoz portreti (Buyer Persona)', tag: 'persona' },
      { name: 'Brending va pozitsionirlash', tag: 'branding' }
    ]
  },
  {
    id: 'kopirayting',
    name: 'Sotuvchi Kopirayting & Matnlar',
    icon: '✍️',
    subcategories: [
      { name: 'AIDA formulasi bo\'yicha matnlar', tag: 'aida' },
      { name: 'PAS (Problem-Agitate-Solve) matnlari', tag: 'pas' },
      { name: 'Kuchli ilmoqlar (Hooks) va sarlavhalar', tag: 'hooks' },
      { name: 'E\'tirozlarni yenguvchi matnlar', tag: 'objections' },
      { name: 'Landing page sotuv matnlari', tag: 'landing' },
      { name: 'Aksiya va cheklangan takliflar', tag: 'promo' },
      { name: 'Storytelling va voqealar orqali sotish', tag: 'story' },
      { name: 'Harakatga chaqiruv (CTA) shablonlari', tag: 'cta' }
    ]
  },
  {
    id: 'sotuv',
    name: 'Sotuv & Mijozlar bilan Ishlash',
    icon: '🤝',
    subcategories: [
      { name: 'Sovuq va iliq qo\'ng\'iroq skriptlari', tag: 'cold-call' },
      { name: 'Narx aytish va qimmat e\'tiroziga javob', tag: 'price-objection' },
      { name: 'Mijoz bilan WhatsApp/Telegram muloqoti', tag: 'chat-sales' },
      { name: 'B2B muzokaralar va bitim tuzish', tag: 'negotiation' },
      { name: 'Cross-sell va Up-sell skriptlari', tag: 'upsell' },
      { name: 'Mijozlarni qaytarish (Win-back)', tag: 'winback' },
      { name: 'Shikoyatlar va e\'tirozlar bilan ishlash', tag: 'complaints' },
      { name: 'VIP mijozlar bilan munosabatlar', tag: 'vip-clients' }
    ]
  },
  {
    id: 'hr',
    name: 'HR, Boshqaruv & Jamoa',
    icon: '👥',
    subcategories: [
      { name: 'Vakansiya e\'lonlari va tavsiflari', tag: 'vacancy' },
      { name: 'STAR usulida intervyu savollari', tag: 'star-interview' },
      { name: 'Onboarding va yangi xodim moslashuvi', tag: 'onboarding' },
      { name: 'KPI va xodimlar samaradorligi', tag: 'kpi' },
      { name: 'Motivatsiya va jamoaviy muhit', tag: 'motivation' },
      { name: 'Rahbar uchun vazifalar delegatsiyasi', tag: 'delegation' },
      { name: 'Nizo va qiyin vaziyatlarni boshqarish', tag: 'conflict' },
      { name: 'Xodimni 1-on-1 suhbatga tayyorlash', tag: 'one-on-one' }
    ]
  },
  {
    id: 'it',
    name: 'IT, Dasturlash & No-Code',
    icon: '💻',
    subcategories: [
      { name: 'Texnik topshiriq (TZ) tuzish', tag: 'tech-spec' },
      { name: 'Kod refaktoring va tozalash', tag: 'refactoring' },
      { name: 'Bugfix va muammolarni qidirish', tag: 'debugging' },
      { name: 'API arxitekturasi va endpointlar', tag: 'api-design' },
      { name: 'Ma\'lumotlar bazasi sxemalari (SQL/NoSQL)', tag: 'database' },
      { name: 'UX/UI foydalanuvchi yo\'li (User Flow)', tag: 'ux-flow' },
      { name: 'No-Code va avtomatlashtirish', tag: 'nocode' },
      { name: 'Kiberxavfsizlik va kod auditi', tag: 'security' }
    ]
  },
  {
    id: 'moliya',
    name: 'Moliya, Buxgalteriya & Investitsiya',
    icon: '💰',
    subcategories: [
      { name: 'Xarajatlarni kamaytirish rejasi', tag: 'cost-reduction' },
      { name: 'Unit-iqtisodiyot va rentabellik', tag: 'unit-economics' },
      { name: 'Investitsiya taklifi va hisob-kitoblar', tag: 'investment' },
      { name: 'Oylik va yillik byudjetlashtirish', tag: 'budgeting' },
      { name: 'Pul oqimi (Cash Flow) boshqaruvi', tag: 'cash-flow' },
      { name: 'Moliyaviy risklarni baholash', tag: 'financial-risk' },
      { name: 'Kredit va qarz majburiyatlari tahlili', tag: 'debt' },
      { name: 'Audit va moliyaviy hisobotlar', tag: 'financial-audit' }
    ]
  },
  {
    id: 'talim',
    name: 'Ta\'lim, Kurslar & Shaxsiy Brend',
    icon: '🎓',
    subcategories: [
      { name: 'Onlayn kurs dasturlari (Syllabus)', tag: 'course-syllabus' },
      { name: 'Vebinar va masterklass ssenariysi', tag: 'webinar' },
      { name: 'Murakkab tushunchalarni soddalashtirish', tag: 'eli5-concept' },
      { name: 'Talabalar uchun testlar va vazifalar', tag: 'homework-test' },
      { name: 'Shaxsiy brend strategiyasi', tag: 'personal-brand' },
      { name: 'Keyslar va muvaffaqiyat hikoyalari', tag: 'case-study' },
      { name: 'Ekspert maqolalari va tezislar', tag: 'expert-article' },
      { name: 'Ta\'limiy infografika g\'oyalari', tag: 'educational-infographic' }
    ]
  },
  {
    id: 'kreativ',
    name: 'Kreativlik & AI Master-Promptlari',
    icon: '⚡',
    subcategories: [
      { name: 'Gemini & ChatGPT Super-Ekspert rollari', tag: 'expert-role' },
      { name: 'Midjourney & Flux tasvir promptlari', tag: 'image-prompt' },
      { name: 'Lateral fikrlash va noan\'anaviy g\'oyalar', tag: 'lateral-thinking' },
      { name: 'Muammolarni tahlil qilish (5 Why, SCAMPER)', tag: 'problem-solving' },
      { name: 'Video va kino sahnalari ssenariysi', tag: 'screenplay' },
      { name: 'Kreativ nom berish (Naming & Slogan)', tag: 'naming' },
      { name: 'Metaforalar va tushunarli qiyoslar', tag: 'metaphor' },
      { name: 'Aqliy hujum (Brainstorming) sessiyalari', tag: 'brainstorming' }
    ]
  }
];

// Turli sohalar va nishalar uchun 50 xil o'ziga xos mavzu / kontekstlar
const TOPICS = [
  { focus: 'Restoran & Umumiy ovqatlanish', niche: 'Kafeda xizmat, yetkazib berish va oshpazlik', audience: 'Shahar aholisi va yoshlar' },
  { focus: 'Kiyim-kechak & Moda (Fashion)', niche: 'Zamonaviy milliy va klassik liboslar brendi', audience: 'Ayollar va yoshlar' },
  { focus: 'IT & Dasturlash Akademiyasi', niche: 'Web va Mobile dasturlash o\'quv markazi', audience: '18-30 yoshdagi kasb o\'rganuvchilar' },
  { focus: 'Tibbiyot & Stomatologiya', niche: 'Zamonaviy oilaviy klinika va implantatsiya', audience: 'Oila boshliqlari va ota-onalar' },
  { focus: 'Ko\'chmas mulk & Yangi uylar', niche: 'Shahar markazidagi yangi turar-joy majmualari', audience: 'Investorlar va yangi oilalar' },
  { focus: 'Avtosalon & Avto-detailing', niche: 'Premium avtomobillarga servis va sotuv', audience: 'Avtomobil ishqibozlari' },
  { focus: 'Go\'zallik saloni & Kosmetika', niche: 'Tabiiy parvarish va estetik go\'zallik', audience: 'Ayollar va qizlar' },
  { focus: 'Turizm & Sayohat agentligi', niche: 'Umra va Dubay, Antaliya, Yevropa turlari', audience: 'Sayohatchilar va ziyoratchilar' },
  { focus: 'Bolalar bog\'chasi & Rivojlanish', niche: 'Montessori uslubidagi innovatsion bog\'cha', audience: 'Yosh ota-onalar' },
  { focus: 'Mebel & Interyer dizayni', niche: 'Oshxona va mehmonxona uchun buyurtma mebel', audience: 'Uy ta\'mirlayotganlar' },
  { focus: 'Qurilish mollari do\'koni', niche: 'Sifatli va kafolatli qurilish xom-ashyosi', audience: 'Ustalar va ob\'yekt rahbarlari' },
  { focus: 'Fitnes klub & Sport zali', niche: 'Sog\'lom vazn tashlash va mushak chiqarish', audience: 'Sog\'lom turmush tarzi vakillari' },
  { focus: 'Elektronika & Gadjetlar do\'koni', niche: 'Smartfonlar, noutbuklar va aksessuarlar', audience: 'Texnika ixlosmandlari' },
  { focus: 'Zargarlik & Oltin buyumlar', niche: 'Nafis tilla va kumush taqinchoqlar', audience: 'Sovg\'a izlovchilar va ayollar' },
  { focus: 'Til o\'rganish & IELTS markazi', niche: 'IELTS 7.5+ va General English kurslari', audience: 'Abituriyentlar va talabalar' },
  { focus: 'Logistika & Kuryerlik xizmati', niche: 'Respublika bo\'ylab tezkor ekspress yetkazish', audience: 'Onlayn do\'konlar va bizneslar' },
  { focus: 'Konditer & Shirinliklar sexi', niche: 'Tug\'ilgan kun va to\'y tortlari, pishiriqlar', audience: 'Shirinliksevarlar va bayram egalari' },
  { focus: 'Gullar & Sovg\'alar uyi', niche: 'Premium guldastalar va syurpriz yetkazish', audience: 'Yaqinlarini quvontiruvchilar' },
  { focus: 'Buxgalteriya & Audit xizmati', niche: 'Soliq hisobotlari va 1C autsorsing', audience: 'Kichik va o\'rta biznes rahbarlari' },
  { focus: 'Yuridik konsalting firmasi', niche: 'Shartnomalar, da\'volar va litsenziyalash', audience: 'Kompaniyalar va fuqarolar' },
  { focus: 'Uy tozalash (Klining) xizmati', niche: 'Xonadon va ofislarni professional tozalash', audience: 'Band ishbilarmonlar va bekalar' },
  { focus: 'Qishloq xo\'jaligi & Issiqxona', niche: 'Gidroponika usulida sabzavotlar yetishtirish', audience: 'Ulgurji xaridorlar va bozorlar' },
  { focus: 'Kitob do\'koni & Nashriyot', niche: 'Biznes, badiiy va motivatsion kitoblar', audience: 'Kitobxonlar va o\'quvchilar' },
  { focus: 'Optika & Ko\'zoynaklar do\'koni', niche: 'Brend quyosh ko\'zoynaklari va linzalar', audience: 'Ko\'rish qobiliyatini yaxshilovchilar' },
  { focus: 'To\'yxona & Marosimlar saroyi', niche: 'Unutilmas to\'ylar va banketlar tashkiloti', audience: 'Nikoh to\'yi rejalashtirayotganlar' },
  { focus: 'Uy hayvonlari do\'koni (Zoomarket)', niche: 'Mushuk va itlar uchun sifatli oziqa va parvarish', audience: 'Jonivor egalari' },
  { focus: 'Qahvaxona & Coffee Shop', niche: 'Specialty qahva va shinam ish muhiti', audience: 'Frilanserlar va qahva ixlosmandlari' },
  { focus: 'Poligrafiya & Bosmaxona', niche: 'Vizitka, flayer, katalog va qadoq chop etish', audience: 'Marketing bo\'limlari va tadbirkorlar' },
  { focus: 'Santexnika & Isitish tizimlari', niche: 'Issiq pol, qozonxona va sifatli quvurlar', audience: 'Uy quruvchilar' },
  { focus: 'Fotostudiya & Video ishlab chiqarish', niche: 'Reklama roliklari va professional fotosessiyalar', audience: 'Brendlar va modellar' },
  { focus: 'Plastik deraza & Romlar sexi', niche: 'Nemis profilidagi shovqinsiz va issiq romlar', audience: 'Xonadon egalari' },
  { focus: 'Kiberklub & Game Arena', niche: 'Kuchli PC va PlayStation arenasi', audience: 'Geymerlar va o\'smirlar' },
  { focus: 'Aromaterapiya & Parfyumeriya', niche: 'Sharqona va Yevropa original atirlari', audience: 'Xushbo\'y hid shaydolari' },
  { focus: 'Kantselyariya & Ofis mollari', niche: 'Maktab va ofis uchun zarur jihozlar', audience: 'Ota-onalar va kompaniyalar' },
  { focus: 'Sut va qatiq mahsulotlari zavodi', niche: 'Tabiiy sut, tvorog va pishloqlar', audience: 'Sog\'lom oilalar' },
  { focus: 'Xalqaro yuk tashish (Kargo)', niche: 'Xitoy va Turkiyadan kafolatli yuk olib kelish', audience: 'Optomchilar va savdogarlar' },
  { focus: 'Musiqa va cholg\'u asboblari', niche: 'Gitara, pianino va professional ovoz uskunalari', audience: 'Musiqachilar va havaskorlar' },
  { focus: 'Poyabzal do\'koni & Ta\'miri', niche: 'Sof charmdan tayyorlangan qulay poyabzallar', audience: 'Klassik va krossovka kiyuvchilar' },
  { focus: 'Onlayn marketpleys & E-commerce', niche: 'Tezkor yetkazish bilan universal onlayn savdo', audience: 'Internet orqali xarid qiluvchilar' },
  { focus: 'Kovorking & Shared Workspace', niche: 'Shinam ish o\'rni, tezkor Wi-Fi va muzokara xonasi', audience: 'Startapchilar va IT frilanserlar' },
  { focus: 'Gidromassaj & SPA salon', niche: 'Charchoqni yozuvchi massaj va hovuz parvarishi', audience: 'Stressdan xalos bo\'lmoqchilar' },
  { focus: 'Velosiped & Samokatlar markazi', niche: 'Shahar va tog\' velosipedlari, elektrosamokatlar', audience: 'Faol dam oluvchilar' },
  { focus: 'Tikuvchilik va matolar sexi', niche: 'Sifatli ipak, paxta va parda matolari', audience: 'Dizaynerlar va bekalari' },
  { focus: 'Aqlli uy (Smart Home) tizimlari', niche: 'Sensorlar, aqlli chiroqlar va avtomatika', audience: 'Zamonaviy kottej egalari' },
  { focus: 'Qandolat va nonvoyxona', niche: 'Issiq tandir non, patir va bagetlar', audience: 'Mahalla ahli va restoranlar' },
  { focus: 'Uyali aloqa & Sim-karta xizmatlari', niche: 'Qulay tariflar va cheksiz internet paketlari', audience: 'Barcha smartfon egalari' },
  { focus: 'Dronlar va aerofototasvir', niche: 'Ob\'yektlarni havodan suratga olish va kartografiya', audience: 'Quruvchilar va tadbir egalari' },
  { focus: 'O\'simliklar & Landshaft dizayni', niche: 'Hovli va bog\' uchun manzarali daraxtlar, gazon', audience: 'Dala hovli egalari' },
  { focus: 'Kimyoviy tozalash (Ximchistka)', niche: 'Kostyum, palto va gilamlarni yangidek tozalash', audience: 'Kiyimlarni asrovchilar' },
  { focus: 'AI & Chatbot integratsiyasi', niche: 'Telegram va CRM uchun aqlli sun\'iy intellekt botlari', audience: 'Biznes egalari va marketing bo\'limlari' }
];

// Subkategoriyalar bo'yicha prompt shablon generatori
function buildPromptObject(id, category, subcategory, topicIndex) {
  const t = TOPICS[topicIndex % TOPICS.length];
  const variation = Math.floor(topicIndex / TOPICS.length) + 1;

  let title = '';
  let description = '';
  let promptText = '';
  let tags = [category.id, subcategory.tag];

  const catId = category.id;
  const subTag = subcategory.tag;

  // Har bir toifa va quyi toifa uchun maxsus moslashtirilgan professional ssenariy
  switch(catId) {
    case 'smm':
      if (subTag === 'reels') {
        title = `Virusli Reels Ssenariysi: ${t.focus} uchun 3 soniyalik Ilmoq (Hook)`;
        description = `${t.focus} sohasida ko'rishlar sonini oshiruvchi va oxirigacha tomosha qildiruvchi dinamik video ssenariysi.`;
        promptText = `Siz ijtimoiy tarmoqlarda millionlab ko'rishlar yig'uvchi tajribali SMM-ssenaristsiz. 
Men uchun "${t.focus}" (${t.niche}) sohasi bo'yicha 45 soniyalik virusli Instagram Reels / TikTok videosi ssenariysini yozib bering.

Maqsadli auditoriya: ${t.audience}
Mavzu/Muammo: [Muammo yoki eng ko'p beriladigan savol]
Taklif: [Mahsulot yoki xizmat nomi]

Ssenariy quyidagi bloklardan iborat bo'lsin:
1. 0-3 soniya (Vizual va ovozli HOOK): Tomoshabinni to'xtatib qoluvchi noan'anaviy boshlanish.
2. 4-15 soniya (Muammoni bo'rttirish): Auditoriyaning og'riqli nuqtasi va keng tarqalgan xatosi.
3. 16-35 soniya (Yechim & Hayratlanarli fakt): Mutaxassis sifatida 3 ta aniq amaliy layfxak.
4. 36-45 soniya (Harakatga chaqiruv - CTA): Kommentda so'z yozishga yoki obuna bo'lishga undash.
Ekran matnlari (Captions) va kadrdagi harakatlarni qavs ichida [vizual:] ko'rinishida yozing.`;
        tags.push('reels', 'tiktok', 'hook', 'video');
      } else if (subTag === 'telegram') {
        title = `Telegram Kanal Posti: ${t.focus} — Ekspert Tahlili va Maslahat`;
        description = `O'quvchini jalb qiluvchi, ko'p saqlanadigan va ulashiladigan (Share) Telegram formati.`;
        promptText = `Siz yetakchi Telegram kanallar muallifisiz. "${t.focus}" yo'nalishidagi kanal uchun formatlangan (bold, kursiv, emoji) yuqori qamrovli post yozing.

Mavzu: [Post mavzusi yoki aktual yangilik]
Asosiy fikr: [O'quvchi olishi kerak bo'lgan asosiy foyda]
Kanal auditoriyasi: ${t.audience}

Tuzilishi:
• Jozibador va qiziqtiruvchi bosh sarlavha (1 qator)
• Kirish: Hayotiy misol yoki kutilmagan savol
• Asosiy qism: 3 ta qisqa, ammo o'ta foydali punkt (belgilar bilan)
• Shaxsiy xulosa / Ekspert tavsiyasi
• O'quvchilarga savol (munozara uchun) va reaksiyalar qoldirish chaqiruvi.`;
        tags.push('telegram', 'post', 'ekspert');
      } else if (subTag === 'instagram') {
        title = `Instagram Karusel (10 slayd): ${t.focus} bo'yicha Step-by-Step Qo'llanma`;
        description = `Foydalanuvchilar saqlab oladigan (Save) va do'stlariga yuboradigan 10 slayddan iborat foydali karusel.`;
        promptText = `Instagramda saqlashlar sonini ko'paytiruvchi 10 slayddan iborat karusel matnini tayyorlang.
Soha: ${t.focus}
Mavzu: [O'rgatiladigan 5 ta qadam yoki eng muhim xatolar]

Har bir slayd uchun:
- Slayd 1 (Muqova): Qiziqish uyg'otuvchi kuchli sarlavha va "Varaqlang 👉" belgisi
- Slayd 2-8: Har bir slaydda 1 ta qisqa fikr, aniq qadam va tushunarli misol
- Slayd 9: Xulosa va barcha qadamlarning qisqa chek-ro'yxati
- Slayd 10: Profilga obuna bo'lish va postni saqlab qo'yishga undovchi CTA.`;
        tags.push('karusel', 'instagram', 'slides');
      } else if (subTag === 'stories') {
        title = `Stories Zanjiri (5 ta stori): ${t.focus} — Qiziqishdan Xaridgacha`;
        description = `Stories ko'rishlarini tushirib yubormasdan, auditoriyani isitib sotuvga olib chiquvchi zanjir.`;
        promptText = `Bugungi Stories uchun 5 qismli psixologik zanjir (Storytelling) tuzib bering:
Soha: ${t.focus} (${t.niche})
Bugungi maqsad: [Xizmatga yozilish / Mahsulotga qiziqish uyg'otish]

1-stori: Intriga yoki hayotiy kadr (Ovoz berish stikeri: Ha / Yo'q)
2-stori: Kutilmagan qiyinchilik yoki mijoz bilan bo'lgan voqea
3-stori: Muammoni qanday hal qilganimiz (Ekspertlik isboti)
4-stori: Natija, mijoz fikri yoki foto/video isbot
5-stori: Directga maxsus so'z yozish chaqiruvi (Masalan: "CHEGIRMA" deb yozing).`;
        tags.push('stories', 'interaktiv', 'storytelling');
      } else if (subTag === 'linkedin') {
        title = `LinkedIn Post: ${t.focus} sohasidagi Xatolar va Olingan Saboqlar`;
        description = `B2B hamkorlar va mutaxassislar hurmatini qozonuvchi professional LinkedIn maqolasi.`;
        promptText = `Siz B2B sohasida katta tajribaga ega top-menejersiz. LinkedIn tarmog'i uchun shaxsiy tajribaga asoslangan post yozing.
Kompaniya yo'nalishi: ${t.focus}
Mavzu: [Muvaffaqiyatsizlik yoki loyihada qilingan katta xato va undan olingan saboq]

Talablar:
- Birinchi 2 qatorda o'quvchini to'xtatuvchi paradoksal fikr
- Vaziyat va duch kelingan muammoning xolis bayoni
- Xatoni tuzatishda qabul qilingan noan'anaviy qaror
- Boshqa rahbarlar va tadbirkorlar uchun 3 ta amaliy xulosa.`;
        tags.push('linkedin', 'b2b', 'networking');
      } else {
        title = `SMM Strategiya & Kontent G'oyasi: ${t.focus} uchun Haftalik Reja`;
        description = `Ijtimoiy tarmoqlarda doimiy faollikni ta'minlovchi 7 kunlik kontent-plan.`;
        promptText = `Men uchun "${t.focus}" yo'nalishida 1 haftalik (Dushanba-Yakshanba) muvozanatli kontent rejasini tuzing.
Auditoriya: ${t.audience}
Asosiy mahsulot: ${t.niche}

Har bir kun uchun:
1. Format (Reels, Karusel, Yagona post, Jonli efir)
2. Kontent turi (Foydali, Ko'ngilochar, Sotuvchi, Isbot/Keys)
3. Sarlavha g'oyasi va qisqacha mazmuni
4. Mo'ljallangan metrika (Qamrov, Saqlashlar, Izohlar, Sotuvlar).`;
        tags.push('kontent-plan', 'smm', 'strategiya');
      }
      break;

    case 'biznes':
      if (subTag === 'lean-canvas') {
        title = `Lean Canvas Biznes Modeli: ${t.focus} Loyihasi`;
        description = `Startap yoki biznes g'oyani 9 ta asosiy blok bo'yicha tahlil qilish va modellashtirish.`;
        promptText = `Siz kremniy vodiysi darajasidagi startap maslahatchisisiz. "${t.focus}" (${t.niche}) loyihasi uchun 1 sahifalik Lean Canvas modelini tuzib bering:
1. Muammo (Mijozlarning eng asosiy 3 ta og'rig'i)
2. Mijozlar segmenti (Erta foydalanuvchilar kimlar?)
3. Noyob qiymat taklifi (UVP - Nega aynan bizni tanlashadi?)
4. Yechim (Mahsulotning eng muhim 3 ta xususiyati)
5. Tarqatish kanallari (Mijozlarga qanday yetib boramiz?)
6. Daromad oqimlari (Pul qayerdan keladi?)
7. Xarajatlar tuzilmasi (Asosiy xarajat moddalari)
8. Asosiy ko'rsatkichlar (KPI / Shimoliy yulduz metrikasi)
9. Yashirin ustunlik (Raqobatchilar osonlikcha nusxalay olmaydigan jihat).`;
        tags.push('lean-canvas', 'startap', 'biznes-model');
      } else if (subTag === 'pitch') {
        title = `Investorlar Uchun Pitch Deck Matni: ${t.focus}`;
        description = `Investorlar e'tiborini tortuvchi 10 slaydli taqdimot matni va nutq ssenariysi.`;
        promptText = `"${t.focus}" yo'nalishidagi startapimizga sarmoya jalb qilish uchun 3 daqiqalik Pitch nutqi va 10 ta slayd strukturasini yozing.
Loyiha: ${t.niche}
Bozor hajmi: [Bozor taxmini]
Talab qilinayotgan investitsiya: [Summa] va uning evaziga taklif: [Ulush %]

Har bir slayd uchun aniq sarlavha, vizual tavsiya va 30 soniyalik notiqlik nutqini bering.`;
        tags.push('pitch-deck', 'investor', 'startap');
      } else if (subTag === 'swot') {
        title = `Chuqurlashtirilgan SWOT Tahlil: ${t.focus} Kompaniyasi`;
        description = `Kuchli, zaif tomonlar, imkoniyatlar va xatarlarni solishtirib, harakatlar rejasini tuzish.`;
        promptText = `"${t.focus}" sohasidagi kompaniyamiz uchun chuqur SWOT tahlil o'tkazing va xulosalar chiqaring:
- Kuchli tomonlar (Strengths) — 5 ta
- Zaif tomonlar (Weaknesses) — 5 ta
- Tashqi imkoniyatlar (Opportunities) — 5 ta
- Tashqi xavf-xatarlar (Threats) — 5 ta

Eng muhimi: SO (Imkoniyatdan foydalanish), WO (Zaiflikni bartaraf etish), ST (Xavfdan himoyalanish) va WT (Inqirozdan chiqish) bo'yicha 4 ta aniq strategik qadam yozing.`;
        tags.push('swot', 'strategiya', 'tahlil');
      } else if (subTag === 'b2b-offer') {
        title = `B2B Tijoriy Taklif (Kommercheskoye Predlojenie): ${t.focus}`;
        description = `Kompaniya rahbarlari o'qishi bilanoq hamkorlik qilishga undovchi rasmiy taklifnoma.`;
        promptText = `B2B korporativ mijozlar uchun rad etib bo'lmas tijoriy taklif xatini yozing.
Bizning soha: ${t.focus} (${t.niche})
Mijoz: [Hamkor kompaniya yoki direktor lavozimi]
Bizning yechim: [Mijozga beriladigan moddiy va vaqt tejash foydasi]

Matn quyidagilarni o'z ichiga olsin:
1. Ularning kompaniyasiga xos aktual muammo
2. Bizning yechim qanday qilib ularga pul tejaydi yoki daromadni oshiradi
3. 3 xil narx paketi (Boshlang'ich, Optimal, Korporativ)
4. Kafolatlar va tavsiyalar
5. 15 daqiqalik qahva ustida uchrashuvga chaqiruv.`;
        tags.push('b2b', 'tijoriy-taklif', 'muzokara');
      } else {
        title = `Biznesni Masshtablash va Tizimlashtirish Rejasi: ${t.focus}`;
        description = `Rahbarning operatsion ishlardan chiqishi va biznesni avtomatlashtirish qadamlari.`;
        promptText = `"${t.focus}" biznesim hozirda oylik [daromad] ga chiqdi. Endi biznesni tizimlashtirish va filiallarga kengaytirishni rejalashtiryapman.
Menga quyidagi bo'limlar bo'yicha bosqichma-bosqich yo'l xaritasini (Roadmap) tuzib bering:
1. Operatsion jarayonlarni reglamentlash va xodimlarga topshirish (Delegatsiya)
2. CRM va hisob-kitobni avtomatlashtirish
3. Yangi filial ochish chek-ro'yxati (Joy tanlash, marketing, jamoa)
4. Sifat nazorati (Standartlar va mijoz qoniqishi).`;
        tags.push('masshtablash', 'tizimlashtirish', 'biznes');
      }
      break;

    case 'marketing':
      if (subTag === 'fb-ads') {
        title = `Meta Ads (FB/Insta) Reklama Matni: ${t.focus} — 3 xil Auditoriya`;
        description = `Sovuq, iliq va qaynoq auditoriyalar uchun konversiyasi yuqori reklama kopilari.`;
        promptText = `Meta (Instagram/Facebook) target reklamasi uchun 3 ta variantda reklama matni va kreativi g'oyasini yozing:
Mahsulot: ${t.focus} (${t.niche})
Narx/Aksiya: [Maxsus taklif yoki chegirma]

Variant 1 (Sovuq auditoriya): Muammo orqali qiziqtirish va bepul taklif (Lead magnet)
Variant 2 (Iliq auditoriya): Ijtimoiy isbot (Otzyv/Keys) va natijani ko'rsatish
Variant 3 (Qaynoq auditoriya): Cheklangan muddatli rad etib bo'lmas aksiya (Urgency)
Har bir variant uchun: Bosh sarlavha (Headline), Asosiy matn (Body) va Tugma nomi (CTA).`;
        tags.push('target', 'meta-ads', 'reklama', 'instagram');
      } else if (subTag === 'email') {
        title = `Sotuvchi E-mail Voronkasi (3 xat): ${t.focus}`;
        description = `Yangi obunachini mijozga aylantiruvchi avtomatik e-mail zanjiri.`;
        promptText = `"${t.focus}" bo'yicha yangi ro'yxatdan o'tgan mijozga yuboriladigan 3 ta ketma-ket e-mail xati matnini yozing:
1-xat (Darhol): Xush kelibsiz xati + Va'da qilingan bepul qo'llanma (Bonus)
2-xat (Ertasiga): Bizning hikoyamiz va boshqa mijozlarimiz qanday natijaga erishgani
3-xat (3-kuni): Maxsus shaxsiy chegirma va muddat tugashini eslatish.
Har bir xat uchun ochilish darajasi (Open Rate) yuqori bo'lgan 3 tadan mavzu (Subject Line) taklif qiling.`;
        tags.push('email', 'voronka', 'marketing');
      } else if (subTag === 'influencer') {
        title = `Blogerlar uchun Texnik Vazifa (Brif): ${t.focus}`;
        description = `Bloger yoki influenser reklamasini samarali va tabiiy (Nativ) qilish uchun batafsil qo'llanma.`;
        promptText = `Instagram blogerga berish uchun reklama brifini (TZ) tuzing.
Bizning brend: ${t.focus} (${t.niche})
Bloger auditoriyasi: ${t.audience}
Format: 3 ta Stories yoki 1 ta Reels

Brif tarkibi:
- Asosiy maqsad va aytilishi SHART bo'lgan 3 ta kalit gap
- Aytilishi TAQIQLANGAN so'zlar va stereotiplar
- Mahsulotni kadrda qanday ko'rsatish kerak (Vizual yondashuv)
- Bloger shaxsiy tajribasi sifatida qanday tabiiy bog'lashi mumkinligi.`;
        tags.push('bloger', 'influencer', 'brif');
      } else {
        title = `Sotuv Voronkasi (Lead Magnet Funnel): ${t.focus}`;
        description = `Arzon narxda lidlar (mijozlar) yig'ish va ularni asosiy xaridga olib kelish tizimi.`;
        promptText = `"${t.focus}" biznesi uchun 4 bosqichli avtomatlashtirilgan sotuv voronkasini ishlab chiqing:
1. Magnit taklif (Lead Magnet): Bepul beriladigan, lekin o'ta qimmatli material g'oyasi
2. Tripwire (Kichik xarid): 30-50 ming so'mlik birinchi ishonch xaridi taklifi
3. Asosiy taklif (Core Offer): Kompaniyaning asosiy foyda keltiruvchi xizmati
4. Maksimal foyda (Profit Maximizer / VIP): Yuqori chekli xizmat yoki doimiy obuna.`;
        tags.push('voronka', 'lead-magnet', 'konversiya');
      }
      break;

    case 'kopirayting':
      if (subTag === 'aida') {
        title = `AIDA Formulali Sotuvchi Matn: ${t.focus}`;
        description = `Diqqat (Attention), Qiziqish (Interest), Istak (Desire), Harakat (Action) qoidasi asosida matn.`;
        promptText = `AIDA klassik marketing formulasidan foydalanib, sotuvchi reklama matnini yozing.
Mahsulot: ${t.focus} (${t.niche})
Maqsadli auditoriya: ${t.audience}
Asosiy ustunlik: [Mahsulotning eng katta yutug'i]

- Attention (Diqqat): Auditoriyaning ko'zini quvnatadigan hayratlanarli fakt yoki savol
- Interest (Qiziqish): Muammo va uni hal qilishning yangi zamonaviy yo'li
- Desire (Istak): Mahsulotdan foydalangandan keyingi hayot tasviri va mijoz sharhi
- Action (Harakat): Hozir sotib olish uchun sabab va aniq harakatga chaqiruv.`;
        tags.push('aida', 'kopirayting', 'matn');
      } else if (subTag === 'pas') {
        title = `PAS (Problem - Agitate - Solution) Matni: ${t.focus}`;
        description = `Mijoz og'rig'ini ko'rsatib, yechim sifatida mahsulotni taqdim etuvchi kuchli matn.`;
        promptText = `PAS formulasida o'quvchini befarq qoldirmaydigan post yoki e'lon matnini yozing.
Soha: ${t.focus}
Mijoz og'rig'i: [Kundalik duch kelinadigan noqulaylik yoki xarajat]

1. Problem: Muammoni aniq va lo'nda nomlash ("Siz ham shunday holatga tushganmisiz?")
2. Agitate: Muammoni chuqurlashtirish (Agar hozir hal qilinmasa, 6 oydan keyin nima bo'ladi?)
3. Solution: Bizning mahsulot orqali yengil, kafolatli va tez yechim topish.`;
        tags.push('pas', 'kopirayting', 'ogriq');
      } else if (subTag === 'hooks') {
        title = `Top-10 Ta Kuchli Ilmoq (Hook) Sarlavhalar: ${t.focus}`;
        description = `Ijtimoiy tarmoqlar va maqolalar uchun o'quvchi nigohini to'xtatuvchi 10 ta sarlavha.`;
        promptText = `"${t.focus}" mavzusi bo'yicha 10 xil psixologik triggerga asoslangan sarlavha (Hook) yozib bering:
1. Qiziqish uyg'otuvchi sir ("Hech kim aytmaydigan...")
2. Raqamli ro'yxat ("5 ta qoida...")
3. Ogohlantirish ("Hozirroq to'xtating...")
4. Shaxsiy iqror ("Men qanday qilib...")
5. Savol orqali chaqiruv ("Nega ko'pchilik...")
6. Tushunarli paradoks ("Kamroq xarajat qilib, ko'proq...")
7. Qisqa muddat ("7 kunda...")
8. Tembellik layfxaki ("Kuch sarflamasdan...")
9. Taqqoslash ("Eski usul vs Yangi usul")
10. To'g'ridan-to'g'ri chaqiruv ("Agar siz ${t.audience} bo'lsangiz...").`;
        tags.push('hooks', 'sarlavha', 'ilmoq');
      } else {
        title = `Storytelling: Muvaffaqiyat Tarixi Orqali Sotish: ${t.focus}`;
        description = `Qahramon yo'li uslubida mijozning muammoga duch kelishi va g'alabasi haqida hikoya.`;
        promptText = `Haqiqiy yoki namunaviy mijozimiz tilidan samimiy Storytelling matnini yozing.
Kompaniya: ${t.focus} (${t.niche})
Bosh qahramon: [Mijoz ismi va uning dastlabki ahvoli]

Hikoya qadamlari:
- Dastlabki noilojlik va shubhalar
- Qanday qilib biz haqimizda eshitgani va birinchi qadam
- Jarayonda ko'rsatilgan yordam va kutilmagan ijobiy hissiyotlar
- Hozirgi yakuniy ajoyib natija va uning boshqalarga samimiy tavsiyasi.`;
        tags.push('storytelling', 'hikoya', 'kopirayting');
      }
      break;

    case 'sotuv':
      if (subTag === 'price-objection') {
        title = `"Qimmat" Degan E'tirozga 5 Xil Professional Javob: ${t.focus}`;
        description = `Narxdan qochayotgan mijozni tushunib, qiymatni ko'rsatish orqali bitimni yopish.`;
        promptText = `Bizning sotuvchilarimiz uchun "${t.focus}" bo'yicha "Sizlarda juda qimmat ekan, arzonroq joydan topdim" degan mijozga 5 xil professional skript javobini yozing:
1. Qiymatni solishtirish usuli (Sifat, kafolat va xizmat darajasi)
2. Qismlarga bo'lib to'lash / Kunlik xarajatga aylantirish usuli
3. Arzon narsaning yashirin xarajatlarini ko'rsatish usuli
4. Mijoz bilan hamdard bo'lib, ochiq savol berish usuli
5. Maxsus bonus yoki shartli individual taklif usuli.`;
        tags.push('sotuv', 'skript', 'qimmat', 'etiroz');
      } else if (subTag === 'cold-call') {
        title = `Sovuq Qo'ng'iroq (Cold Call) Skripti: ${t.focus} — Birinchi 30 Soniya`;
        description = `Go'shakni qo'yib qo'ymasliklari uchun kotiba va rahbar bilan birinchi suhbat ssenariysi.`;
        promptText = `"${t.focus}" xizmatimizni taklif qilish uchun potensial korporativ mijozlarga sovuq qo'ng'iroq skriptini tayyorlang:
- 1-bosqich: Kotiba to'sig'idan o'tish (Qaror qabul qiluvchi shaxs bilan bog'lanish)
- 2-bosqich: Birinchi 15 soniya (Kompaniya haqida emas, ularning foydasi haqida gapirish)
- 3-bosqich: "Bizga hech narsa kerak emas" degan birinchi reaksiyani yumshatish
- 4-bosqich: Telefon orqali sotmasdan, shunchaki 15 daqiqalik qisqa Zoom/uchrashuvga kelishish.`;
        tags.push('cold-call', 'qongiroq', 'b2b-sotuv');
      } else if (subTag === 'chat-sales') {
        title = `Telegram/Instagram Chatda Sotuv Skripti: ${t.focus}`;
        description = `"Narxi qancha?" deb yozgan odamni javobsiz qoldirmay, buyurtmaga olib kelish.`;
        promptText = `Mijoz Direct yoki Telegramda shunchaki "Narxi qancha?" yoki "Assalomu alaykum, narxini ayting" deb yozdi.
Ko'p sotuvchilar faqat narxni aytib mijozni yo'qotadi. Biz uchun ideal dialog zanjirini yozing:
1. Salomlashish va narxni to'g'ridan-to'g'ri aytishdan oldin ehtiyojni aniqlash savoli
2. Narxni qulay paketlar bilan taqdim etish (Narx "sendvichi" texnikasi)
3. Mijoz jim bo'lib qolsa (Ignor qilsa), 4 soatdan keyin va 24 soatdan keyin yuboriladigan 2 ta muloyim eslatma xabari.`;
        tags.push('chat-sotuv', 'telegram-sotuv', 'skript');
      } else {
        title = `Cross-Sell va Up-Sell Skripti: Chekni 30% ga Oshirish: ${t.focus}`;
        description = `Xarid qilayotgan mijozga qo'shimcha mahsulot taklif qilib, o'rtacha chekni oshirish.`;
        promptText = `"${t.focus}" do'konimiz/servisimizda allaqachon bitta mahsulotni tanlagan mijozga qo'shimcha xizmat yoki aksessuar (Upsell/Cross-sell) sotish skriptini yozing:
- Kassa yoki buyurtma rasmiylashtirish paytida samimiy taklif qilish
- "Sizga aynan shu mahsulot bilan birga ishlatish uchun yana bu juda kerak bo'ladi" mantiqi
- 10-15% chegirmali to'plam (Set) taklif qilish
- Mijoz rad etsa ham xursand qolishi uchun yakuniy minnatdorchilik gapi.`;
        tags.push('upsell', 'cross-sell', 'chek-oshirish');
      }
      break;

    case 'hr':
      if (subTag === 'vacancy') {
        title = `Magnit Vakansiya E'loni: ${t.focus} Uchun Kuchli Mutaxassis Izlash`;
        description = `Oddiy rasmiyatchiliksiz, eng iqtidorli nomzodlarni jalb qiluvchi zamonaviy e'lon.`;
        promptText = `Kompaniyamizga "${t.focus}" yo'nalishida [Lavozim nomi] kerak. Eng kuchli mutaxassislar ariza topshirishi uchun e'lon matnini tuzing:
- Kompaniya haqida ilhomlantiruvchi 2 qator
- Nomzod qiladigan 5 ta aniq amaliy vazifa
- Biz kutayotgan ko'nikmalar (keraksiz talablarsiz)
- Biz beradigan imtiyozlar (Ish haqi, bonuslar, sharoitlar, o'sish)
- Qanday qilib ariza topshirish kerakligi va kichik test topshirig'i.`;
        tags.push('vakansiya', 'hr', 'ishga-qabul');
      } else if (subTag === 'star-interview') {
        title = `STAR Metodikasi Bo'yicha 10 Ta Intervyu Savoli: ${t.focus}`;
        description = `Vaziyat (Situation), Vazifa (Task), Harakat (Action), Natija (Result) asosida nomzodni sinash.`;
        promptText = `[Lavozim] uchun nomzodni suhbatdan o'tkazishda uning haqiqiy tajribasini bilish uchun STAR usulida 10 ta chuqur savol tayyorlang:
1. Qiyin mijoz yoki inqirozli vaziyatni hal qilgani bo'yicha
2. Muddatga (Deadline) ulgurmagan paytda o'zini qanday tutgani
3. Jamoada kelishmovchilik bo'lgandagi roli
4. O'z xatosini tan olib, tuzatgan holati
Har bir savol ostida: Nomzodning "Yaxshi javobi" qanday bo'lishi va qaysi "Qizil bayroq" (Xavfli signal)larga e'tibor berish kerakligini ko'rsating.`;
        tags.push('intervyu', 'star', 'suhbat', 'hr');
      } else {
        title = `Yangi Xodim Uchun 30 Kunlik Onboarding Rejasi: ${t.focus}`;
        description = `Xodimning birinchi oydanoq kompaniyaga tez moslashishi va natija berishi uchun reja.`;
        promptText = `"${t.focus}" sohasidagi yangi xodimimiz ishga kirgan birinchi 30 kuni uchun bosqichma-bosqich reja tuzing:
- 1-kun: Xush kelibsiz, jamoa bilan tanishuv, ish qurollari va xavfsizlik
- 1-hafta: Kompaniya qadriyatlari, mahsulotni to'liq o'rganish va birinchi kichik topshiriq
- 2-3 hafta: Mustaqil topshiriqlar, mentor nazorati ostida ishlash
- 30-kun: Sinov muddati sarhisobi, 1-on-1 suhbat va KPI ko'rsatkichlarini baholash.`;
        tags.push('onboarding', 'hr', 'jamoa');
      }
      break;

    case 'it':
      if (subTag === 'tech-spec') {
        title = `Mukammal Texnik Topshiriq (TZ): ${t.focus} Tizimi Uchun`;
        description = `Dasturchilar va buyurtmachi bir-birini mukammal tushunishi uchun loyiha hujjati.`;
        promptText = `Siz katta tizim me'morisiz (Solution Architect). "${t.focus}" loyihasi uchun mukammal Texnik Topshiriq (TZ) hujjatini yozing:
1. Loyihaning umumiy maqsadi va vazifalari
2. Foydalanuvchilar rollari (Mijoz, Menejer, Admin)
3. Asosiy funktsional talablar (Ro'yxatdan o'tish, qidiruv, to'lov, bildirishnomalar)
4. Nofunksional talablar (Xavfsizlik, yuklamaga chidamlilik, tezlik)
5. Ma'lumotlar bazasi va tashqi API integratsiyalari (SMS shlyuz, to'lov tizimlari).`;
        tags.push('tz', 'arxitektura', 'dasturlash');
      } else if (subTag === 'refactoring') {
        title = `Kod Refaktoring va Tozalash: Clean Architecture va SOLID`;
        description = `Mavjud kodni o'qilishi oson, tezkor va kengaytirishga qulay holatga keltirish.`;
        promptText = `Men sizga quyidagi kod parchasini beraman. Siz uni SOLID prinsiplari va Clean Code qoidalariga moslab refaktoring qilib bering:
Kod tili: [JS / Python / PHP / Dart / Go]
[Bu yerga kodingizni qo'ying]

Sizdan talab:
1. Qayta yozilgan, optimallashgan toza kod
2. Qilingan o'zgarishlarning qisqa tushuntirishi
3. Asosiy e'tibor: Xatolarni ushlash (Error handling) va unumdorlik (Performance).`;
        tags.push('refactoring', 'clean-code', 'kod');
      } else {
        title = `REST API Arxitekturasi va Swagger Hujjati: ${t.focus}`;
        description = `Frontend va Mobile dasturchilar uchun qulay, standartlashgan API endpointlar to'plami.`;
        promptText = `"${t.focus}" loyihasi uchun RESTful API arxitekturasini loyihalashtiring:
- Autentifikatsiya (JWT token, Refresh token)
- Resurslar bo'yicha endpointlar (GET, POST, PUT, DELETE)
- Request Body va Response namunasi (JSON formatida)
- Standart xatolik kodlari va xabarlar (400, 401, 403, 404, 500)
- Pagination, qidiruv va filtrlash parametrlari.`;
        tags.push('api', 'backend', 'rest');
      }
      break;

    case 'moliya':
      if (subTag === 'unit-economics') {
        title = `Unit-Iqtisodiyot Hisobi: ${t.focus} — Har Bir Mijozdan Foyda`;
        description = `CAC, LTV, Churn Rate va marjinallikni hisoblash orqali biznesning tirikligini aniqlash.`;
        promptText = `"${t.focus}" (${t.niche}) biznesimiz uchun Unit-iqtisodiyot formulasini tuzing va hisob-kitob qilib bering:
- CAC (Customer Acquisition Cost): 1 ta xaridorni jalb qilish xarajati
- AOV (Average Order Value): O'rtacha chek miqdori
- COGS (Cost of Goods Sold): Tannarx va bevosita xarajatlar
- LTV (Lifetime Value): Mijoz bilan ishlash davridagi jami tushum
- LTV / CAC nisbati (3x dan yuqori bo'lishi sharti bilan)
Qanday qilib o'rtacha chekni 20% ga oshirish va CAC ni kamaytirish bo'yicha 3 ta amaliy maslahat bering.`;
        tags.push('unit-iqtisodiyot', 'ltv', 'cac', 'moliya');
      } else if (subTag === 'cost-reduction') {
        title = `Operatsion Xarajatlarni 20% ga Kamaytirish Auditi: ${t.focus}`;
        description = `Sifatga putur yetkazmasdan, ortiqcha sarf-xarajatlarni aniqlash va tejash.`;
        promptText = `"${t.focus}" biznesimda oylik xarajatlarni sifatni pasaytirmagan holda 15-20% ga optimallashtirishim kerak.
Bizning asosiy xarajatlarimiz: [Ijara, ish haqi, marketing, xom-ashyo, logistika]

Menga quyidagi yo'nalishlarda tejamkorlik auditini o'tkazib bering:
1. Jarayonlarni avtomatlashtirish orqali vaqt va odam resursini tejash
2. Yetkazib beruvchilar bilan shartnomalarni qayta ko'rib chiqish usullari
3. Marketing byudjetidagi samarasiz "teshiklar"ni yopish
4. Kommunal va ofis xarajatlarini optimallashtirish.`;
        tags.push('xarajatlar', 'tejamkorlik', 'moliya');
      } else {
        title = `Yillik Byudjet va Pul Oqimi (Cash Flow) Rejasi: ${t.focus}`;
        description = `Kassa uzilishi (Kassoviy razriv) ga tushmaslik uchun 12 oylik moliyaviy bashorat.`;
        promptText = `"${t.focus}" korxonasi uchun 1 yillik oylik Pul Oqimi (Cash Flow) modelini tuzing:
- Daromadlar (Mavsumiylikni inobatga olgan holda oylik o'sish)
- Doimiy xarajatlar (Ijara, maoshlar, aloqa, xizmatlar)
- O'zgaruvchan xarajatlar (Sotuv hajmiga bog'liq xaridlar, yetkazish)
- Kassa uzilishi xavfi bor oylarni aniqlash va ularning oldini olish uchun "Xavfsizlik yostig'i" (Rezerv fondi) hisob-kitobi.`;
        tags.push('cash-flow', 'byudjet', 'moliya');
      }
      break;

    case 'talim':
      if (subTag === 'course-syllabus') {
        title = `Onlayn Kurs Kurrikulumi (12 Ta Modul): ${t.focus}`;
        description = `Noldan mutaxassis darajasigacha o'rgatuvchi tizimli darslar rejasi.`;
        promptText = `"${t.focus}" mavzusida talab yuqori bo'lgan onlayn kurs muallifiman. 12 ta moduldan iborat professional o'quv dasturini tuzing:
Kurs maqsadi: Talabani 3 oyda noldan amaliyotchi darajasiga olib chiqish.

Har bir modul uchun:
- Modul nomi va asosiy g'oyasi
- 3-4 ta video dars mavzulari
- Talaba bajarishi shart bo'lgan uyga vazifa (Real keys)
- Bilimni mustahkamlash uchun mini-test savoli.`;
        tags.push('kurs', 'talim', 'syllabus');
      } else if (subTag === 'webinar') {
        title = `Sotuvchi Vebinar Ssenariysi (90 daqiqa): ${t.focus}`;
        description = `Ishtirokchilarga katta bilim berib, yakunda pullik dasturni sotuvchi masterklass.`;
        promptText = `"${t.focus}" sohasida 90 daqiqalik jonli vebinar ssenariysini tuzib bering:
- 0-15 daqiqa: Tanishtiruv, texnik qoidalar va nega bu mavzu bugun hayot-mamot ekani
- 15-55 daqiqa: Eng sara 3 ta ekspert siri (Hech kim kutmagan amaliy bilimlar)
- 55-75 daqiqa: Asosiy kurs/mahsulot taqdimoti, chegirmalar va bonuslar ochilishi
- 75-90 daqiqa: Savol-javoblar va e'tirozlarni jonli efirda bartaraf qilish.`;
        tags.push('vebinar', 'masterklass', 'talim');
      } else {
        title = `Ekspert Sifatida Shaxsiy Brend Qurish Strategiyasi: ${t.focus}`;
        description = `O'z sohasining birinchi raqamli tanilgan mutaxassisiga aylanish yo'l xaritasini chizish.`;
        promptText = `Men "${t.focus}" sohasida 5 yillik tajribaga egaman, lekin shaxsiy brendim yo'q. 6 oylik shaxsiy brend strategiyasini tuzing:
1. Pozitsionirlash (Niche & USP — men kimman va kimga qanday foyda keltiraman?)
2. Qaysi platformalarni tanlash kerak (Instagram, LinkedIn, Telegram, YouTube)
3. Haftasiga qanday ekspertlik postlari chiqarish kerak
4. OAV, podkastlar va konferensiyalarga chiqish taktikasi
5. Shaxsiy brendni monetizatsiya qilish (Konsalting, kurslar, hamkorliklar).`;
        tags.push('shaxsiy-brend', 'ekspert', 'rivojlanish');
      }
      break;

    case 'kreativ':
      if (subTag === 'expert-role') {
        title = `Mega AI Rol: ${t.focus} Bo'yicha Jahon Darajasidagi Bosh Maslahatchi`;
        description = `Sun'iy intellektni sizning shaxsiy tajribali bosh direktor va strategingizga aylantirish.`;
        promptText = `Siz bundan buyon jahonning Fortune-500 kompaniyalariga 20 yil maslahat bergan, "${t.focus}" bo'yicha eng nufuzli strateg va mutaxassissiz.
Sizning uslubingiz: Aniq, keraksiz iltifotlarsiz, faktlar, raqamlar va amaliy qadamlar bilan javob berish.
Har doim quyidagi formatda javob bering:
1. 💡 Asosiy tashxis (Muammoning asl tub ildizi)
2. 🎯 Strategik yechim (3 ta asosiy yo'nalish)
3. ⚡ 24 soat ichida qilinishi kerak bo'lgan birinchi qadam
4. ⚠️ Xavf-xatarlar va nimadan ehtiyot bo'lish kerak.
Tayyormisiz? Men sizga birinchi vazifamni taqdim etaman: [Muammoni yozing].`;
        tags.push('ai-rol', 'master-prompt', 'strateg');
      } else if (subTag === 'image-prompt') {
        title = `Midjourney / Flux Uchun Fotorealistik Tasvir Prompti: ${t.focus}`;
        description = `Marketing va veb-sayt uchun yuqori sifatli 8K reklama fotosurati yaratish prompti.`;
        promptText = `Professional commercial advertising photography of ${t.focus} (${t.niche}), highly detailed, shot on 35mm lens, f/1.8, cinematic studio soft lighting, ultra-realistic texture, 8k resolution, minimalist luxury aesthetic, photorealistic depth of field, award-winning shot --ar 16:9 --style raw --v 6.0`;
        tags.push('midjourney', 'flux', 'ai-image', 'tasvir');
      } else {
        title = `Kreativ Aqliy Hujum (SCAMPER Metodi): ${t.focus}`;
        description = `Mahsulot yoki xizmatni 7 xil usulda yangilash va raqobatchilardan keskin ajralib turish.`;
        promptText = `"${t.focus}" mahsulotimizni SCAMPER kreativ fikrlash metodi orqali tahlil qilib, 7 ta yangi g'oya bering:
- S (Substitute - O'rnini bosish): Mahsulotning qaysi qismini o'zgartirish mumkin?
- C (Combine - Birlashtirish): Qaysi boshqa xizmat bilan qo'shish mumkin?
- A (Adapt - Moslashtirish): Boshqa sohalardan nimani o'zlashtirsak bo'ladi?
- M (Modify - Kattalashtirish/Kichraytirish): Nimani kuchaytirish yoki mini-format qilish mumkin?
- P (Put to other use - Boshqa maqsadda foydalanish): Boshqa auditoriyaga qanday taklif etamiz?
- E (Eliminate - Olib tashlash): Qaysi ortiqcha jarayonni butunlay bekor qilsak bo'ladi?
- R (Reverse - Teskari qilish): Butun jarayonni teskari tomondan qursak nima bo'ladi?`;
        tags.push('scamper', 'kreativlik', 'brainstorming');
      }
      break;

    default:
      title = `${category.name}: ${t.focus} bo'yicha Master-Shablon #${variation}`;
      description = `${subcategory.name} yo'nalishidagi amaliy AI prompti.`;
      promptText = `Siz "${category.name}" bo'yicha yuqori toifali mutaxassissiz.
Mavzu: ${t.focus} (${t.niche})
Mening maqsadim: [Maqsadingizni yozing]
Auditoriya: ${t.audience}

Iltimos, menga eng samarali va natijador professional reja va matnni tayyorlab bering.`;
  }

  // Sarlavha yoki promptga variant raqamini qo'shish
  if (variation > 1) {
    title = `${title} (Variatsiya #${variation})`;
  }

  return {
    id,
    categoryId: category.id,
    categoryName: category.name,
    categoryIcon: category.icon,
    subcategoryName: subcategory.name,
    subcategoryTag: subcategory.tag,
    title,
    description,
    prompt: promptText,
    tags: Array.from(new Set(tags)),
    difficulty: (id % 3 === 0) ? 'Ekspert' : (id % 2 === 0) ? 'O\'rta' : 'Boshlang\'ich',
    usageCount: Math.floor(Math.random() * 150) + 12
  };
}

console.log('🚀 4,000 ta AI Promptlar bazasini generatsiya qilish boshlandi...');

const allPrompts = [];
let currentId = 1;

// 10 ta toifa
for (const cat of CATEGORIES) {
  // 8 ta quyi toifa
  for (const sub of cat.subcategories) {
    // 50 tadan prompt = 400 ta har bir toifada * 10 = 4,000 ta prompt
    for (let i = 0; i < 50; i++) {
      const promptObj = buildPromptObject(currentId, cat, sub, i);
      allPrompts.push(promptObj);
      currentId++;
    }
  }
}

console.log(`✅ Jami generatsiya qilingan promptlar soni: ${allPrompts.length} ta!`);

fs.writeFileSync(PROMPTS_FILE, JSON.stringify(allPrompts, null, 2), 'utf-8');

console.log(`💾 Fayl muvaffaqiyatli saqlandi: ${PROMPTS_FILE}`);
console.log(`📊 Hajmi: ${(fs.statSync(PROMPTS_FILE).size / (1024 * 1024)).toFixed(2)} MB`);
