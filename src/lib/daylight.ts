/**
 * „Компас на деня“ — моделът на деня, който води целия сайт.
 *
 * Едно число движи всичко: часът (0–24). От него следват фазата (сутрин, ден,
 * вечер, нощ), цветовете на небето, колко е „нощ“ (звездите) и откъде пада
 * светлината върху книгите. Модулът е чист — без DOM и без React — за да го
 * ползват и доставчикът, и началната страница, и скриптът, който задава
 * фазата преди първото изчертаване.
 *
 * Дизайнът е в `design/remindbooks-F-sun-compass/index.html`.
 */

export type Phase = "morn" | "day" | "eve" | "night";
export type Mode = "light" | "dark";

export type BreathStep = ["in" | "hold" | "out", number];

export type PhaseInfo = {
  name: string;
  greet: string;
  /** Заглавието на кутията с препоръки в началната секция. */
  head: string;
  sub: string;
  mode: Mode;
  /** Защо заглавие от препоръките пасва на тази част от деня. */
  why: string;
  breath: { name: string; note: string; steps: BreathStep[] };
};

export const PHASES: Record<Phase, PhaseInfo> = {
  morn: {
    name: "Сутрин",
    greet: "Добро утро",
    head: "Сутрешно четене",
    sub: "за спокойно начало",
    mode: "light",
    why: "Подходяща за сутринта: кратка, ясна и без бързане.",
    breath: {
      name: "Събуждащо дишане",
      note: "Равен ритъм, 4 секунди вдишване и 4 издишване. Събужда, без да напряга.",
      steps: [["in", 4], ["out", 4]],
    },
  },
  day: {
    name: "Ден",
    greet: "Добър ден",
    head: "За деня",
    sub: "когато трябва фокус",
    mode: "light",
    why: "Подходяща за деня: за моментите, в които трябва да се действа.",
    breath: {
      name: "Квадратно дишане",
      note: "По 4 секунди вдишване, задържане, издишване и пауза. Връща фокуса посред деня.",
      steps: [["in", 4], ["hold", 4], ["out", 4], ["hold", 4]],
    },
  },
  eve: {
    name: "Вечер",
    greet: "Добър вечер",
    head: "За вечерта",
    sub: "да забавите темпото",
    mode: "dark",
    why: "Подходяща за вечерта: помага денят да се подреди.",
    breath: {
      name: "Забавяне",
      note: "Издишването е по-дълго от вдишването. Така тялото разбира, че денят свършва.",
      steps: [["in", 4], ["out", 6]],
    },
  },
  night: {
    name: "Нощ",
    greet: "Лека нощ",
    head: "Преди сън",
    sub: "тихо и бавно",
    mode: "dark",
    why: "Подходяща преди сън: за тихите минути в края на деня.",
    breath: {
      name: "Дишане 4–7–8",
      note: "Вдишване 4 секунди, задържане 7, издишване 8. Класика за заспиване.",
      steps: [["in", 4], ["hold", 7], ["out", 8]],
    },
  },
};

export const PHASE_ORDER: Phase[] = ["morn", "day", "eve", "night"];

export const phaseOf = (h: number): Phase =>
  h >= 5 && h < 11 ? "morn" : h >= 11 && h < 17.5 ? "day" : h >= 17.5 && h < 22 ? "eve" : "night";

/** Бутонът с часа в менюто прескача към следващата част от деня. */
export const NEXT_STEP: Record<Phase, number> = { morn: 13, day: 19.5, eve: 23, night: 8 };

