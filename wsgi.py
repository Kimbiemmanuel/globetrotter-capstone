"""
WSGI entry point for production (Render, gunicorn, etc.).

Root ``app.py`` and the ``app/`` package share the same import name, so
gunicorn cannot use ``app:app``. Load the monolith file explicitly instead.
"""
import importlib.util
import os

_MODULE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "app.py")
_SPEC = importlib.util.spec_from_file_location("globetrotter_app", _MODULE_PATH)
_MODULE = importlib.util.module_from_spec(_SPEC)
assert _SPEC.loader is not None
_SPEC.loader.exec_module(_MODULE)

app = _MODULE.app
