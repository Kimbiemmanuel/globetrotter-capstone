"""
Globe Trotter Travel Assistant - Phase 1: Monolith
A single Flask server handling API, business logic and JSON-file data access.
Focus city: Yaoundé, Cameroon.
"""
import json
import os
import uuid
import datetime
from functools import wraps

import jwt
from flask import Flask, request, jsonify, render_template
from werkzeug.security import generate_password_hash, check_password_hash

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
USERS_FILE = os.path.join(DATA_DIR, "users.json")
DEST_FILE = os.path.join(DATA_DIR, "destinations.json")
ITIN_FILE = os.path.join(DATA_DIR, "itineraries.json")

app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "globe-trotter-dev-secret-change-me")
JWT_ALGO = "HS256"
TOKEN_TTL_HOURS = 24

# --------------------------------------------------------------------------
# Data Access layer (JSON file storage - Phase 1 has no database yet)
# --------------------------------------------------------------------------

def _read_json(path):
    if not os.path.exists(path):
        return []
    with open(path, "r", encoding="utf-8") as f:
        content = f.read().strip()
        return json.loads(content) if content else []


def _write_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def get_users():
    return _read_json(USERS_FILE)


def save_users(users):
    _write_json(USERS_FILE, users)


def get_destinations():
    return _read_json(DEST_FILE)


def get_itineraries():
    return _read_json(ITIN_FILE)


def save_itineraries(itins):
    _write_json(ITIN_FILE, itins)


# --------------------------------------------------------------------------
# Authentication (simple JWT-based auth)
# --------------------------------------------------------------------------

def generate_token(user_id, email):
    payload = {
        "sub": user_id,
        "email": email,
        "iat": datetime.datetime.utcnow(),
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=TOKEN_TTL_HOURS),
    }
    return jwt.encode(payload, app.config["SECRET_KEY"], algorithm=JWT_ALGO)


def decode_token(token):
    return jwt.decode(token, app.config["SECRET_KEY"], algorithms=[JWT_ALGO])


