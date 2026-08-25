import importlib.util
import os
import unittest

from app import create_app


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

    def test_destinations_endpoint_returns_gallery_and_details(self):
        response = self.client.get("/destinations")
        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertGreater(payload["count"], 0)
        first = payload["destinations"][0]
        self.assertIn("images", first)
        self.assertTrue(first["images"])
        self.assertIn("details", first)

    def test_itinerary_creation_appears_on_profile(self):
        client = create_app().test_client()
        email = "itinerary-profile@example.com"
        register_response = client.post(
            "/register",
            json={"name": "Test User", "email": email, "password": "secret123", "preferred_tags": ["nature"]},
        )
        self.assertEqual(register_response.status_code, 201)
        token = register_response.get_json()["token"]

        destinations_response = client.get("/destinations")
        first_destination = destinations_response.get_json()["destinations"][0]

        itinerary_response = client.post(
            "/itineraries",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "title": "Weekend in Yaoundé",
                "stops": [first_destination["id"]],
                "start_date": "2026-08-10",
                "notes": "Bring a camera",
            },
        )
        self.assertEqual(itinerary_response.status_code, 201)

        profile_response = client.get(
            "/api/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(profile_response.status_code, 200)
        payload = profile_response.get_json()
        self.assertEqual(payload["itineraries"][0]["title"], "Weekend in Yaoundé")
        self.assertEqual(payload["itineraries"][0]["stops"], [first_destination["id"]])
        self.assertEqual(payload["visited"][0]["id"], first_destination["id"])


if __name__ == "__main__":
    unittest.main()
