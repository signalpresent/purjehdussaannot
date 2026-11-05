import type { Lang } from './i18n';

// Boats point up, wind from upper right (starboard tack). Hull 60 long, boom overhangs the stern: aftermost point = 68.
const AFT = 68, A_Y = 40, LINE_Y = A_Y + AFT, B_X = 200;
// Touching the line is not "behind" it, so that counts as overlap.
export const clearAstern = (lineY: number, bowY: number) => bowY > lineY;

const X: Record<string, Record<Lang, string>> = {
  slide: { fi: 'Veneen B paikka', sv: 'Båt B:s läge', en: 'Position of boat B' },
  intro: {
    fi: 'Molemmat veneet ovat samalla halssilla. Siirrä venettä B: katkoviiva kulkee poikittain veneen A perimmäisen pisteen kohdalta, puomi mukaan lukien.',
    sv: 'Båda båtarna är för samma halsar. Flytta båt B: den streckade linjen går tvärs genom den aktersta punkten på båt A, bommen inräknad.',
    en: 'Both boats are on the same tack. Move boat B: the dashed line runs abeam through the aftermost point of boat A, boom included.',
  },
  clear: {
    fi: 'B on selvästi perässä; A on selvästi edessä.',
    sv: 'B är klar akter om; A är klar för om.',
    en: 'B is clear astern; A is clear ahead.',
  },
  over: {
    fi: 'A ja B ovat peitossa: B ei ole selvästi perässä.',
    sv: 'A och B överlappar: B är inte klar akter om.',
    en: 'A and B overlap: B is not clear astern.',
  },
  chain: {
    fi: 'Katkoviivat kulkevat A:n ja B:n perimmäisten pisteiden kohdalta. C on selvästi perässä A:sta, mutta B on peitossa sekä A:n että C:n kanssa. Siksi A ja C ovat peitossa.',
    sv: 'De streckade linjerna går genom den aktersta punkten på A och på B. C är klar akter om A, men B överlappar både A och C. Därför överlappar A och C.',
    en: 'The dashed lines run through the aftermost points of A and B. C is clear astern of A, but B overlaps both A and C. So A and C overlap.',
  },
  alt1: {
    fi: 'Kaavio: kaksi venettä samalla halssilla ja poikittaisviiva veneen A perimmäisen pisteen kohdalla',
    sv: 'Diagram: två båtar för samma halsar och en tvärslinje genom båt A:s aktersta punkt',
    en: 'Diagram: two boats on the same tack and a line abeam through boat A’s aftermost point',
  },
  alt2: {
    fi: 'Kaavio: kolme venettä, joista välissä oleva B on peitossa sekä A:n että C:n kanssa',
    sv: 'Diagram: tre båtar där B i mitten överlappar både A och C',
    en: 'Diagram: three boats where B in the middle overlaps both A and C',
  },
};

const wind = '<line class="wind" x1="282" y1="10" x2="262" y2="30"/><polygon class="wind" points="258,34 266.5,31.1 260.9,25.5"/>';
const HULL = 'M0 0C11 14 11 46 7 60L-7 60C-11 46-11 14 0 0Z';
// Boom and sail on the leeward side: left of the centreline on starboard tack, right on port tack.
const sailPath = (port: boolean) => { const d = `M0 24Q${port ? 9 : -9} 46 ${port ? 5 : -5} ${AFT}`; return `<path class="sail-o" d="${d}"/><path class="sail" d="${d}"/>`; };
const boat = (cls: string, name: string, x: number, y: number, id = '') =>
  `<g${id ? ` id="${id}"` : ''} transform="translate(${x} ${y})"><path class="${cls}" d="${HULL}"/>${sailPath(false)}<text class="lb" x="4" y="40">${name}</text></g>`;

export interface SceneBoat { n: string; x: number; y: number; rot: number; tack: 'p' | 's'; c?: 'a' | 'b' | 'c'; ghost?: boolean }
export interface Scene { h?: number; boats: SceneBoat[]; track?: [number, number][]; mark?: [number, number] }
const colour: Record<string, string> = { A: 'a', B: 'b', C: 'c' };
// Static scene: wind from the top, x/y = boat centre, rot in degrees clockwise (0 = bow up), tack p = port, s = starboard.
export function sceneSvg(sc: Scene, label: string): string {
  const boats = sc.boats.map(b => {
    const dx = b.tack === 'p' ? -4 : 4;
    return `<g${b.ghost ? ' class="ghost"' : ''}><g transform="translate(${b.x} ${b.y}) rotate(${b.rot}) translate(0 -30)"><path class="h-${b.c ?? colour[b.n] ?? 'a'}" d="${HULL}"/>${sailPath(b.tack === 'p')}` +
      `<text class="lb" x="${dx}" y="35" transform="rotate(${-b.rot} ${dx} 35)" dominant-baseline="central">${b.n}</text></g></g>`;
  }).join('');
  const track = sc.track ? `<polyline class="trk" points="${sc.track.map(p => p.join(',')).join(' ')}"/>` : '';
  const mark = sc.mark ? `<circle class="mk" cx="${sc.mark[0]}" cy="${sc.mark[1]}" r="7"/>` : '';
  return `<svg viewBox="0 0 300 ${sc.h ?? 260}" role="img" aria-label="${label.replace(/"/g, '&quot;')}"><line class="wind" x1="270" y1="8" x2="270" y2="32"/><polygon class="wind" points="270,40 264,30 276,30"/>${track}${mark}${boats}</svg>`;
}

const line = (y: number) => `<line class="aft" x1="0" x2="300" y1="${y}" y2="${y}"/>`;

let bowB = 160;
const status = (l: Lang) => X[clearAstern(LINE_Y, bowB) ? 'clear' : 'over'][l];

export function overlapMove(el: HTMLInputElement, l: Lang) {
  bowB = +el.value;
  document.getElementById('ov-b')!.setAttribute('transform', `translate(${B_X} ${bowB})`);
  document.getElementById('ov-s')!.textContent = status(l);
}

const overlapFigure = (l: Lang) => `<div class="fig"><p>${X.intro[l]}</p>
  <svg viewBox="0 0 300 270" role="img" aria-label="${X.alt1[l]}">${wind}${line(LINE_Y)}${boat('h-a', 'A', 100, A_Y)}${boat('h-b', 'B', B_X, bowB, 'ov-b')}</svg>
  <label for="ov">${X.slide[l]}</label><input id="ov" type="range" min="40" max="190" value="${bowB}">
  <p class="st" id="ov-s" aria-live="polite">${status(l)}</p></div>`;

const chainFigure = (l: Lang) => `<div class="fig">
  <svg viewBox="0 0 300 210" role="img" aria-label="${X.alt2[l]}">${wind}${line(88)}${line(138)}${boat('h-a', 'A', 60, 20)}${boat('h-b', 'B', 150, 70)}${boat('h-c', 'C', 240, 125)}</svg>
  <p>${X.chain[l]}</p></div>`;

export const diagrams: Record<string, (l: Lang) => string> = {
  'Clear Astern and Clear Ahead; Overlap': l => overlapFigure(l) + chainFigure(l),
};
