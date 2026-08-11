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
    """Create the Flask application used by the travel UI and APIs."""
    return _load_monolith()


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
