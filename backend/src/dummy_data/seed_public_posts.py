"""Seed public Firestore posts for a specific UniGenda user.

Run from the backend folder:

    python src/dummy_data/seed_public_posts.py --user-id TNMq53qHLgMt82ATXcYKw2zzEiv2 --count 50

This writes each post to both:
- users/{userId}/tasks/{taskId}
- public_tasks/{taskId}

so the frontend sees the same documents the app normally creates.
"""

from __future__ import annotations

import argparse
from datetime import datetime, timedelta, timezone
from pathlib import Path
import sys

from firebase_admin import firestore

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from firebase_config import db


USER_ID = "TNMq53qHLgMt82ATXcYKw2zzEiv2"


POST_BLUEPRINTS = [
    ("Study group for calculus homework", "Need a few people to compare answers and finish the problem set.", ["school", "math", "study"]),
    ("Campus coffee run", "Looking for friends to split a coffee run before class.", ["campus", "coffee", "social"]),
    ("Group project planning session", "We need to organize roles, deadlines, and deliverables.", ["school", "project", "teamwork"]),
    ("Library study sprint", "Join a focused study sprint and help keep everyone accountable.", ["study", "library", "focus"]),
    ("Weekend volunteer cleanup", "Helping with a local cleanup event and could use extra hands.", ["volunteer", "community", "weekend"]),
    ("Exam review circle", "We are reviewing notes together before the exam.", ["exam", "review", "study"]),
    ("Gym buddy search", "Want someone to hit the gym with after classes.", ["fitness", "gym", "health"]),
    ("Dorm movie night setup", "Need help picking the movie and bringing snacks.", ["dorm", "friends", "movie"]),
    ("Design critique meetup", "Feedback welcome for a class design mockup.", ["design", "feedback", "creative"]),
    ("Language practice chat", "Looking for people to practice conversation once this week.", ["language", "practice", "learning"]),
]


def build_posts(user_id: str, count: int):
    base_due_date = datetime.now(timezone.utc) + timedelta(days=7)

    for index in range(count):
        title, description, tags = POST_BLUEPRINTS[index % len(POST_BLUEPRINTS)]
        variant = index // len(POST_BLUEPRINTS) + 1
        people_needed = 2 + (index % 4)
        due_date = (base_due_date + timedelta(days=index)).date().isoformat()

        yield {
            "title": f"{title} #{variant}" if variant > 1 else title,
            "description": description,
            "dueDate": due_date,
            "userId": user_id,
            "priority": ["low", "medium", "high"][index % 3],
            "visibility": "public",
            "isPublic": True,
            "peopleNeeded": people_needed,
            "joinedUsers": [],
            "tags": tags,
            "status": "pending",
            "createdAt": firestore.SERVER_TIMESTAMP,
        }


def seed_public_posts(user_id: str, count: int, overwrite: bool) -> list[str]:
    user_ref = db.collection("users").document(user_id)
    user_ref.set({"updatedAt": firestore.SERVER_TIMESTAMP}, merge=True)

    batch = db.batch()
    task_ids: list[str] = []

    for task_data in build_posts(user_id, count):
        task_ref = user_ref.collection("tasks").document()
        task_id = task_ref.id
        task_ids.append(task_id)

        batch.set(task_ref, task_data)
        batch.set(db.collection("public_tasks").document(task_id), task_data)

    batch.commit()

    print(f"Created {len(task_ids)} public posts for {user_id}.")
    return task_ids


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Seed UniGenda public posts for a user.")
    parser.add_argument("--user-id", default=USER_ID, help="Firebase Auth UID to seed posts for.")
    parser.add_argument("--count", type=int, default=50, help="Number of public posts to create.")
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Accepted for a stable command shape; generation is always additive.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    if args.count < 1:
        raise SystemExit("--count must be at least 1")

    seed_public_posts(args.user_id, args.count, args.overwrite)


if __name__ == "__main__":
    main()