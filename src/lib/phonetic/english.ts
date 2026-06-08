/**
 * 영어 → 한글 표음 변환.
 * 1차: 직접 한글 발음 사전 (자연스러운 한국어 표기)
 * 2차: IPA 기반 조립 폴백
 */

import { composeSyllable } from "../hangul/compose";
import type { PhoneticMode, PhoneticSyllable } from "./types";
import {
  CODA_ELIGIBLE,
  EN_CONSONANTS,
  EN_VOWELS,
  EN_VOWEL_JUNG,
  type EnPhoneme,
} from "./rules";

/**
 * 단어 → 한글 직접 발음 사전.
 * 불규칙 발음·고빈도 단어를 자연스러운 한국어 표기로 직접 매핑.
 */
const HANGUL_DICT: Record<string, string> = {
  // 관사·전치사·접속사
  a: "어", an: "언", the: "더",
  in: "인", on: "온", at: "앳", to: "투", of: "어브", for: "포", with: "위드",
  from: "프롬", by: "바이", about: "어바웃", as: "애즈", into: "인투",
  through: "쓰루", during: "듀링", before: "비포", after: "애프터",
  above: "어버브", below: "빌로우", between: "비트윈", out: "아웃",
  up: "업", down: "다운", off: "오프", over: "오버", under: "언더",
  and: "앤드", but: "벗", or: "오", so: "소우", if: "이프", than: "댄",
  that: "댓", while: "와일", although: "올도우",

  // 대명사
  i: "아이", me: "미", my: "마이", mine: "마인", myself: "마이셀프",
  you: "유", your: "유어", yours: "유어즈", yourself: "유어셀프",
  he: "히", him: "힘", his: "히즈", himself: "힘셀프",
  she: "쉬", her: "허", hers: "허즈", herself: "허셀프",
  it: "잇", its: "잇츠", itself: "잇셀프",
  we: "위", us: "어스", our: "아워", ours: "아워즈", ourselves: "아워셀브즈",
  they: "데이", them: "뎀", their: "데어", theirs: "데어즈", themselves: "뎀셀브즈",
  this: "디스", these: "디즈", those: "도우즈",
  what: "왓", who: "후", whose: "후즈", whom: "훔", which: "위치",
  where: "웨어", when: "웬", why: "와이", how: "하우",

  // 축약형
  "i'm": "아임", "i've": "아이브", "i'll": "아일", "i'd": "아이드",
  "you're": "유얼", "you've": "유브", "you'll": "유일", "you'd": "유드",
  "he's": "히즈", "she's": "쉬즈", "it's": "잇츠",
  "we're": "위얼", "we've": "위브", "we'll": "위일", "we'd": "위드",
  "they're": "데이얼", "they've": "데이브", "they'll": "데일", "they'd": "데이드",
  "isn't": "이즌트", "aren't": "아론트", "wasn't": "워즌트", "weren't": "워론트",
  "don't": "돈트", "doesn't": "더즌트", "didn't": "디든트",
  "can't": "캔트", "couldn't": "쿠든트", "won't": "원트", "wouldn't": "우든트",
  "shouldn't": "슈든트", "haven't": "해브은트", "hasn't": "해즌트",
  "hadn't": "해든트", "let's": "렛츠", "that's": "댓츠",
  "there's": "데어즈", "here's": "히어즈", "what's": "왓츠",

  // 동사 - 빈출
  be: "비", is: "이즈", are: "아", was: "워즈", were: "워",
  have: "해브", has: "해즈", had: "해드", do: "두", does: "더즈", did: "디드",
  will: "윌", would: "우드", can: "캔", could: "쿠드",
  shall: "쉘", should: "슈드", may: "메이", might: "마이트", must: "머스트",
  go: "고우", going: "고우잉", goes: "고우즈", went: "웬트", gone: "건",
  come: "컴", coming: "커밍", came: "케임",
  get: "겟", getting: "게팅", got: "갓", gotten: "가튼",
  make: "메이크", making: "메이킹", made: "메이드",
  take: "테이크", taking: "테이킹", took: "툭", taken: "테이큰",
  see: "씨", seeing: "씨잉", saw: "소", seen: "씬",
  know: "노우", knowing: "노잉", knew: "뉴", known: "노운",
  think: "띵크", thinking: "띵킹", thought: "쏫",
  say: "세이", saying: "세이잉", said: "세드",
  tell: "텔", telling: "텔링", told: "톨드",
  give: "기브", giving: "기빙", gave: "게이브", given: "기븐",
  find: "파인드", finding: "파인딩", found: "파운드",
  look: "룩", looking: "루킹", looked: "룩트",
  want: "원트", wanting: "원팅", wanted: "원티드",
  use: "유즈", using: "유징", used: "유즈드",
  feel: "필", feeling: "필링", felt: "펠트",
  try: "트라이", trying: "트라이잉", tried: "트라이드",
  ask: "애스크", asking: "애스킹", asked: "애스크트",
  need: "니드", needing: "니딩", needed: "니디드",
  seem: "씸", seeming: "씨밍", seemed: "씨므드",
  leave: "리브", leaving: "리빙", left: "레프트",
  call: "콜", calling: "콜링", called: "콜드",
  keep: "킵", keeping: "키핑", kept: "켑트",
  let: "렛", letting: "레팅",
  begin: "비긴", beginning: "비기닝", began: "비갠", begun: "비건",
  show: "쇼우", showing: "쇼잉", showed: "쇼드", shown: "쇼운",
  hear: "히어", hearing: "히어링", heard: "허드",
  play: "플레이", playing: "플레이잉", played: "플레이드",
  run: "런", running: "러닝", ran: "랜",
  move: "무브", moving: "무빙", moved: "무브드",
  live: "리브", living: "리빙", lived: "리브드",
  believe: "빌리브", believing: "빌리빙", believed: "빌리브드",
  hold: "홀드", holding: "홀딩", held: "헬드",
  bring: "브링", bringing: "브링잉", brought: "브롯",
  happen: "해픈", happening: "해프닝", happened: "해픈드",
  write: "라이트", writing: "라이팅", wrote: "로트", written: "리튼",
  sit: "싯", sitting: "시팅", sat: "샛",
  stand: "스탠드", standing: "스탠딩", stood: "스툿",
  lose: "루즈", losing: "루징", lost: "로스트",
  pay: "페이", paying: "페이잉", paid: "페이드",
  meet: "밋", meeting: "미팅", met: "멧",
  include: "인클루드", including: "인클루딩",
  continue: "컨티뉴", continuing: "컨티뉴잉",
  set: "셋", setting: "세팅",
  learn: "런", learning: "러닝", learned: "런드",
  change: "체인지", changing: "체인징", changed: "체인지드",
  lead: "리드", leading: "리딩", led: "레드",
  understand: "언더스탠드", understanding: "언더스탠딩", understood: "언더스툿",
  watch: "왓치", watching: "왓칭", watched: "왓치트",
  follow: "팔로우", following: "팔로잉", followed: "팔로드",
  stop: "스탑", stopping: "스타핑", stopped: "스탑트",
  create: "크리에이트", creating: "크리에이팅", created: "크리에이티드",
  speak: "스픽", speaking: "스피킹", spoke: "스포크", spoken: "스포큰",
  read: "리드", reading: "리딩", read_past: "레드",
  spend: "스펜드", spending: "스펜딩", spent: "스펜트",
  grow: "그로우", growing: "그로잉", grew: "그루", grown: "그로운",
  opening: "오프닝", opened: "오픈드",
  walk: "워크", walking: "워킹", walked: "워크트",
  win: "윈", winning: "위닝", won: "원",
  offer: "오퍼", offering: "오퍼링", offered: "오퍼드",
  remember: "리멤버", remembering: "리멤버링", remembered: "리멤버드",
  love: "러브", loving: "러빙",
  consider: "컨시더", considering: "컨시더링", considered: "컨시더드",
  appear: "어피어", appearing: "어피어링", appeared: "어피어드",
  buy: "바이", buying: "바잉", bought: "봇",
  wait: "웨이트", waiting: "웨이팅", waited: "웨이티드",
  serve: "서브", serving: "서빙", served: "서브드",
  die: "다이", dying: "다잉", died: "다이드",
  send: "센드", sending: "센딩", sent: "센트",
  build: "빌드", building: "빌딩", built: "빌트",
  stay: "스테이", staying: "스테이잉", stayed: "스테이드",
  fall: "폴", falling: "폴링", fell: "펠", fallen: "폴른",
  cut: "컷", cutting: "커팅",
  reach: "리치", reaching: "리칭", reached: "리치트",
  kill: "킬", killing: "킬링", killed: "킬드",
  raise: "레이즈", raising: "레이징", raised: "레이즈드",
  pass: "패스", passing: "패싱", passed: "패스트",
  sell: "셀", selling: "셀링", sold: "솔드",
  decide: "디사이드", deciding: "디사이딩", decided: "디사이디드",
  return: "리턴", returning: "리터닝", returned: "리턴드",
  explain: "익스플레인", explaining: "익스플레이닝", explained: "익스플레인드",
  hope: "호프", hoping: "호핑", hoped: "호프트",
  start: "스타트", starting: "스타팅", started: "스타티드",
  like: "라이크", liking: "라이킹", liked: "라이크트",

  // 형용사·부사 빈출
  good: "굿", great: "그레이트", big: "빅", little: "리틀", long: "롱",
  large: "라지", small: "스몰", right: "라이트", old: "올드", new: "뉴",
  high: "하이", low: "로우", next: "넥스트", early: "얼리", young: "영",
  important: "임포턴트", public: "퍼블릭", private: "프라이빗",
  real: "리얼", best: "베스트", free: "프리", sure: "슈어",
  far: "파", easy: "이지", hard: "하드", clear: "클리어", fast: "패스트",
  strong: "스트롱", true: "트루", short: "쇼트", open: "오픈",
  beautiful: "뷰티풀", nice: "나이스", cool: "쿨", hot: "핫", cold: "콜드",
  happy: "해피", sad: "새드", angry: "앵그리", funny: "퍼니",
  different: "디퍼런트", possible: "파서블", ready: "레디", popular: "파퓰러",
  special: "스페셜", simple: "심플", whole: "홀", common: "커먼",
  always: "올웨이즈", sometimes: "썸타임즈", never: "네버", often: "오픈",
  already: "올레디", still: "스틸", just: "저스트", even: "이븐",
  also: "올소", very: "베리", really: "릴리", only: "온리",
  well: "웰", back: "백", then: "덴", now: "나우", here: "히어",
  there: "데어", too: "투", most: "모스트", much: "머치",
  many: "메니", some: "섬", any: "애니", all: "올", both: "보스",
  each: "이치", few: "퓨", more: "모어", other: "아더", such: "서치",
  own: "오운", same: "세임", again: "어겐",

  // 명사 빈출
  time: "타임", year: "이어", people: "피플", way: "웨이", day: "데이",
  man: "맨", woman: "우먼", child: "차일드", world: "월드", life: "라이프",
  hand: "핸드", part: "파트", place: "플레이스", case: "케이스", week: "윅",
  company: "컴퍼니", system: "시스템", program: "프로그램", question: "퀘스천",
  government: "거버먼트", number: "넘버", night: "나이트",
  point: "포인트", home: "홈", water: "워터", room: "룸", mother: "마더",
  area: "에리어", money: "머니", story: "스토리", fact: "팩트", month: "먼스",
  lot: "랏", study: "스터디", book: "북", eye: "아이",
  job: "잡", word: "워드", business: "비즈니스", issue: "이슈",
  side: "사이드", kind: "카인드", head: "헤드", house: "하우스",
  service: "서비스", father: "파더", power: "파워",
  hour: "아워", game: "게임", line: "라인", end: "엔드", among: "어멍",
  student: "스튜던트", state: "스테이트",
  body: "바디", color: "컬러",
  field: "필드", player: "플레이어",
  group: "그룹", idea: "아이디어", face: "페이스", level: "레벨",
  door: "도어", health: "헬스", person: "퍼슨", art: "아트",
  car: "카", war: "워", fire: "파이어", air: "에어",
  phone: "폰", computer: "컴퓨터", internet: "인터넷", video: "비디오",
  photo: "포토", movie: "무비", app: "앱",
  coffee: "커피", tea: "티", beer: "비어", wine: "와인",
  pizza: "피자", burger: "버거", sushi: "스시", cake: "케이크",
  hotel: "호텔", airport: "에어포트", station: "스테이션",
  gym: "짐", sport: "스포트", ball: "볼",
  king: "킹", queen: "퀸", country: "컨트리",
  heart: "하트", dream: "드림",
  bank: "뱅크", price: "프라이스", cost: "코스트",
  hello: "헬로", goodbye: "굿바이", thanks: "땡스", please: "플리즈",
  sorry: "소리", okay: "오케이", yes: "예스", no: "노우",
  maybe: "메이비", absolutely: "앱솔루틀리",
  morning: "모닝", afternoon: "애프터눈", evening: "이브닝",

  // 숫자
  one: "원", two: "투", three: "쓰리", four: "포", five: "파이브",
  six: "식스", seven: "세븐", eight: "에이트", nine: "나인", ten: "텐",
  hundred: "헌드레드", thousand: "싸우전드", million: "밀리언",

  // 색깔
  red: "레드", blue: "블루", green: "그린", yellow: "옐로우",
  black: "블랙", white: "화이트", pink: "핑크", purple: "퍼플",
  orange: "오렌지", brown: "브라운", gray: "그레이",
};

