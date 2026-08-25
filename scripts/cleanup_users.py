import json
from pathlib import Path
p = Path(__file__).parents[1] / 'data' / 'users.json'
users = json.loads(p.read_text(encoding='utf-8')) if p.exists() else []
filtered = [u for u in users if u.get('email','').lower() != 'itinerary-profile@example.com']
if len(filtered) != len(users):
    p.write_text(json.dumps(filtered, ensure_ascii=False, indent=2), encoding='utf-8')
    print('Removed test user')
else:
    print('No test user found')
