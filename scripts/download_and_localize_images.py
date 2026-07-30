#!/usr/bin/env python3
"""Download destination images and update destinations.json to use local files.

Saves images into `static/images/` using the destination id as filename.
If a destination's image URL doesn't look like an image, assigns the
`/static/images/yaounde-fallback.svg` placeholder.
"""
import json
import os
import time
import urllib.request

BASE = os.path.dirname(os.path.dirname(__file__))
DATA_PATH = os.path.join(BASE, 'data', 'destinations.json')
IM_DIR = os.path.join(BASE, 'static', 'images')
FALLBACK = '/static/images/yaounde-fallback.svg'

os.makedirs(IM_DIR, exist_ok=True)

def looks_like_image_url(u):
    if not u: return False
    # skip local static paths
    if str(u).startswith('/static/'):
        return False
    u = u.lower().split('?')[0]
    return u.startswith('http') and u.endswith(('.jpg', '.jpeg', '.png', '.svg', '.webp'))

with open(DATA_PATH, 'r', encoding='utf-8') as f:
    dests = json.load(f)

for d in dests:
    url = d.get('image')
    if looks_like_image_url(url):
        ext = url.split('?')[0].split('.')[-1]
        fname = f"{d['id']}.{ext}"
        outpath = os.path.join(IM_DIR, fname)
        try:
            print(f"Downloading {url} -> {outpath}")
            req = urllib.request.Request(url, headers={
                'User-Agent': 'GlobeTrotterBot/1.0 (https://github.com/Kimbiemmanuel/globetrotter-capstone)'
            })
            with urllib.request.urlopen(req) as resp, open(outpath, 'wb') as out:
                out.write(resp.read())
            d['image'] = f"/static/images/{fname}"
            if not d.get('credit'):
                d['credit'] = 'Local copy'
        except Exception as e:
            print('  download failed:', e)
            d['image'] = FALLBACK
            d['credit'] = 'Local fallback'
    else:
        print(f"Skipping non-image URL for {d.get('id')}, using fallback")
        d['image'] = FALLBACK
        d['credit'] = 'Local fallback'
    # be polite
    time.sleep(0.8)

with open(DATA_PATH, 'w', encoding='utf-8') as f:
    json.dump(dests, f, ensure_ascii=False, indent=2)

print('Localization complete.')