/** IPA 기반 발음 사전 (폴백용) */
const IPA_DICT: Record<string, EnPhoneme[]> = {
  fun: ["F", "AH", "N"],
  pen: ["P", "EH", "N"],
  vine: ["V", "AY", "N"],
  best: ["B", "EH", "S", "T"],
  laugh: ["L", "AE", "F"],
  think: ["TH", "IH", "NG", "K"],
  this: ["DH", "IH", "S"],
  thank: ["TH", "AE", "NG", "K"],
  five: ["F", "AY", "V"],
  light: ["L", "AY", "T"],
  apple: ["AE", "P", "AH", "L"],
  water: ["W", "AO", "T", "ER"],
};

/** 철자 디지라프/단일문자 → 음소 폴백 휴리스틱 (근사). */
const GRAPHEME_DIGRAPHS: Array<[RegExp, EnPhoneme]> = [
  [/^th/, "TH"],
  [/^sh/, "SH"],
  [/^ch/, "CH"],
  [/^ph/, "F"],
  [/^ng/, "NG"],
  [/^oo/, "UW"],
  [/^ee/, "IY"],
  [/^ea/, "IY"],
  [/^ai/, "EY"],
  [/^ay/, "EY"],
  [/^ou/, "AW"],
  [/^ow/, "AW"],
];

