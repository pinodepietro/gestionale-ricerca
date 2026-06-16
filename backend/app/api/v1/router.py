# backend/app/api/v1/router.py
from fastapi import APIRouter
from app.api.v1.endpoints import auth, progetti, personale, sal, timesheet, config, partner, admin, notifiche, sync, proposte, erogazioni, gantt_personale, dipartimenti, autorizzazioni_spesa, rimborsi_spesa, missioni
from app.api.v1.endpoints.progetti import sub_router as wp_sub_router

api_router = APIRouter()

api_router.include_router(auth.router,      prefix="/auth",      tags=["auth"])
api_router.include_router(progetti.router,  prefix="/progetti",  tags=["progetti"])
api_router.include_router(personale.router, prefix="",           tags=["personale"])
api_router.include_router(sal.router,       prefix="",           tags=["sal"])
api_router.include_router(timesheet.router, prefix="/timesheet", tags=["timesheet"])
api_router.include_router(config.router,    prefix="",           tags=["config"])
api_router.include_router(partner.router,   prefix="",           tags=["partner"])
api_router.include_router(wp_sub_router,    prefix="",            tags=["wp"])
api_router.include_router(admin.router,      prefix="/admin",      tags=["admin"])
api_router.include_router(notifiche.router,  prefix="/notifiche",  tags=["notifiche"])
api_router.include_router(sync.router,       prefix="",            tags=["sync"])
api_router.include_router(proposte.router,   prefix="",            tags=["proposte"])
api_router.include_router(erogazioni.router,       prefix="", tags=["erogazioni"])
api_router.include_router(gantt_personale.router,      prefix="", tags=["gantt-personale"])
api_router.include_router(dipartimenti.router,         prefix="", tags=["dipartimenti"])
api_router.include_router(autorizzazioni_spesa.router, prefix="", tags=["autorizzazioni-spesa"])
api_router.include_router(rimborsi_spesa.router,       prefix="", tags=["rimborsi-spesa"])
api_router.include_router(missioni.router,             prefix="", tags=["missioni"])
