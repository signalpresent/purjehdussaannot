# Regenerates rules/cases links in src/defs.json from content-map.json.
# Explanations (explain: fi/sv/en, source) are edited in src/defs.json and preserved here.
import json,os
root=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT=os.path.join(root,'src','defs.json')
d=json.load(open(os.path.join(root,'content-map.json'),encoding='utf-8'))
old={o['en']:o for o in json.load(open(OUT,encoding='utf-8'))}
out=[]
for df in d['definitions']:
    cs=d['rule_to_cases'].get('DEF:'+df['en'],[])
    rl=[]
    for n in df['used_by_rules']:
        r=d['rules'].get(str(n))
        if r: rl.append({'n':n,'en':r['en'],'fi':r['fi'],'sv':r['sv']})
    o=old[df['en']]
    out.append({'en':df['en'],'fi':df['fi'],'sv':df['sv'],'rules':rl,'cases':cs,'explain':o['explain'],'source':o['source']})
json.dump(out,open(OUT,'w',encoding='utf-8'),ensure_ascii=False,indent=1)
print(len(out))