const GRAPHEME_SINGLE: Record<string, EnPhoneme> = {
  a: "AE", e: "EH", i: "IH", o: "AA", u: "AH",
  b: "B", c: "K", d: "D", f: "F", g: "G", h: "H", j: "JH",
  k: "K", l: "L", m: "M", n: "N", p: "P", q: "K", r: "R",
  s: "S", t: "T", v: "V", w: "W", x: "K", y: "Y", z: "Z",
};

function graphemeFallback(word: string): EnPhoneme[] {
  const out: EnPhoneme[] = [];
  let i = 0;
  while (i < word.length) {
    const rest = word.slice(i);
    const digraph = GRAPHEME_DIGRAPHS.find(([re]) => re.test(rest));
    if (digraph) {
      out.push(digraph[1]);
      i += 2;
      continue;
    }
    const ch = word[i];
    if (ch === "e" && i === word.length - 1 && out.length > 0) {
      i += 1;
      continue;
    }
    const ph = GRAPHEME_SINGLE[ch];
    if (ph) out.push(ph);
    i += 1;
  }
  return out;
}

export function graphemeToPhonemes(word: string): EnPhoneme[] {
  const key = word.toLowerCase();
  return IPA_DICT[key] ?? graphemeFallback(key);
}

function nucleusJung(vowel: string): { main: string; glide?: string } {
  const v = EN_VOWEL_JUNG[vowel] ?? "ㅡ";
  if (Array.isArray(v)) return { main: v[0], glide: v[1] };
  return { main: v };
}

