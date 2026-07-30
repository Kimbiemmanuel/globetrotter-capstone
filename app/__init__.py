"""
app/__init__.py

Flask application factory for the package blueprints, plus a module-level
``app`` for gunicorn when the Render start command is still ``app:app``.

Root ``app.py`` (Yaoundé UI monolith) shares the import name ``app`` with this
package, so gunicorn cannot load ``app.py`` directly. We expose that monolith
here as ``app``.
"""
import importlib.util
import os
from flask import Flask


def create_app():
    """Create and configure the Flask application (package blueprints)."""
    flask_app = Flask(__name__)

    # Secret key used for JWT signing.  Set the SECRET_KEY environment variable
    # in production.  The fallback is intentionally weak and must never be used
    # outside of local development.
    flask_app.config["SECRET_KEY"] = os.environ.get(
        "SECRET_KEY", "globetrotter-secret-change-in-prod"
    )

    # Register all route blueprints
    from app.auth import auth_bp
    from app.destinations import destinations_bp
    from app.recommendations import recommendations_bp
    from app.itineraries import itineraries_bp

    flask_app.register_blueprint(auth_bp)
    flask_app.register_blueprint(destinations_bp)
    flask_app.register_blueprint(recommendations_bp)
    flask_app.register_blueprint(itineraries_bp)

    return flask_app


def _load_monolith():
    """Load root app.py without conflicting with this package name."""
    path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "app.py")
    spec = importlib.util.spec_from_file_location("globetrotter_monolith", path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module.app


# gunicorn app:app (Render dashboard default / legacy start command)
app = _load_monolith()