/** Ключови кадри на небето: [час, връх, среда, хоризонт]. */
const SKY: [number, string, string, string][] = [
  [0, "#05070f", "#0b1122", "#18213d"],
  [4, "#0b1026", "#1d1d45", "#3d2f5c"],
  [5.5, "#3c4a8f", "#b7849e", "#ffb48a"],
  [7, "#9fc0ef", "#ffc7ad", "#ffe1bf"],
  [9, "#b4dcff", "#d8ecf3", "#fff1d0"],
  [12, "#8fd0ff", "#c6ebff", "#fff6cf"],
  [15, "#9fcff5", "#d5e8f0", "#ffe9bf"],
  [17.5, "#7f9fd9", "#f2b8a0", "#ffcf8a"],
  [19, "#2f2b6e", "#8a6fc9", "#ff9e7a"],
  [20.5, "#141537", "#2d2763", "#6a4373"],
  [22, "#070a16", "#0e1430", "#1f2547"],
  [24, "#05070f", "#0b1122", "#18213d"],
];

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.substring(i, i + 2), 16));

export const mix = (a: string, b: string, t: number) => {
  const A = hex(a);
  const B = hex(b);
  return (
    "#" +
    A.map((v, i) =>
      Math.round(v + (B[i]! - v) * t)
        .toString(16)
        .padStart(2, "0"),
    ).join("")
  );
};

export const lum = (h: string) => {
  const [r, g, b] = hex(h).map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};

export function skyAt(h: number): [string, string, string] {
  for (let i = 0; i < SKY.length - 1; i++) {
    const [h0, ...c0] = SKY[i]!;
    const [h1, ...c1] = SKY[i + 1]!;
    if (h >= h0 && h <= h1) {
      const t = (h - h0) / (h1 - h0);
      const e = t * t * (3 - 2 * t);
      return [mix(c0[0], c1[0], e), mix(c0[1], c1[1], e), mix(c0[2], c1[2], e)];
    }
  }
  const [, ...c] = SKY[0]!;
  return c as [string, string, string];
}

/** 0 посред деня, 1 посред нощ, с плавни здрач и зазоряване. */
export const nightAt = (h: number) =>
  h >= 21.5 || h < 4.5 ? 1 : h < 6.5 ? 1 - (h - 4.5) / 2 : h < 17.5 ? 0 : (h - 17.5) / 4;

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** Височината на слънцето: 1 по пладне, 0 при изгрев и залез, −1 в полунощ. */
export const elev = (h: number) => -Math.cos((2 * Math.PI * h) / 24);

/** Кривата на пътя на слънцето в координати 0–100, хоризонтът е на 50. */
export const curveY = (h: number) => 50 - elev(h) * 40;

/** Посоката на светлината: −1 сутрин отляво, +1 вечер отдясно, 0 нощем. */
export const sunX = (h: number) => clamp((h - 12.5) / 6.5, -1, 1) * (1 - nightAt(h));

export const wrapHour = (h: number) => ((h % 24) + 24) % 24;

export const hhmm = (h: number) => {
  const m = Math.round(wrapHour(h) * 60) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

export const nowHour = () => {
  const n = new Date();
  return n.getHours() + n.getMinutes() / 60;
};

/** Ключът в sessionStorage, под който стои ръчно избраният час. */
export const DAY_STORAGE_KEY = "rb-day";

/**
 * Скриптът, който задава фазата, преди страницата да се изчертае.
 *
 * Без него всеки посетител щеше първо да види дневната палитра (тя е
 * подразбиращата се в CSS) и чак след хидратацията да „падне“ нощта. Работи с
 * местния час на браузъра, тъй като сървърът не го знае. Ако посетителят сам е
 * избрал час в тази сесия, важи той.
 */
export const DAY_BOOT_SCRIPT = `(function(){try{var h,n=new Date();h=n.getHours()+n.getMinutes()/60;var s=sessionStorage.getItem(${JSON.stringify(
  DAY_STORAGE_KEY,
)});if(s){var o=JSON.parse(s);if(o&&o.live===false&&typeof o.hour==="number")h=o.hour}var p=h>=5&&h<11?"morn":h>=11&&h<17.5?"day":h>=17.5&&h<22?"eve":"night";var d=document.documentElement;d.dataset.phase=p;d.dataset.mode=(p==="eve"||p==="night")?"dark":"light"}catch(e){}})();`;
