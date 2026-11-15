// Demo assistant for showing ReplyLocal without a paid OpenAI key.
// Answers in the OpenAI Responses format from the company's own knowledge base and free slots,
// using keyword matching instead of a language model. Development only: the app honours
// REPLYLOCAL_TEST_AI_URL only when NODE_ENV=development and the host is 127.0.0.1.
import { createServer } from "node:http";
import { pathToFileURL } from "node:url";

const MAKES = [
  ["Toyota", "toyota|тойота"], ["Skoda", "skoda|škoda|шкода"], ["Volkswagen", "volkswagen|vw|фольксваген|фольцваген"],
  ["BMW", "bmw|бмв"], ["Audi", "audi|ауди|ауді"], ["Mercedes", "mercedes|мерседес|мерс"], ["Renault", "renault|рено"],
  ["Hyundai", "hyundai|хюндай|хендай|хундай"], ["Kia", "kia|киа|кіа"], ["Nissan", "nissan|ниссан|нісан"],
  ["Ford", "ford|форд"], ["Opel", "opel|опель"], ["Mazda", "mazda|мазда"], ["Honda", "honda|хонда"],
  ["Chevrolet", "chevrolet|шевроле"], ["Lexus", "lexus|лексус"], ["Mitsubishi", "mitsubishi|митсубиси|міцубісі"],
  ["Peugeot", "peugeot|пежо"], ["Citroen", "citroen|ситроен|сітроен"], ["Daewoo", "daewoo|деу|дэу"],
  ["Lada", "lada|лада|ваз|жигули"], ["Subaru", "subaru|субару"], ["Volvo", "volvo|вольво"], ["Tesla", "tesla|тесла"],
];

const TEXT = {
  ru: {
    price: (t, p) => `${t} — ${p}.`, noPrice: (t) => `${t}: стоимость уточнит администратор.`,
    duration: (m) => ` Займёт примерно ${m} мин.`,
    offer: (times) => ` Ближайшее свободное время: ${times}. Какая у вас машина и когда удобно?`,
    askCar: " Какая у вас машина (марка, модель, год)?",
    whichService: (times) => `С радостью запишу. Ближайшее свободное время: ${times}. Подскажите, какая услуга нужна и какая у вас машина?`,
    booked: (when, what) => `Предварительно записал вас на ${when}${what ? ` (${what})` : ""}. Администратор подтвердит время и напишет вам.`,
    askPhone: " Оставьте, пожалуйста, номер телефона для связи.",
    thanks: "Спасибо, данные записал. Администратор подтвердит заявку и напишет вам.",
    nearest: (times) => `На это время свободных мест нет. Могу предложить: ${times}. Что подходит?`,
    noSlots: "Свободного времени в ближайшие дни нет — передаю администратору, он подберёт время.",
    handoff: "Уточню у администратора и вернусь с ответом. Он скоро напишет вам здесь.",
    person: "Хорошо, передаю разговор администратору — он скоро ответит.",
    at: "в",
  },
  uk: {
    price: (t, p) => `${t} — ${p}.`, noPrice: (t) => `${t}: вартість уточнить адміністратор.`,
    duration: (m) => ` Займе приблизно ${m} хв.`,
    offer: (times) => ` Найближчий вільний час: ${times}. Яка у вас машина і коли зручно?`,
    askCar: " Яка у вас машина (марка, модель, рік)?",
    whichService: (times) => `Із радістю запишу. Найближчий вільний час: ${times}. Підкажіть, яка послуга потрібна і яка у вас машина?`,
    booked: (when, what) => `Попередньо записав вас на ${when}${what ? ` (${what})` : ""}. Адміністратор підтвердить час і напише вам.`,
    askPhone: " Залиште, будь ласка, номер телефону для зв'язку.",
    thanks: "Дякую, дані записав. Адміністратор підтвердить заявку і напише вам.",
    nearest: (times) => `На цей час вільних місць немає. Можу запропонувати: ${times}. Що підходить?`,
    noSlots: "Вільного часу найближчими днями немає — передаю адміністратору, він підбере час.",
    handoff: "Уточню в адміністратора й повернуся з відповіддю. Він скоро напише вам тут.",
    person: "Добре, передаю розмову адміністратору — він скоро відповість.",
    at: "о",
  },
  en: {
    price: (t, p) => `${t} — ${p}.`, noPrice: (t) => `${t}: the administrator will confirm the price.`,
    duration: (m) => ` It takes about ${m} min.`,
    offer: (times) => ` Nearest free times: ${times}. What car do you have and when suits you?`,
    askCar: " What car do you have (make, model, year)?",
    whichService: (times) => `Happy to book you in. Nearest free times: ${times}. Which service do you need, and what car do you have?`,
    booked: (when, what) => `I've made a preliminary booking for ${when}${what ? ` (${what})` : ""}. The administrator will confirm the time and message you.`,
    askPhone: " Please leave a phone number we can reach you on.",
    thanks: "Thank you, I've noted your details. The administrator will confirm the booking and message you.",
    nearest: (times) => `That time is taken. I can offer: ${times}. Which suits you?`,
    noSlots: "There are no free times in the next few days, so I'm passing you to the administrator to find one.",
    handoff: "Let me check with the administrator and come back to you. They will reply here shortly.",
    person: "Sure, I'm passing you to the administrator. They will reply shortly.",
    at: "at",
  },
};