function renderSyllable(
  onset: string | null,
  vowel: string,
  coda: string | null,
  mode: PhoneticMode,
): string {
  const old = mode === "old-hangul";
  const { main, glide } = nucleusJung(vowel);

  let prefix = "";
  let cho = "ㅇ";
  if (onset) {
    const rule = EN_CONSONANTS[onset];
    if (rule) {
      cho = old ? rule.old : rule.cho;
      if (!old && rule.webPrefix) prefix = rule.webPrefix;
    }
  }

  let jong = "";
  if (coda) {
    const rule = EN_CONSONANTS[coda];
    if (rule && rule.jong) jong = rule.jong;
  }

  let block: string;
  if (old) {
    block = `${cho}${main}${jong}`;
  } else {
    block = composeSyllable(cho, main, jong);
  }

  let glideBlock = "";
  if (glide) {
    glideBlock = old ? `ㅇ${glide}` : composeSyllable("ㅇ", glide);
  }

  return `${prefix}${block}${glideBlock}`;
}

export function assembleSyllables(
  phonemes: EnPhoneme[],
  mode: PhoneticMode,
): string {
  let result = "";
  let i = 0;
  const n = phonemes.length;

  while (i < n) {
    const ph = phonemes[i];
    if (EN_VOWELS.has(ph)) {
      let coda: string | null = null;
      if (i + 1 < n && CODA_ELIGIBLE.has(phonemes[i + 1]) &&
          !(i + 2 < n && EN_VOWELS.has(phonemes[i + 2]))) {
        coda = phonemes[i + 1];
      }
      result += renderSyllable(null, ph, coda, mode);
      i += coda ? 2 : 1;
      continue;
    }

    if (i + 1 < n && EN_VOWELS.has(phonemes[i + 1])) {
      const onset = ph;
      const vowel = phonemes[i + 1];
      let coda: string | null = null;
      let consumed = 2;
      if (i + 2 < n && CODA_ELIGIBLE.has(phonemes[i + 2]) &&
          !(i + 3 < n && EN_VOWELS.has(phonemes[i + 3]))) {
        coda = phonemes[i + 2];
        consumed = 3;
      }
      result += renderSyllable(onset, vowel, coda, mode);
      i += consumed;
      continue;
    }

    result += renderConsonantOnly(ph, mode);
    i += 1;
  }
  return result;
}