def require_auth(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid Authorization header"}), 401
        token = auth_header.split(" ", 1)[1]
        try:
            payload = decode_token(token)
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired, please log in again"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401
        request.user_id = payload["sub"]
        request.user_email = payload["email"]
        return f(*args, **kwargs)

    return wrapper


# --------------------------------------------------------------------------
# Business Logic: recommendations
# --------------------------------------------------------------------------

def score_destination(dest, preferred_tags, past_dest_ids, all_destinations):
    score = float(dest.get("rating", 4.0))
    dest_tags = set(dest.get("tags", []))
    overlap = len(dest_tags & preferred_tags)
    score += overlap * 1.5

    # Boost destinations sharing a category with places the user already visited
    past_categories = {
        d["category"] for d in all_destinations if d["id"] in past_dest_ids
    }
    if dest.get("category") in past_categories:
        score += 0.5

    # Slight popularity boost is intentionally omitted in Phase 1 (no visit
    # analytics yet) - kept simple and explainable.
    return round(score, 2)


def build_recommendations(user, all_destinations, limit=6):
    preferred_tags = set(user.get("preferences", {}).get("tags", []))
    past_ids = set(user.get("preferences", {}).get("visited", []))

    scored = [
        {**dest, "match_score": score_destination(dest, preferred_tags, past_ids, all_destinations)}
        for dest in all_destinations
    ]
    scored.sort(key=lambda d: d["match_score"], reverse=True)
    return scored[:limit]


# --------------------------------------------------------------------------
# Routes: pages
# --------------------------------------------------------------------------

@app.route("/")
def index():
    return render_template("index.html")


# --------------------------------------------------------------------------
# Routes: auth
# --------------------------------------------------------------------------

@app.route("/register", methods=["POST"])
def register():
    body = request.get_json(silent=True) or {}
    name = (body.get("name") or "").strip()
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""
    tags = body.get("preferred_tags") or []

    if not name or not email or not password:
        return jsonify({"error": "name, email and password are required"}), 400
    if len(password) < 6:
        return jsonify({"error": "password must be at least 6 characters"}), 400

    users = get_users()
    if any(u["email"] == email for u in users):
        return jsonify({"error": "An account with this email already exists"}), 409

    user = {
        "id": str(uuid.uuid4()),
        "name": name,
        "email": email,
        "password_hash": generate_password_hash(password),
        "preferences": {"tags": tags, "visited": []},
        "created_at": datetime.datetime.utcnow().isoformat() + "Z",
    }
    users.append(user)
    save_users(users)

    token = generate_token(user["id"], user["email"])
    return jsonify({
        "message": "Account created",
        "token": token,
        "user": {"id": user["id"], "name": user["name"], "email": user["email"]},
    }), 201


@app.route("/login", methods=["POST"])
def login():
    body = request.get_json(silent=True) or {}
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""

    users = get_users()
    user = next((u for u in users if u["email"] == email), None)
    if not user or not check_password_hash(user["password_hash"], password):
        return jsonify({"error": "Invalid email or password"}), 401

    token = generate_token(user["id"], user["email"])
    return jsonify({
        "message": "Logged in",
        "token": token,
        "user": {"id": user["id"], "name": user["name"], "email": user["email"]},
    })


# --------------------------------------------------------------------------
# Routes: destinations & recommendations
# --------------------------------------------------------------------------

@app.route("/destinations", methods=["GET"])
def destinations():
    q = (request.args.get("q") or "").strip().lower()
    category = (request.args.get("category") or "").strip().lower()

    results = get_destinations()
    if q:
        results = [
            d for d in results
            if q in d["name"].lower()
            or q in d.get("area", "").lower()
            or any(q in t for t in d.get("tags", []))
        ]
    if category:
        results = [d for d in results if d.get("category", "").lower() == category]

    return jsonify({"count": len(results), "destinations": results})


@app.route("/recommendations", methods=["GET"])
def recommendations():
    all_destinations = get_destinations()
    auth_header = request.headers.get("Authorization", "")

    if auth_header.startswith("Bearer "):
        try:
            payload = decode_token(auth_header.split(" ", 1)[1])
            users = get_users()
            user = next((u for u in users if u["id"] == payload["sub"]), None)
            if user:
                recs = build_recommendations(user, all_destinations)
                return jsonify({"personalized": True, "recommendations": recs})
        except jwt.InvalidTokenError:
            pass

    # Anonymous fallback: highest-rated destinations
    recs = sorted(all_destinations, key=lambda d: d.get("rating", 0), reverse=True)[:6]
    return jsonify({"personalized": False, "recommendations": recs})


# --------------------------------------------------------------------------
# Routes: itineraries (auth required)
# --------------------------------------------------------------------------

@app.route("/itineraries", methods=["POST"])
@require_auth
def create_itinerary():
    body = request.get_json(silent=True) or {}
    title = (body.get("title") or "").strip()
    stops = body.get("stops") or []
    start_date = body.get("start_date")
    notes = body.get("notes", "")

    if not title:
        return jsonify({"error": "title is required"}), 400
    if not isinstance(stops, list) or not stops:
        return jsonify({"error": "stops must be a non-empty list of destination ids"}), 400

    valid_ids = {d["id"] for d in get_destinations()}
    invalid = [s for s in stops if s not in valid_ids]
    if invalid:
        return jsonify({"error": f"Unknown destination ids: {invalid}"}), 400

    itins = get_itineraries()
    itinerary = {
        "id": str(uuid.uuid4()),
        "user_id": request.user_id,
        "title": title,
        "stops": stops,
        "start_date": start_date,
        "notes": notes,
        "shared_with": [],
        "created_at": datetime.datetime.utcnow().isoformat() + "Z",
    }
    itins.append(itinerary)
    save_itineraries(itins)

    # Track visited destinations for future recommendation scoring
    users = get_users()
    for u in users:
        if u["id"] == request.user_id:
            visited = set(u.setdefault("preferences", {}).setdefault("visited", []))
            visited.update(stops)
            u["preferences"]["visited"] = list(visited)
    save_users(users)

    return jsonify({"message": "Itinerary created", "itinerary": itinerary}), 201


@app.route("/itineraries", methods=["GET"])
@require_auth
def list_itineraries():
    itins = [i for i in get_itineraries() if i["user_id"] == request.user_id
              or request.user_email in i.get("shared_with", [])]
    dest_lookup = {d["id"]: d for d in get_destinations()}
    for i in itins:
        i["stop_details"] = [dest_lookup[s] for s in i["stops"] if s in dest_lookup]
    return jsonify({"count": len(itins), "itineraries": itins})


@app.route("/itineraries/<itinerary_id>/share", methods=["POST"])
@require_auth
def share_itinerary(itinerary_id):
    body = request.get_json(silent=True) or {}
    share_email = (body.get("email") or "").strip().lower()
    if not share_email:
        return jsonify({"error": "email is required"}), 400

    itins = get_itineraries()
    itinerary = next((i for i in itins if i["id"] == itinerary_id), None)
    if not itinerary:
        return jsonify({"error": "Itinerary not found"}), 404
    if itinerary["user_id"] != request.user_id:
        return jsonify({"error": "You can only share your own itineraries"}), 403

    if share_email not in itinerary["shared_with"]:
        itinerary["shared_with"].append(share_email)
    save_itineraries(itins)
    return jsonify({"message": f"Itinerary shared with {share_email}", "itinerary": itinerary})


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "phase": "1-monolith", "city": "Yaoundé"})