const lower = (s) => s.toLocaleLowerCase().replace(/ё/g, "е");
const words = (s) => lower(s).match(/[\p{L}\p{N}]{3,}/gu) ?? [];
const stem = (w) => (/[а-яіїєґ]/.test(w) ? (w.length >= 7 ? w.slice(0, -2) : w.length >= 5 ? w.slice(0, -1) : w) : w.replace(/(es|s)$/, ""));
const SYNONYMS = [
  ["масл", "мастил", "олив", "oil", "фильтр", "фільтр", "то"],
  ["шин", "резин", "колес", "шиномонтаж", "гума", "tyre", "tire"],
  ["тормоз", "колодк", "гальм", "brake"],
  ["диагност", "діагност", "ошибк", "помилк", "чек", "check", "diagnost"],
  ["ходов", "подвеск", "підвіск", "стук", "suspension"],
  ["развал", "розвал", "сход", "alignment"],
  ["кондиц", "кондиц", "фреон", "aircon"],
];

function language(text) {
  if (/[іїєґ]/i.test(text)) return "uk";
  if (/[а-яё]/i.test(text)) return "ru";
  return /[a-z]/i.test(text) ? "en" : null;
}

const STOP = new Set([
  "сколько", "стоит", "стоимость", "цена", "цену", "почем", "скільки", "коштує", "вартість", "ціна",
  "можно", "можна", "нужно", "треба", "хочу", "мне", "мені", "есть", "вас", "для", "что", "що", "как", "як",
  "записаться", "записатися", "запись", "запис", "завтра", "сегодня", "сьогодні", "утром", "вранці",
  "how", "much", "cost", "price", "the", "and", "can", "want", "book", "tomorrow", "today",
]);
function score(entry, text) {
  const title = lower(entry.title);
  const doc = lower(`${entry.title} ${entry.content} ${entry.sku ?? ""}`);
  const titleStems = new Set(words(title).map(stem));
  const docStems = new Set(words(doc).map(stem));
  let n = 0;
  for (const w of new Set(words(text))) {
    if (STOP.has(w)) continue;
    const s = stem(w);
    if (titleStems.has(s) || (s.length >= 4 && title.includes(s))) n += 3;
    else if (docStems.has(s) || (s.length >= 4 && doc.includes(s))) n += 1;
    else if (SYNONYMS.some((g) => g.some((x) => s.startsWith(x) || (s.length >= 4 && x.startsWith(s))) && g.some((x) => doc.includes(x)))) n += 1;
  }
  return n;
}

function money(entry) {
  if (entry.price == null) return null;
  const cur = { UAH: "грн", USD: "$", EUR: "€", PLN: "zł" }[entry.currency] ?? entry.currency ?? "";
  return `${entry.price} ${cur}`.trim();
}