function renderConsonantOnly(consonant: string, mode: PhoneticMode): string {
  const old = mode === "old-hangul";
  const rule = EN_CONSONANTS[consonant];
  const cho = rule ? (old ? rule.old : rule.cho) : "ㅇ";
  const prefix = !old && rule?.webPrefix ? rule.webPrefix : "";
  const block = old ? `${cho}ㅡ` : composeSyllable(cho, "ㅡ");
  return `${prefix}${block}`;
}

/** 영어 텍스트 → 음절 단위 표음 결과 */
export function convertEnglish(
  text: string,
  mode: PhoneticMode,
): PhoneticSyllable[] {
  const words = text.split(/(\s+)/);
  const out: PhoneticSyllable[] = [];
  for (const token of words) {
    if (/^\s+$/.test(token) || token === "") {
      if (token !== "") out.push({ base: token, hangul: token });
      continue;
    }

    // 구두점 분리: "gym." → cleaned="gym", punct="."
    const match = token.match(/^([A-Za-z']+)([^A-Za-z']*)$/);
    const cleaned = match ? match[1].toLowerCase() : token.toLowerCase().replace(/[^a-z']/g, "");
    const punct = match ? match[2] : "";

    if (!cleaned) {
      out.push({ base: token, hangul: token });
      continue;
    }

    // 1차: 직접 한글 사전
    const direct = HANGUL_DICT[cleaned];
    if (direct) {
      out.push({ base: token, hangul: direct + punct });
      continue;
    }

    // 2차: IPA 기반 조립
    const phonemes = graphemeToPhonemes(cleaned);
    const hangul = assembleSyllables(phonemes, mode);
    out.push({ base: token, hangul: hangul + punct });
  }
  return out;
}
