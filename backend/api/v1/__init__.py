from fastapi import APIRouter

from backend.api.v1.routers.mpesa import router as mpesa_router
from backend.api.v1.routers import router as staff_router
from backend.api.v1.routers.storefront import router as storefront_router

router = APIRouter(prefix="/api/v1")
router.include_router(mpesa_router)
router.include_router(staff_router, prefix="/staff")
router.include_router(storefront_router)
