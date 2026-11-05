"""Builds the official rule text file from the rulebook PDFs (run locally, never commit the output).

Usage: python3 scripts/build_text.py [pdf-dir] [out.json]
Defaults: the PDFs in the parent folder of the repo, output ../saannot-teksti.json (outside the repo).
Needs pdftotext (poppler). Scope: definitions and Part 2 up to Section D.
Each language is split into blocks (id, depth, text); the block ids must match across fi/sv/en or the build fails.
"""
import json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
PDF_DIR = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', '..')
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(PDF_DIR, 'saannot-teksti.json')
DEFS = json.load(open(os.path.join(HERE, '..', 'src', 'defs.json'), encoding='utf-8'))

L = {
  'en': dict(pdf='2025-2028-RRS-with-Changes-and-Corrections.pdf',
             defs=(r'^DEFINITIONS$', r'BASIC PRINCIPLES'), part=(r'^\s*PART 2$', r'^\s*SECTION D$'),
             furniture=r'^\s*(DEFINITIONS|Part 2\s+WHEN BOATS MEET|\d+)\s*$',
             see=['Overlap', 'Windward'], section=r'^\s*SECTION ([A-D])$', partname=r'^\s*WHEN BOATS MEET$'),
  'fi': dict(pdf='Purjehduksen-kilpailusaannot-2025-2028-A4_pien.pdf',
             defs=(r'^MÄÄRITELMÄT$', r'PERUSPERIAATTEET'), part=(r'^OSA 2$', r'^RYHMÄ D$'),
             furniture=r'^\s*(MÄÄRITELMÄT|Osa 2\s+KUN VENEET KOHTAAVAT|\d+)\s*$',
             see=['Peittää', 'Tuulen puoli'], section=r'^\s*RYHMÄ ([A-D])$', partname=r'^KUN VENEET KOHTAAVAT$'),
  'sv': dict(pdf='KAPPSEGLINGSREGLERNA-2025-2028-p.pdf',
             defs=(r'^DEFINITIONER$', r'^GRUNDLÄGGANDE PRINCIPER'), part=(r'^DEL 2 – NÄR BÅTAR MÖTS$', r'^\s*AVDELNING D'),
             furniture=r'^\s*(DEFINITIONER|\s+DEL 2 – NÄR BÅTAR MÖTS|\d+)\s*$',
             see=['Överlapp'], section=r'^\s*AVDELNING ([A-D]) – (.+)$', partname=None),
}
ITEM = re.compile(r'^(\s*)(?:\(([a-z])\)|([a-z])\))\s+(.*)$')
SUB = re.compile(r'^(\s*)(?:\((\d)\)|(\d)\))\s+(.*)$')
CLAUSE = re.compile(r'^(\s*)(\d+(?:\.\d+)?)\s{2,}(\S.*)$')

def lines_of(lang):
  txt = subprocess.run(['pdftotext', '-layout', os.path.join(PDF_DIR, L[lang]['pdf']), '-'], capture_output=True, text=True).stdout
  return [l.replace('\f', '').replace('­', '-').rstrip() for l in txt.split('\n')]

def cut(lines, start, end, nth=0):
  s = [i for i, l in enumerate(lines) if re.search(start, l)][nth]
  e = next(i for i in range(s + 1, len(lines)) if re.search(end, lines[i]))
  return lines[s + 1:e]

def join(parts, lang):
  out = ''
  for p in parts:
    p = p.strip()
    if out.endswith('-') and out[-2:-1].isalpha() and p[:1].isalpha():
      out = out if lang == 'en' else out[:-1]  # Finnish/Swedish hyphenation is dropped, English compound hyphens kept
      out += p
    else:
      out += (' ' if out else '') + p
  return out

def blocks(lines, lang, base_id, first_col=-1):
  """Splits body lines into blocks. Open blocks are tracked as (marker column, id, depth)."""
  out, stack = [], [(first_col, base_id, 0)]
  def new(i, d): out.append([i, d, []])
  new(base_id, 0)
  for l in lines:
    if not l.strip() or re.match(L[lang]['furniture'], l): continue
    col = len(l) - len(l.lstrip())
    m = ITEM.match(l) or SUB.match(l)
    if m:
      d = 1 if m.re is ITEM else 2
      while len(stack) > d: stack.pop()
      parent = stack[-1][1] if d == 2 else base_id
      i = f"{parent}({m.group(2) or m.group(3)})"
      stack.append((col, i, d)); new(i, d); out[-1][2].append(m.group(4)); continue
    while len(stack) > 1 and stack[-1][0] >= col: stack.pop()
    _, i, d = stack[-1]
    if out[-1][0] != i: new(i, d)
    out[-1][2].append(l)
  return [(i, d, join(p, lang)) for i, d, p in out if p]