# --------------------------------------------------------------------------
# Routes: user profile (API)
# --------------------------------------------------------------------------


@app.route("/api/me", methods=["GET"])
@require_auth
def api_get_me():
    users = get_users()
    user = next((u for u in users if u["id"] == request.user_id), None)
    if not user:
        return jsonify({"error": "User not found"}), 404

    # Expose safe user info (no password hash)
    user_public = {
        "id": user["id"],
        "name": user.get("name"),
        "email": user.get("email"),
        "preferences": user.get("preferences", {}),
        "created_at": user.get("created_at"),
    }

    # include user's itineraries and visited destination details
    itins = [i for i in get_itineraries() if i.get("user_id") == user["id"] or user["email"] in i.get("shared_with", [])]
    dest_lookup = {d["id"]: d for d in get_destinations()}
    for i in itins:
        i["stop_details"] = [dest_lookup[s] for s in i.get("stops", []) if s in dest_lookup]

    visited = [dest_lookup[d] for d in user.get("preferences", {}).get("visited", []) if d in dest_lookup]

    return jsonify({"user": user_public, "itineraries": itins, "visited": visited})


@app.route("/api/me", methods=["PUT"])
@require_auth
def api_update_me():
    body = request.get_json(silent=True) or {}
    name = body.get("name")
    prefs = body.get("preferences")
    new_password = body.get("password")

    users = get_users()
    user = next((u for u in users if u["id"] == request.user_id), None)
    if not user:
        return jsonify({"error": "User not found"}), 404

    changed = False
    if name and name.strip() and name.strip() != user.get("name"):
        user["name"] = name.strip()
        changed = True

    if isinstance(prefs, dict):
        # only allow updating tags here (visited should be managed by itineraries)
        tags = prefs.get("tags")
        if isinstance(tags, list):
            user.setdefault("preferences", {})["tags"] = tags
            changed = True

    if new_password:
        if len(new_password) < 6:
            return jsonify({"error": "password must be at least 6 characters"}), 400
        user["password_hash"] = generate_password_hash(new_password)
        changed = True

    if changed:
        save_users(users)

    return jsonify({"message": "Profile updated", "user": {"id": user["id"], "name": user.get("name"), "email": user.get("email"), "preferences": user.get("preferences", {})}})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
