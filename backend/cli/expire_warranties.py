from backend.models.database import SessionLocal
from backend.services.sales import expire_due_warranties


def main() -> None:
    with SessionLocal() as db:
        expired = expire_due_warranties(db)
        db.commit()
    print(f"Marked {expired} warranties as expired.")


if __name__ == "__main__":
    main()
