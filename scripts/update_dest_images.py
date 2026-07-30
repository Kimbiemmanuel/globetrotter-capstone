#!/usr/bin/env python3
"""Update destination images by searching Wikimedia Commons.

This script searches for file pages (namespace 6) on Commons using each
destination's `name` and replaces the `image` and `credit` fields with the
first matching file's direct URL and credit set to 'Wikimedia Commons'.

Run: python scripts/update_dest_images.py
"""
import json
import time
import urllib.parse
import urllib.request

BASE = __file__.rsplit("\\", 2)[0]
DATA_PATH = BASE + "\\data\\destinations.json"

API_BASE = "https://commons.wikimedia.org/w/api.php"


def commons_search_file(title):
    params = {
        'action': 'query',
        'format': 'json',
        'list': 'search',
        'srsearch': title,
        'srnamespace': 6,
        'srlimit': 1,
        'origin': '*'
    }
    url = API_BASE + '?' + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={
        'User-Agent': 'GlobeTrotterBot/1.0 (https://github.com/Kimbiemmanuel/globetrotter-capstone)'
    })
    with urllib.request.urlopen(req) as resp:
        data = json.load(resp)
    hits = data.get('query', {}).get('search', [])
    if not hits:
        return None
    return hits[0].get('title')


def file_url_from_title(file_title):
    params = {
        'action': 'query',
        'format': 'json',
        'prop': 'imageinfo',
        'iiprop': 'url|extmetadata',
        'titles': file_title,
        'origin': '*'
    }
    url = API_BASE + '?' + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={
        'User-Agent': 'GlobeTrotterBot/1.0 (https://github.com/Kimbiemmanuel/globetrotter-capstone)'
    })
    with urllib.request.urlopen(req) as resp:
        data = json.load(resp)
    pages = data.get('query', {}).get('pages', {})
    for p in pages.values():
        info = p.get('imageinfo')
        if info and isinstance(info, list):
            ii = info[0]
            return ii.get('url')
    return None


def main():
    with open(DATA_PATH, 'r', encoding='utf-8') as f:
        dests = json.load(f)

    changed = False
    for d in dests:
        name = d.get('name')
        candidates = [f"{name} Yaounde Cameroon", f"{name} Yaounde", f"{name} photo Yaounde", name]
        file_title = None
        for query in candidates:
            print(f"Searching Commons for: {query}")
            file_title = commons_search_file(query)
            if file_title:
                break
            print("  No file match for that query")
        if not file_title:
            print("  Still no match, skipping")
            continue
        print(f"  Found file: {file_title}")
        url = file_url_from_title(file_title)
        def looks_like_image(u):
            if not u:
                return False
            u = u.lower()
            return u.endswith(('.jpg', '.jpeg', '.png', '.svg', '.webp'))

        if url and looks_like_image(url):
            print(f"  Resolved URL: {url}")
            d['image'] = url
            d['credit'] = 'Wikimedia Commons'
            changed = True
        else:
            # try alternate queries if the resolved URL isn't an image (e.g., PDF)
            if not url or not looks_like_image(url):
                print("  Resolved URL not an image, trying alternate queries")
                alt_found = False
                for q in [f"{name} Yaounde photo", f"{name} Yaounde JPG", f"{name} Yaounde PNG"]:
                    ft = commons_search_file(q)
                    if not ft:
                        continue
                    u = file_url_from_title(ft)
                    if looks_like_image(u):
                        print(f"  Found better image: {u}")
                        d['image'] = u
                        d['credit'] = 'Wikimedia Commons'
                        changed = True
                        alt_found = True
                        break
                if not alt_found:
                    print("  No suitable image found for this destination")
        # be polite
        time.sleep(1.1)

    if changed:
        with open(DATA_PATH, 'w', encoding='utf-8') as f:
            json.dump(dests, f, ensure_ascii=False, indent=2)
        print(f"Updated {DATA_PATH}")
    else:
        print("No changes made.")


if __name__ == '__main__':
    main()