def definitions(lang):
  ls = cut(lines_of(lang), *L[lang]['defs'])
  names = {d[lang]: d['en'] for d in DEFS}
  key = lambda n: re.split(r'[;,]', n)[0]  # 'Klar akter om och klar för om; överlapp' vs ', överlapp' in the text
  heads = sorted([(n, e) for n, e in names.items()] + [(s, None) for s in L[lang]['see']], key=lambda h: -len(key(h[0])))
  res, cur, body = {}, None, []
  def flush():
    if cur: res[cur] = blocks(body, lang, 'def:' + cur)
  for i, l in enumerate(ls):
    if lang == 'fi':  # Finnish headings always carry '(sv, en)'; body lines may start with a term ('Tila veneelle')
      h = next(((n, e) for n, e in heads if l.startswith(n + ' (')), None)
    elif lang == 'sv':  # Swedish headings stand alone on their line ('Plats' vs body line 'Plats är ...')
      h = next(((n, e) for n, e in heads if l.strip().replace(';', ',') == n.replace(';', ',')), None)
    else:
      h = next(((n, e) for n, e in heads if l.startswith(key(n)) and (len(l) == len(key(n)) or not l[len(key(n))].isalpha())), None)
    if h:
      flush(); cur, body = h[1], []
      rest = '' if lang == 'sv' else l[len(h[0]):] if l.startswith(h[0]) else l[len(key(h[0])):]
      if lang == 'fi' and rest.lstrip().startswith('('):  # '(sv, en)' may run onto the next line
        rest = rest.lstrip()
        while ')' not in rest: rest += ' ' + ls[i + 1]; ls[i + 1] = ''
        rest = rest[rest.index(')') + 1:]
      if rest.strip(): body.append(rest.strip())
      continue
    if cur is not None and body is not None: body.append(l)
  flush()
  return {k: v for k, v in res.items() if k}

def part2(lang, untitled=None):
  """untitled: sub-clause ids whose heading line is body text (decided from English, e.g. 16.1), applied to fi/sv."""
  cfg, ls = L[lang], cut(lines_of(lang), *L[lang]['part'])
  titles, chunks, cur = {}, [], ['P2', []]
  title_next = 'P2' if lang != 'sv' else None
  if lang == 'sv': titles['P2'] = 'NÄR BÅTAR MÖTS'
  i, found = 0, set()
  while i < len(ls):
    l = ls[i]
    sm = re.match(cfg['section'], l)
    cm = CLAUSE.match(l)
    if sm:
      chunks.append(cur); cur = ['2' + sm.group(1), []]
      if lang == 'sv': titles[cur[0]] = sm.group(2).strip()
      else: title_next = cur[0]
    elif title_next and l.strip() and not re.match(cfg['furniture'], l):
      titles[title_next] = l.strip(); title_next = None
    elif cm and not ITEM.match(l):
      chunks.append(cur); cur = [cm.group(2), [], len(cm.group(1))]; t = cm.group(3).strip()
      while '.' not in cur[0] and i + 1 < len(ls) and ls[i + 1].strip().isupper() and not CLAUSE.match(ls[i + 1]) and not re.match(cfg['section'], ls[i + 1]):
        i += 1; t += ' ' + ls[i].strip()  # multi-line rule titles
      if untitled is None and '.' in cur[0] and not all(w[0].isupper() for w in t.split() if len(w) > 3):
        found.add(cur[0])
      if cur[0] in (untitled if untitled is not None else found): cur[1].append(cm.group(1) + ' ' * len(cm.group(2)) + '  ' + t)
      else: titles[cur[0]] = t
    else:
      cur[1].append(l)
    i += 1
  chunks.append(cur)
  out = []
  for c in chunks:
    out += blocks(c[1], lang, c[0], c[2] if len(c) > 2 else -1)
  return titles, out, found

def main():
  en = part2('en')
  data = {l: (definitions(l), part2(l, en[2]) if l != 'en' else en) for l in L}
  errs, blocks_out, titles = [], [], {}
  en_titles, en_blocks = en[0], en[1]
  for k in en_titles:
    titles[k] = {l: data[l][1][0].get(k) for l in L}
    if None in titles[k].values(): errs.append(f'title {k}: {titles[k]}')
  for l in ('fi', 'sv'):
    a, b = [x[:2] for x in en_blocks], [x[:2] for x in data[l][1][1]]
    if a != b: errs.append(f'part 2 blocks differ en/{l}: ' + str([(x, y) for x, y in zip(a, b) if x != y][:3] or (len(a), len(b))))
  if not errs:
    for j, (i, d, t) in enumerate(en_blocks):
      blocks_out.append({'id': i, 'd': d, 't': {l: data[l][1][1][j][2] for l in L}})
  for d in DEFS:
    k = d['en']
    seqs = {l: data[l][0].get(k) for l in L}
    if any(v is None for v in seqs.values()): errs.append(f'definition {k} missing: {[l for l, v in seqs.items() if v is None]}'); continue
    if len({str([x[:2] for x in v]) for v in seqs.values()}) > 1: errs.append(f'definition {k} blocks differ: { {l: [x[:2] for x in v] for l, v in seqs.items()} }'); continue
    titles['def:' + k] = {l: d[l] for l in L}
    for j, (i, dd, _) in enumerate(seqs['en']):
      blocks_out.append({'id': i, 'd': dd, 't': {l: seqs[l][j][2] for l in L}})
  # Every rule page and definition in the app must find its text (same matching as official() in src/rules.ts).
  have = {b['id'].split('(')[0] for b in blocks_out}
  for r in json.load(open(os.path.join(HERE, '..', 'src', 'rules.json'), encoding='utf-8')):
    n = str(r['n'])
    if not any(b == n or (b in r['covers'] if 'covers' in r else b.startswith(n + '.')) for b in have): errs.append(f'no text for page {n}')
  if errs:
    print('\n'.join(errs)); sys.exit(1)
  out = {'app': 'sailrules-text', 'v': 1, 'edition': 'RRS 2025–2028 · EN: muutokset 20.4.2026 asti · FI, SV: käännökset 2024', 'titles': titles, 'blocks': blocks_out}
  json.dump(out, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
  print(f'ok {len(blocks_out)} blocks, {len(titles)} titles -> {OUT}')

if __name__ == '__main__':
  main()
