#!/bin/sh
# Regenera docs/especies.json y docs/investigacion-ecologia.md desde datos.py + fantasticos.py + plantilla.md
set -e
cd "$(dirname "$0")"
D=../../docs
python3 gen.py $D/especies.json /tmp/barcanueva-tablas.json
python3 - <<'PY'
import json
t=json.load(open('/tmp/barcanueva-tablas.json')); s=open('plantilla.md').read(); c=t['cont']
rep={'{{TOTAL}}':str(sum(c.values())),'{{NA}}':str(c['animal']),'{{NP}}':str(c['planta']),'{{NH}}':str(c['hongo']),'{{NF}}':str(c['fantastico']),
'{{GEN}}':"\n".join("  "+l for l in t['tablas']['G'].splitlines()),'{{FAN}}':t['tablas']['F']}
for b in "UBPMRC": rep['{{%s}}'%b]=t['tablas'][b]
for k,v in rep.items(): s=s.replace(k,v)
assert '{{' not in s
open('../../docs/investigacion-ecologia.md','w').write(s)
PY
