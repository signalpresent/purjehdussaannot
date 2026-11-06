import { Lang, esc } from './i18n';

// Race Signals (RRS inside cover). Flags are own drawings of the International Code of Signals patterns.
type ML = Record<Lang, string>;
const R = '#d8202a', W = '#fff', B = '#1d4fa3', Y = '#f6d200', K = '#141414', G = '#169b48', O = '#ff5a00';
const r = (x: number, y: number, w: number, h: number, c: string) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;
const p = (pts: string, c: string) => `<polygon points="${pts}" fill="${c}"/>`;
const c = (x: number, y: number, rad: number, col: string) => `<circle cx="${x}" cy="${y}" r="${rad}" fill="${col}"/>`;
const ln = (x1: number, y1: number, x2: number, y2: number, col: string, w: number) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="${w}"/>`;
const quart = (a: string, b: string, cc: string, d: string) => r(0, 0, 30, 20, a) + r(30, 0, 30, 20, b) + r(0, 20, 30, 20, cc) + r(30, 20, 30, 20, d);
const checker = [...Array(16)].map((_, i) => r((i % 4) * 15, Math.floor(i / 4) * 10, 15, 10, (i % 4 + Math.floor(i / 4)) % 2 ? W : B)).join('');
const yStripes = [...Array(9)].map((_, i) => ln(-40 + i * 14, 40, i * 14, 0, R, 7)).join('');
const FLAG: Record<string, string> = {
  A: r(0, 0, 30, 40, W) + p('30,0 60,0 48,20 60,40 30,40', B),
  H: r(0, 0, 30, 40, W) + r(30, 0, 30, 40, R),
  N: checker,
  P: r(0, 0, 60, 40, B) + r(21, 13, 18, 14, W),
  I: r(0, 0, 60, 40, Y) + c(30, 20, 10, K),
  Z: p('0,0 60,0 30,20', Y) + p('0,0 30,20 0,40', K) + p('0,40 30,20 60,40', R) + p('60,0 30,20 60,40', B),
  U: quart(R, W, W, R),
  black: r(0, 0, 60, 40, K),
  X: r(0, 0, 60, 40, W) + r(25, 0, 10, 40, B) + r(0, 15, 60, 10, B),
  S: r(0, 0, 60, 40, W) + r(22, 13, 16, 14, B),
  C: [B, W, R, W, B].map((col, i) => r(0, i * 8, 60, 8, col)).join(''),
  L: quart(Y, K, K, Y),
  M: r(0, 0, 60, 40, B) + ln(0, 0, 60, 40, W, 8) + ln(0, 40, 60, 0, W, 8),
  Y: r(0, 0, 60, 40, Y) + yStripes,
  V: r(0, 0, 60, 40, W) + ln(0, 0, 60, 40, R, 7) + ln(0, 40, 60, 0, R, 7),
  orange: r(0, 0, 60, 40, O),
  blue: r(0, 0, 60, 40, B),
};
// Tapered pennants, clipped to the pennant outline. The viewport clips everything else.
const PEN: Record<string, string> = {
  AP: [R, W, R, W, R].map((col, i) => r(i * 18, 0, 18, 30, col)).join(''),
  '1': r(0, 0, 90, 30, W) + c(16, 15, 7, R),
  '2': r(0, 0, 90, 30, B) + c(16, 15, 7, W),
  '3': r(0, 0, 30, 30, R) + r(30, 0, 30, 30, W) + r(60, 0, 30, 30, B),
  '4': r(0, 0, 90, 30, R) + r(0, 12, 90, 6, W) + r(27, 0, 6, 30, W),
  '5': r(0, 0, 45, 30, Y) + r(45, 0, 45, 30, B),
  '6': r(0, 0, 90, 15, K) + r(0, 15, 90, 15, W),
  '7': r(0, 0, 90, 15, Y) + r(0, 15, 90, 15, R),
  '8': r(0, 0, 90, 30, W) + r(0, 12, 90, 6, R) + r(27, 0, 6, 30, R),
  '9': r(0, 0, 45, 15, W) + r(0, 15, 45, 15, R) + r(45, 0, 45, 15, K) + r(45, 15, 45, 15, Y),
};
const edge = 'fill="none" stroke="#8a9aa6" stroke-width="1"';
const svgFlag = (k: string, label: string) => `<svg viewBox="0 0 60 40" class="fl" role="img" aria-label="${esc(label)}">${FLAG[k]}${k === 'A' ? '' : `<rect width="60" height="40" ${edge}/>`}</svg>`;
const svgPen = (k: string, label: string) => {
  const shape = '0,0 90,9 90,21 0,30';
  return `<svg viewBox="0 0 90 30" class="pn" role="img" aria-label="${esc(label)}"><clipPath id="pn${k}"><polygon points="${shape}"/></clipPath><g clip-path="url(#pn${k})">${PEN[k]}</g><polygon points="${shape}" ${edge}/></svg>`;
};
const svgSub = (label: string) => `<svg viewBox="0 0 90 30" class="pn" role="img" aria-label="${esc(label)}">${p('0,0 90,15 0,30', B)}${p('0,6 52,15 0,24', Y)}</svg>`;
const part = (k: string, label: string) => k === 'sub' ? svgSub(label) : k in PEN ? svgPen(k, label) : svgFlag(k, label);
// Course-change shapes shown with flag C (rule 33).
const shapes = (l: Lang) => {
  const s = (body: string, t: ML) => `<span class="shp"><svg viewBox="0 0 40 40" class="fl sq" role="img" aria-label="${esc(t[l])}">${body}</svg>${esc(t[l])}</span>`;
  return `<div class="shps">${s(p('20,3 37,37 3,37', G), { fi: 'oikealle', sv: 'åt styrbord', en: 'to starboard' })}${s(r(8, 3, 24, 34, R), { fi: 'vasemmalle', sv: 'åt babord', en: 'to port' })}${s(r(8, 3, 24, 34, W) + r(13, 18, 14, 3, K), { fi: 'lyhyempi osuus', sv: 'kortare banben', en: 'shorter leg' })}${s(r(8, 3, 24, 34, W) + r(13, 18, 14, 3, K) + r(18.5, 13, 3, 14, K), { fi: 'pidempi osuus', sv: 'längre banben', en: 'longer leg' })}</div>`;
};

interface Signal { id: string; g: string; flags: string[]; name: ML; snd: string; m: ML; rules: string[] }
const M = (fi: string, sv: string, en: string): ML => ({ fi, sv, en });
const PP = M('Lähettämättömät kilpapurjehdukset lykätään.', 'Kappseglingar som inte har startat skjuts upp.', 'Races not yet started are postponed.');
const AB = M('Kaikki käynnissä olevat kilpapurjehdukset mitätöidään.', 'Alla pågående kappseglingar annulleras.', 'All races in progress are abandoned.');
const join = (a: ML, b: ML): ML => M(`${a.fi} ${b.fi}`, `${a.sv} ${b.sv}`, `${a.en} ${b.en}`);
const ASH = M('Lisäviestejä annetaan maissa.', 'Fler signaler ges i land.', 'More signals will be made ashore.');
const NOMORE = M('Tänään ei enää kilpailla.', 'Ingen mer kappsegling i dag.', 'No more racing today.');
const SIGNALS: Signal[] = [
  { id: 'AP', g: 'post', flags: ['AP'], name: M('AP', 'AP', 'AP'), snd: '↑ •• ↓ •', rules: ['27'],
    m: join(PP, M('Varoitusviesti tulee minuutti lipun laskemisen jälkeen, ellei kilpapurjehdusta silloin lykätä uudelleen tai mitätöidä.', 'Varningssignalen ges en minut efter att flaggan tagits ner, om inte kappseglingen då skjuts upp igen eller annulleras.', 'The warning signal comes one minute after the flag is removed, unless the race is then postponed again or abandoned.')) },
  { id: 'APH', g: 'post', flags: ['AP', 'H'], name: M('AP H:n yläpuolella', 'AP över H', 'AP over H'), snd: '↑ ••', rules: ['27'], m: join(PP, ASH) },
  { id: 'APA', g: 'post', flags: ['AP', 'A'], name: M('AP A:n yläpuolella', 'AP över A', 'AP over A'), snd: '↑ ••', rules: ['27'], m: join(PP, NOMORE) },
  { id: 'APn', g: 'post', flags: ['AP', '2'], name: M('AP numeroviirin 1–9 yläpuolella (kuvassa viiri 2)', 'AP över siffervimpel 1–9 (bilden: vimpel 2)', 'AP over a numeral pennant 1–9 (shown: pennant 2)'), snd: '↑ •• ↓ •', rules: ['27'],
    m: M('Lykkäys, jonka pituus on viirin numeron verran tunteja ohjelman mukaisesta lähtöajasta.', 'Uppskjutning med lika många timmar som vimpelns siffra, räknat från planerad starttid.', 'Postponement by as many hours as the pennant number, counted from the scheduled starting time.') },
  { id: 'N', g: 'aband', flags: ['N'], name: M('N', 'N', 'N'), snd: '↑ ••• ↓ •', rules: ['27', '32'],
    m: join(AB, M('Palatkaa lähtöalueelle. Varoitusviesti tulee minuutti lipun laskemisen jälkeen, ellei silloin mitätöidä uudelleen tai lykätä.', 'Återvänd till startområdet. Varningssignalen ges en minut efter att flaggan tagits ner, om inte kappseglingen då annulleras igen eller skjuts upp.', 'Return to the starting area. The warning signal comes one minute after the flag is removed, unless the race is then abandoned again or postponed.')) },
  { id: 'NH', g: 'aband', flags: ['N', 'H'], name: M('N H:n yläpuolella', 'N över H', 'N over H'), snd: '↑ •••', rules: ['27', '32'], m: join(AB, ASH) },
  { id: 'NA', g: 'aband', flags: ['N', 'A'], name: M('N A:n yläpuolella', 'N över A', 'N over A'), snd: '↑ •••', rules: ['27', '32'], m: join(AB, NOMORE) },
  { id: 'V', g: 'safe', flags: ['V'], name: M('V', 'V', 'V'), snd: '↑ —', rules: ['37'],
    m: M('Seuraa viestintäkanavaa turvallisuusohjeiden varalta.', 'Lyssna på kommunikationskanalen efter säkerhetsinstruktioner.', 'Monitor the communication channel for safety instructions.') },
  { id: 'P', g: 'prep', flags: ['P'], name: M('P', 'P', 'P'), snd: '↑ • ↓ —', rules: ['26'], m: M('Valmiusviesti.', 'Förberedelsesignal.', 'Preparatory signal.') },
  { id: 'I', g: 'prep', flags: ['I'], name: M('I', 'I', 'I'), snd: '↑ • ↓ —', rules: ['26', '30'], m: M('Valmiusviesti; sääntö 30.1 on voimassa.', 'Förberedelsesignal; regel 30.1 gäller.', 'Preparatory signal; rule 30.1 is in effect.') },
  { id: 'Z', g: 'prep', flags: ['Z'], name: M('Z', 'Z', 'Z'), snd: '↑ • ↓ —', rules: ['26', '30'], m: M('Valmiusviesti; sääntö 30.2 on voimassa.', 'Förberedelsesignal; regel 30.2 gäller.', 'Preparatory signal; rule 30.2 is in effect.') },
  { id: 'U', g: 'prep', flags: ['U'], name: M('U', 'U', 'U'), snd: '↑ • ↓ —', rules: ['26', '30'], m: M('Valmiusviesti; sääntö 30.3 on voimassa.', 'Förberedelsesignal; regel 30.3 gäller.', 'Preparatory signal; rule 30.3 is in effect.') },
  { id: 'black', g: 'prep', flags: ['black'], name: M('Musta lippu', 'Svart flagga', 'Black flag'), snd: '↑ • ↓ —', rules: ['26', '30'], m: M('Valmiusviesti; sääntö 30.4 on voimassa.', 'Förberedelsesignal; regel 30.4 gäller.', 'Preparatory signal; rule 30.4 is in effect.') },
  { id: 'X', g: 'recall', flags: ['X'], name: M('X', 'X', 'X'), snd: '↑ •', rules: ['29'], m: M('Yksittäinen palautus.', 'Enskild återkallelse.', 'Individual recall.') },
  { id: 'sub', g: 'recall', flags: ['sub'], name: M('Ensimmäinen korvausviiri', 'Första likhetstecken', 'First Substitute'), snd: '↑ •• ↓ •', rules: ['29'],
    m: M('Yleinen palautus. Varoitusviesti tulee minuutti viirin laskemisen jälkeen.', 'Allmän återkallelse. Varningssignalen ges en minut efter att vimpeln tagits ner.', 'General recall. The warning signal comes one minute after it is removed.') },
  { id: 'S', g: 'short', flags: ['S'], name: M('S', 'S', 'S'), snd: '↑ ••', rules: ['32'], m: M('Rataa on lyhennetty; sääntö 32.2 on voimassa.', 'Banan har avkortats; regel 32.2 gäller.', 'The course has been shortened; rule 32.2 is in effect.') },
  { id: 'C', g: 'leg', flags: ['C'], name: M('C', 'C', 'C'), snd: '– – – – –', rules: ['33'],
    m: M('Seuraavan merkin paikkaa on muutettu. Vihreä kolmio: oikealle; punainen suorakaide: vasemmalle; ”–”: osuus lyhenee; ”+”: osuus pitenee.', 'Nästa märkes läge har ändrats. Grön triangel: åt styrbord; röd rektangel: åt babord; ”–”: banbenet kortas; ”+”: banbenet förlängs.', 'The position of the next mark has been changed. Green triangle: to starboard; red rectangle: to port; \'–\': the leg is shorter; \'+\': the leg is longer.') },
  { id: 'L', g: 'other', flags: ['L'], name: M('L', 'L', 'L'), snd: '↑ •', rules: [],
    m: M('Maissa: ilmoitustaululla on uusi tiedote kilpailijoille. Vesillä: tulkaa huutoetäisyydelle tai seuratkaa tätä alusta.', 'I land: ett meddelande till de tävlande har anslagits. På sjön: kom inom hörhåll eller följ den här farkosten.', 'Ashore: a notice to competitors has been posted. Afloat: come within hail or follow this vessel.') },
  { id: 'M', g: 'other', flags: ['M'], name: M('M', 'M', 'M'), snd: '– – – – –', rules: ['34'], m: M('Tämän viestin näyttävä esine korvaa puuttuvan merkin.', 'Föremålet som visar signalen ersätter ett saknat märke.', 'The object displaying this signal replaces a missing mark.') },
  { id: 'Y', g: 'other', flags: ['Y'], name: M('Y', 'Y', 'Y'), snd: '↑ •', rules: ['27', '40'], m: M('Pidä kelluntavälinettä päällä (sääntö 40).', 'Bär personlig flytutrustning (regel 40).', 'Wear a personal flotation device (rule 40).') },
  { id: 'orange', g: 'other', flags: ['orange'], name: M('Oranssi lippu', 'Orange flagga', 'Orange flag'), snd: '–', rules: [], m: M('Salko, jossa lippu on, on lähtölinjan toinen pää.', 'Stången med flaggan är ena änden av startlinjen.', 'The staff with this flag is one end of the starting line.') },
  { id: 'blue', g: 'other', flags: ['blue'], name: M('Sininen lippu', 'Blå flagga', 'Blue flag'), snd: '–', rules: [], m: M('Salko, jossa lippu on, on maalilinjan toinen pää.', 'Stången med flaggan är ena änden av mållinjen.', 'The staff with this flag is one end of the finishing line.') },
];
const GROUP: Record<string, ML> = {
  post: M('Lykkäysviestit', 'Uppskjutande', 'Postponement'), aband: M('Mitätöimisviestit', 'Annullering', 'Abandonment'), safe: M('Turvallisuus', 'Säkerhet', 'Safety'),
  prep: M('Valmiusviestit', 'Förberedelse', 'Preparatory'), recall: M('Palautusviestit', 'Återkallelse', 'Recall'), short: M('Radan lyhennys', 'Avkortning av bana', 'Shortened course'),
  leg: M('Seuraavan rataosuuden muuttaminen', 'Ändring av nästa banben', 'Changing the next leg'), other: M('Muut viestit', 'Andra signaler', 'Other signals'),
};
const NOSOUND = M('ei äänimerkkiä', 'ingen ljudsignal', 'no sound');
const TXT = {
  title: M('Kilpapurjehdusviestit', 'Kappseglingssignaler', 'Race Signals'),
  intro: M('↑ = viesti nostetaan, ↓ = viesti lasketaan. • = yksi äänimerkki, — = pitkä äänimerkki, – – – – – = toistuvia äänimerkkejä. Jos viesti on luokan, laivueen, kilpailun tai rata-alueen lipun yläpuolella, se koskee vain sitä. Kilpailulautakunta saa käyttää lipun sijaan samannäköistä esinettä (25.3). Liput ovat omia piirroksia; merkitykset omin sanoin. Radiopurjehduksessa viestit annetaan suullisesti tai äänellä (E3.8(b)).',
    '↑ = signalen visas, ↓ = signalen tas ner. • = en ljudsignal, — = en lång ljudsignal, – – – – – = upprepade ljudsignaler. Visas signalen över en klass-, grupp-, tävlings- eller områdesflagga gäller den bara den. Kappseglingskommittén får använda ett föremål som liknar flaggan (25.3). Flaggorna är egna teckningar; betydelserna med egna ord. Vid radiosegling ges signaler muntligt eller med ljud (E3.8(b)).',
    '↑ = displayed, ↓ = removed. • = one sound, — = one long sound, – – – – – = repetitive sounds. A signal displayed over a class, fleet, event or race area flag applies only to that one. The race committee may use an object that looks like the flag (25.3). Flags are our own drawings; meanings in our own words. In radio sailing signals are oral or sounds (E3.8(b)).'),
  source: M('Lähde: RRS Kilpapurjehdusviestit (kansisivut), säännöt 25–40.', 'Källa: RRS Kappseglingssignaler (pärmens insida), regel 25–40.', 'Source: RRS Race Signals (inside cover), rules 25–40.'),
  all: M('Kaikki kilpapurjehdusviestit', 'Alla kappseglingssignaler', 'All race signals'),
  ask: M('Mitä tämä viesti tarkoittaa?', 'Vad betyder signalen?', 'What does this signal mean?'),
  which: M('Mikä viesti tarkoittaa tätä:', 'Vilken signal betyder detta:', 'Which signal means this:'),
};
const pics = (s: Signal, l: Lang) => `<span class="flags">${s.flags.map((f, i) => part(f, i ? '' : s.name[l])).join('')}</span>`;
const card = (s: Signal, l: Lang) => `<div class="sig">${pics(s, l)}<div><b>${esc(s.name[l])}</b> <span class="snd">${s.snd === '–' ? NOSOUND[l] : esc(s.snd)}</span><p>${esc(s.m[l])}</p>${s.id === 'C' ? shapes(l) : ''}${s.rules.length ? `<div class="chips">${s.rules.map(n => `<span data-rule="${n}">${n}</span>`).join('')}</div>` : ''}</div></div>`;

export function signalsView(l: Lang): string {
  const groups = [...new Set(SIGNALS.map(s => s.g))];
  return `<h2>${TXT.title[l]}</h2><p class="mute">${esc(TXT.intro[l])}</p>` + groups.map(g => `<h3>${GROUP[g][l]}</h3>${SIGNALS.filter(s => s.g === g).map(s => card(s, l)).join('')}`).join('')
    + `<p class="mute">${esc(TXT.source[l])}</p>`;
}
// Signals used by a rule page; rule 25 gives the meaning of all of them, so it gets a link instead.
export function signalsFor(n: string, l: Lang): string {
  const own = SIGNALS.filter(s => s.rules.includes(n));
  if (!own.length && n !== '25') return '';
  return `<h3>${TXT.title[l]}</h3>${own.map(s => card(s, l)).join('')}<p><button class="btn" data-nav="signals">${TXT.all[l]}</button></p>`;
}

// Practice: flag -> meaning and meaning -> flag. Distractors are fixed neighbours so related signals (AP/H vs AP/A) get compared.
const pick = (i: number) => [1, 3, 8].map(d => SIGNALS[(i + d) % SIGNALS.length]);
export const signalQuestions = () => SIGNALS.flatMap((s, i) => {
  const others = pick(i), why = M(`${s.name.fi}: ${s.m.fi}`, `${s.name.sv}: ${s.m.sv}`, `${s.name.en}: ${s.m.en}`), src = `RRS Race Signals${s.rules.length ? '; ' + s.rules.join(', ') : ''}`;
  return [
    { id: `sig-${s.id}-m`, prompt: TXT.ask, img: (l: Lang) => pics(s, l), options: [{ t: s.m, ok: true }, ...others.map(o => ({ t: o.m }))], why, source: src, also: s.rules },
    { id: `sig-${s.id}-f`, prompt: M(`${TXT.which.fi} ${s.m.fi}`, `${TXT.which.sv} ${s.m.sv}`, `${TXT.which.en} ${s.m.en}`), options: [s, ...others].map((o, k) => ({ t: o.name, img: (l: Lang) => pics(o, l), ...(k ? {} : { ok: true }) })), why, source: src, also: s.rules },
  ];
});