function parseSlots(input) {
  const msg = input.find((m) => m.role === "developer" && m.content.startsWith("FREE SLOTS"));
  if (!msg) return null;
  return [...msg.content.matchAll(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/g)].map((m) => m[0]);
}

function nowFrom(instructions) {
  const m = instructions.match(/Current local time: (\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : new Date().toISOString().slice(0, 10);
}

const addDays = (day, n) => new Date(Date.parse(day + "T12:00:00Z") + n * 86400000).toISOString().slice(0, 10);
const human = (slot, t) => `${slot.slice(8, 10)}.${slot.slice(5, 7)} ${t.at} ${slot.slice(11)}`;

function wantedDay(text, today) {
  const s = lower(text);
  if (/послезавтра|післязавтра|day after tomorrow/.test(s)) return addDays(today, 2);
  if (/завтра|tomorrow/.test(s)) return addDays(today, 1);
  if (/сегодня|сьогодні|today/.test(s)) return today;
  const d = s.match(/\b(\d{1,2})[./](\d{1,2})\b/);
  if (d) return `${today.slice(0, 4)}-${d[2].padStart(2, "0")}-${d[1].padStart(2, "0")}`;
  return null;
}

function wantedTime(text) {
  const s = lower(text);
  const hm = s.match(/\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/);
  if (hm) return `${hm[1].padStart(2, "0")}:${hm[2]}`;
  const h = s.match(/(?:^|[\s,])(?:в|о|at|на|к|до)\s*([01]?\d|2[0-3])(?![./:\d])/);
  if (h) return `${h[1].padStart(2, "0")}:00`;
  if (/утр|вранці|зранку|morning/.test(s)) return "morning";
  if (/вечер|ввечері|evening/.test(s)) return "evening";
  return null;
}

function pickSlot(text, slots, today, lastAssistant) {
  const day = wantedDay(text, today);
  const time = wantedTime(text);
  const agree = /^(да|так|yes|ok|ок|давай|подходит|підходить|годится|згода|первое|перше|first)(?=$|[\s,.!])/i.test(lower(text).trim());
  if (!day && !time) {
    if (agree && lastAssistant) {
      const offered = [...lastAssistant.matchAll(/(\d{2})\.(\d{2}) \S+ (\d{2}:\d{2})/g)]
        .map((m) => slots.find((s) => s.slice(5, 7) === m[2] && s.slice(8, 10) === m[1] && s.slice(11) === m[3]))
        .filter(Boolean);
      return offered[0] ? { slot: offered[0] } : null;
    }
    return null;
  }
  const candidates = slots.filter((s) => !day || s.startsWith(day));
  const match = candidates.find((s) => {
    const hour = Number(s.slice(11, 13));
    if (time === "morning") return hour < 12;
    if (time === "evening") return hour >= 16;
    return !time || s.slice(11) === time;
  });
  if (match && time) return { slot: match };
  return { nearest: (candidates.length ? candidates : slots).slice(0, 3) };
}

function intakeFrom(visitorText, service) {
  const s = visitorText;
  const phone = s.match(/(\+?\d[\d\s\-()]{8,}\d)/)?.[1]?.replace(/[^\d+]/g, "") ?? null;
  const year = s.match(/\b(19[89]\d|20[0-3]\d)\b/)?.[1] ?? null;
  const mileage = s.match(/(\d[\d\s]{2,})\s*(км|km|тыс|тис)/i)?.[0]?.trim() ?? null;
  let vehicle = null;
  for (const [name, re] of MAKES) {
    const m = s.match(new RegExp(`(?:${re})\\s*([\\p{L}\\p{N}-]{1,12})?`, "iu"));
    if (m) {
      const model = m[1] && !/^(19|20)\d\d$/.test(m[1]) && !/^(год|рік|года|року)$/i.test(m[1]) ? ` ${m[1][0].toUpperCase()}${m[1].slice(1)}` : "";
      vehicle = name + model;
      break;
    }
  }
  return { vehicle, year, plate: null, vin: null, mileage, problem: service ?? null, phone, preferredTime: null };
}

function reply(body) {
  const input = body.input ?? [];
  const knowledgeMsg = input.find((m) => m.role === "developer" && m.content.startsWith("KNOWLEDGE"));
  const entries = knowledgeMsg ? JSON.parse(knowledgeMsg.content.split("\n").slice(1).join("\n")) : [];
  const history = input.filter((m) => m.role === "user" || m.role === "assistant");
  const visitor = history.filter((m) => m.role === "user").map((m) => m.content);
  const last = visitor.at(-1) ?? "";
  const lastAssistant = history.filter((m) => m.role === "assistant").at(-1)?.content ?? "";
  const lang = language(last) ?? body.instructions.match(/locale (uk|ru|en)/)?.[1] ?? "ru";
  const t = TEXT[lang];
  const slots = parseSlots(input);
  const booking = !!slots;
  const today = nowFrom(body.instructions ?? "");
  const recent = visitor.slice(-3).join("\n");

  const ranked = entries.map((e) => ({ e, s: score(e, last), r: score(e, recent) }));
  const best = ranked.filter((x) => x.s > 0).sort((a, b) => b.s - a.s)[0]?.e;
  const context = ranked.filter((x) => x.r > 0 && x.e.price != null).sort((a, b) => b.r - a.r)[0]?.e;
  const bookingRule = entries.find((e) => /запис|booking/i.test(e.title));
  const service = (best && best.price != null ? best : context) ?? null;
  const intake = booking ? intakeFrom(visitor.join("\n"), service?.title) : undefined;
  const out = (answer, extra) => ({ answer, handoff: false, sourceIds: [], ...(booking ? { intake, bookingRequest: null } : {}), ...extra });
  const times = (list) => list.slice(0, 3).map((s) => human(s, t)).join(", ");

  if (/оператор|человек|менеджер|администратор|адміністратор|людин|operator|human|manager/i.test(last))
    return out(t.person, { handoff: true });

  if (booking && slots.length) {
    const pick = pickSlot(last, slots, today, lastAssistant);
    if (pick?.slot) {
      const src = service ?? bookingRule;
      if (src) {
        const needPhone = !intake.phone;
        return out(t.booked(human(pick.slot, t), service?.title) + (needPhone ? t.askPhone : ""), {
          sourceIds: [src.id],
          bookingRequest: { slot: pick.slot, serviceId: service?.id ?? null },
        });
      }
    }
    if (pick?.nearest && (service ?? bookingRule))
      return out(t.nearest(times(pick.nearest)), { sourceIds: [(service ?? bookingRule).id] });
  }

  if (best) {
    const price = money(best);
    let answer = price ? t.price(best.title, price) : best.price === null && best.durationMinutes ? t.noPrice(best.title) : `${best.title}: ${best.content.slice(0, 300)}`;
    if (best.durationMinutes) answer += t.duration(best.durationMinutes);
    if (booking && slots.length && best.price !== undefined && best.durationMinutes) answer += t.offer(times(slots));
    else if (booking && !intake.vehicle) answer += t.askCar;
    return out(answer, { sourceIds: [best.id] });
  }

  const phoneNow = /(\+?\d[\d\s\-()]{8,}\d)/.test(last);
  if (booking && phoneNow && (service ?? bookingRule)) return out(t.thanks, { sourceIds: [(service ?? bookingRule).id] });

  if (booking && /запис|book|appointment|визит|візит/i.test(last) && bookingRule)
    return out(slots.length ? t.whichService(times(slots)) : t.noSlots, { sourceIds: [bookingRule.id], handoff: !slots.length });

  return out(t.handoff, { handoff: true });
}

const port = Number(process.env.DEMO_AI_PORT ?? 54331);
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) createServer(async (req, res) => {
  if (req.method !== "POST") {
    res.statusCode = 404;
    return res.end();
  }
  try {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    const result = reply(body);
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({
      status: "completed",
      output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(result) }] }],
      usage: { input_tokens: 0, output_tokens: 0 },
    }));
  } catch (error) {
    console.error("[demo-ai]", error instanceof Error ? error.message : error);
    res.statusCode = 500;
    res.end("{}");
  }
}).listen(port, "127.0.0.1", () => console.log(`[demo-ai] listening on http://127.0.0.1:${port}`));

export { reply };
