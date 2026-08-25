import os
import urllib.request

images = {
    "d15": "https://images.unsplash.com/photo-1541542684-938b8b6a8b1b?auto=format&fit=crop&w=1350&q=80",
    "d16": "https://images.unsplash.com/photo-1542317854-9b36baf2f0e1?auto=format&fit=crop&w=1350&q=80",
    "d17": "https://images.unsplash.com/photo-1501117716987-c8e36b53bdbb?auto=format&fit=crop&w=1350&q=80",
    "d18": "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1350&q=80",
}

out_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'static', 'images')
os.makedirs(out_dir, exist_ok=True)

for key, url in images.items():
    filename = f"{key}_remote.jpg"
    path = os.path.join(out_dir, filename)
    try:
        print(f"Downloading {key} from {url} -> {path}")
        urllib.request.urlretrieve(url, path)
        print("OK")
    except Exception as e:
        print("FAILED", key, type(e).__name__, e)
