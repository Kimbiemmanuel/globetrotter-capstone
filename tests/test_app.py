import importlib.util
import os
import unittest


ROOT = os.path.dirname(os.path.dirname(__file__))
MODULE_PATH = os.path.join(ROOT, "app.py")
SPEC = importlib.util.spec_from_file_location("globetrotter_app", MODULE_PATH)
app_module = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(app_module)


class GlobeTrotterAppTests(unittest.TestCase):
    def setUp(self):
        self.client = app_module.app.test_client()

    def test_homepage_mentions_yaounde(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        html = response.get_data(as_text=True)
        self.assertIn("Yaoundé", html)

    def test_health_endpoint_reports_city(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["city"], "Yaoundé")


if __name__ == "__main__":
    unittest.main()
