#!/bin/bash
# Supprime toutes les données du store « mimouni » sauf le compte admin (via la CLI Netlify).
cd /workspace/mimouni/app || exit 1
npx -y netlify-cli blobs:list mimouni --json 2>/dev/null | python3 -c "
import json,sys
d=json.load(sys.stdin)
for b in d['blobs']:
    if b['key']!='users/admin': print(b['key'])
" > /tmp/mimouni-keys.txt
echo "$(wc -l < /tmp/mimouni-keys.txt) clés à supprimer"
xargs -a /tmp/mimouni-keys.txt -P 10 -I{} sh -c 'npx -y netlify-cli blobs:delete mimouni "{}" --force >/dev/null 2>&1 || echo "échec {}"'
npx -y netlify-cli blobs:list mimouni --json 2>/dev/null | python3 -c "import json,sys;d=json.load(sys.stdin);print('Reste :',[b['key'] for b in d['blobs']])"
