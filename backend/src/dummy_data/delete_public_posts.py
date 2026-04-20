"""Delete public UniGenda posts for a specific user.

Run from the backend folder:

    python src/dummy_data/delete_public_posts.py --user-id TNMq53qHLgMt82ATXcYKw2zzEiv2

Use --dry-run first if you want to preview what will be deleted.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from firebase_config import db


DEFAULT_USER_ID = "TNMq53qHLgMt82ATXcYKw2zzEiv2"


def fetch_public_task_ids(user_id: str) -> list[str]:
    tasks_ref = db.collection("users").document(user_id).collection("tasks")
    task_docs = tasks_ref.where("userId", "==", user_id).where("isPublic", "==", True).stream()
    return [task_doc.id for task_doc in task_docs]


def delete_public_posts(user_id: str, dry_run: bool) -> list[str]:
    task_ids = fetch_public_task_ids(user_id)

    if dry_run:
        return task_ids

    batch = db.batch()
    user_tasks_ref = db.collection("users").document(user_id).collection("tasks")

    for task_id in task_ids:
        batch.delete(user_tasks_ref.document(task_id))
        batch.delete(db.collection("public_tasks").document(task_id))

    if task_ids:
        batch.commit()

    return task_ids


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Delete UniGenda public posts for a user.")
    parser.add_argument("--user-id", default=DEFAULT_USER_ID, help="Firebase Auth UID to delete posts for.")
    parser.add_argument("--dry-run", action="store_true", help="Show matching posts without deleting them.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    task_ids = delete_public_posts(args.user_id, args.dry_run)

    if args.dry_run:
        print(f"Would delete {len(task_ids)} public posts for {args.user_id}.")
    else:
        print(f"Deleted {len(task_ids)} public posts for {args.user_id}.")


if __name__ == "__main__":
    main()