from fastapi import APIRouter

from backend.api.dependencies import DatabaseSession
from backend.services import mpesa as mpesa_service

router = APIRouter(prefix="/mpesa", tags=["mpesa"])


@router.post("/callback", include_in_schema=False)
def mpesa_callback(payload: dict, db: DatabaseSession) -> dict[str, str]:
    mpesa_service.handle_stk_callback(db, payload)
    db.commit()
    return {"ResultCode": "0", "ResultDesc": "Accepted"}
