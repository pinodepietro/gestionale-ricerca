# backend/app/api/v1/endpoints/progetti.py
from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.core.database import get_db
from app.core.deps import tutti_i_ruoli, solo_amministrativo
from app.models.progetto import Progetto
from app.models.partner import Partner, ProgettoPartner, TipoFinanziamento, Finanziamento
from app.models.struttura import WorkPackage, Milestone, Deliverable
from app.models.budget import VoceDiCosto, BudgetVoce
from app.models.personale import Allocazione, MonteOreAnnuale
from app.models.persona import Persona
from datetime import date
import math

router = APIRouter()
# Router separato per endpoint che non hanno prefisso /progetti
sub_router = APIRouter()

TRANSIZIONI = {
    "bozza":        {"attiva": "attivo"},
    "attivo":       {"chiudi": "chiuso"},
    "chiuso":       {"attiva": "attivo", "rendiconta": "rendicontato"},
    "rendicontato": {},
}


def pagina(items, total, page, page_size):
    return {"data": items, "meta": {"total": total, "page": page, "page_size": page_size,
            "total_pages": math.ceil(total / page_size) if page_size else 1}}


def progetto_dict(p: Progetto) -> dict:
    return {
        "id": str(p.id), "codice": p.codice, "titolo": p.titolo,
        "acronimo": p.acronimo, "descrizione": p.descrizione, "tipo": p.tipo,
        "stato": p.stato,
        "data_inizio": str(p.data_inizio) if p.data_inizio else None,
        "data_fine": str(p.data_fine) if p.data_fine else None,
        "data_fine_rendicontazione": str(p.data_fine_rendicontazione) if p.data_fine_rendicontazione else None,
        "costo_totale": float(p.costo_totale) if p.costo_totale else 0,
        "importo_finanziato": float(p.importo_finanziato) if p.importo_finanziato else 0,
        "quota_cofinanziamento": float(p.costo_totale or 0) - float(p.importo_finanziato or 0),
        "percentuale_finanziamento": round(float(p.importo_finanziato or 0) / float(p.costo_totale or 1) * 100, 2),
        "cup": p.cup, "budget_per_partner": p.budget_per_partner,
        "template_timesheet_id": str(p.template_timesheet_id) if p.template_timesheet_id else None,
        "note": p.note,
        "amministrativo_id": str(p.amministrativo_id) if p.amministrativo_id else None,
        "pi_id": str(p.pi_id) if p.pi_id else None,
    }


# ─── Progetti ────────────────────────────────────────────────────────────────

@router.get("")
def lista_progetti(
    stato: str = Query(None), tipo: str = Query(None),
    search: str = Query(None), includi_bozze: bool = Query(False),
    page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db), utente: Persona = Depends(tutti_i_ruoli),
):
    q = db.query(Progetto)
    if not includi_bozze:
        q = q.filter(Progetto.stato != "bozza")
    if stato:
        q = q.filter(Progetto.stato == stato)
    if tipo:
        q = q.filter(Progetto.tipo == tipo)
    if search:
        q = q.filter(or_(Progetto.codice.ilike(f"%{search}%"),
                         Progetto.titolo.ilike(f"%{search}%"),
                         Progetto.acronimo.ilike(f"%{search}%")))
    # Amministrativo vede solo i progetti assegnati a lui
    if utente.ruolo == "amministrativo":
        q = q.filter(Progetto.amministrativo_id == utente.id)
    total = q.count()
    items = q.order_by(Progetto.codice).offset((page - 1) * page_size).limit(page_size).all()
    return pagina([progetto_dict(p) for p in items], total, page, page_size)


@router.get("/bozze")
def lista_bozze(
    db: Session = Depends(get_db), utente: Persona = Depends(tutti_i_ruoli),
):
    q = db.query(Progetto).filter(Progetto.stato == "bozza")
    # Amministrativo vede solo i progetti assegnati a lui
    if utente.ruolo == "amministrativo":
        q = q.filter(Progetto.amministrativo_id == utente.id)
    items = q.order_by(Progetto.codice).all()
    return {"data": [progetto_dict(p) for p in items]}



# ─── Dashboard / Cruscotto globale ───────────────────────────────────────────

@router.get("/cruscotto")
def cruscotto_globale(
    db: Session = Depends(get_db),
    utente: Persona = Depends(tutti_i_ruoli),
):
    from app.models.budget import Spesa, BudgetVoce
    from app.models.personale import Allocazione
    from app.models.budget import Sal
    from app.models.timesheet import TimesheetTestata
    from datetime import date, timedelta
    from sqlalchemy import func

    # Progetti a cui l'utente partecipa (tramite allocazioni) o tutti se admin/management
    if utente.ruolo == "management":
        progetti_ids = [str(p.id) for p in db.query(Progetto).filter(Progetto.stato == "attivo").all()]
    elif utente.ruolo == "amministrativo":
        progetti_ids = [str(p.id) for p in db.query(Progetto).filter(
            Progetto.stato == "attivo",
            Progetto.amministrativo_id == utente.id
        ).all()]
    else:
        allocazioni = db.query(Allocazione).filter(Allocazione.persona_id == utente.id).all()
        progetti_ids = list({str(a.progetto_id) for a in allocazioni})

    if not progetti_ids:
        return {"data": {
            "progetti_attivi": 0,
            "budget_previsto": 0,
            "budget_rendicontato": 0,
            "percentuale_budget": 0,
            "spese_totali": 0,
            "timesheet_pendenti": 0,
            "sal_in_scadenza": 0,
            "progetti": [],
        }}

    progetti = db.query(Progetto).filter(
        Progetto.id.in_(progetti_ids),
        Progetto.stato == "attivo",
    ).all()

    # KPI globali
    budget_previsto = db.query(func.sum(BudgetVoce.importo_previsto)).filter(
        BudgetVoce.progetto_id.in_(progetti_ids)
    ).scalar() or 0

    budget_rendicontato = db.query(func.sum(BudgetVoce.importo_rendicontato)).filter(
        BudgetVoce.progetto_id.in_(progetti_ids)
    ).scalar() or 0

    spese_totali = db.query(func.sum(Spesa.importo)).filter(
        Spesa.progetto_id.in_(progetti_ids),
        Spesa.stato == "registrata",
    ).scalar() or 0

    # Spese per progetto (escluso personale — quello viene dai timesheet)
    from app.models.budget import VoceDiCosto as VDC
    voci_personale_ids = [
        str(v.id) for v in db.query(VDC).filter(VDC.categoria.in_(["personale", "overhead"])).all()
    ]

    timesheet_pendenti = db.query(TimesheetTestata).filter(
        TimesheetTestata.progetto_id.in_(progetti_ids),
        TimesheetTestata.stato == "inviato",
    ).count()

    oggi = date.today()
    tra_30_giorni = oggi + timedelta(days=30)
    sal_in_scadenza = db.query(Sal).filter(
        Sal.progetto_id.in_(progetti_ids),
        Sal.stato.in_(["aperto", "chiuso"]),
        Sal.data_scadenza_rendiconto != None,
        Sal.data_scadenza_rendiconto <= tra_30_giorni,
        Sal.data_scadenza_rendiconto >= oggi,
    ).count()

    # Dettaglio per progetto
    progetti_detail = []
    for p in progetti:
        bv_rows = db.query(BudgetVoce).filter(BudgetVoce.progetto_id == p.id).all()
        prev = sum(float(b.importo_previsto or 0) for b in bv_rows)
        rend = sum(float(b.importo_rendicontato or 0) for b in bv_rows)

        # Percentuale tempo trascorso
        if p.data_inizio and p.data_fine:
            durata_totale = (p.data_fine - p.data_inizio).days
            trascorso = (oggi - p.data_inizio).days
            pct_tempo = min(100, max(0, round(trascorso / durata_totale * 100, 1))) if durata_totale > 0 else 0
        else:
            pct_tempo = 0

        progetti_detail.append({
            "id": str(p.id),
            "codice": p.codice,
            "acronimo": p.acronimo or p.codice,
            "titolo": p.titolo,
            "tipo": p.tipo,
            "data_inizio": str(p.data_inizio) if p.data_inizio else None,
            "data_fine": str(p.data_fine) if p.data_fine else None,
            "budget_previsto": prev,
            "budget_rendicontato": rend,
            "percentuale_budget": round(rend / prev * 100, 1) if prev > 0 else 0,
            "percentuale_tempo": pct_tempo,
            "importo_finanziato": float(p.importo_finanziato) if p.importo_finanziato else 0,
            "costo_totale": float(p.costo_totale) if p.costo_totale else 0,
            "budget_allocato_voci": float(
                db.query(func.sum(BudgetVoce.importo_previsto)).filter(
                    BudgetVoce.progetto_id == p.id
                ).scalar() or 0
            ),
            "spese_documentate": float(
                db.query(func.sum(Spesa.importo)).filter(
                    Spesa.progetto_id == p.id,
                    Spesa.stato == "registrata",
                    Spesa.voce_id.notin_(voci_personale_ids) if voci_personale_ids else True,
                ).scalar() or 0
            ),
            "budget_spese_ammissibili": float(
                db.query(func.sum(BudgetVoce.importo_previsto)).join(
                    VoceDiCosto, BudgetVoce.voce_id == VoceDiCosto.id
                ).filter(
                    BudgetVoce.progetto_id == p.id,
                    VoceDiCosto.categoria.notin_(["personale", "overhead"]),
                ).scalar() or 0
            ),
        })

    return {"data": {
        "progetti_attivi": len(progetti),
        "budget_previsto": float(budget_previsto),
        "budget_rendicontato": float(budget_rendicontato),
        "percentuale_budget": round(float(budget_rendicontato) / float(budget_previsto) * 100, 1) if budget_previsto > 0 else 0,
        "spese_totali": float(spese_totali),
        "timesheet_pendenti": timesheet_pendenti,
        "sal_in_scadenza": sal_in_scadenza,
        "progetti": progetti_detail,
    }}


@router.get("/{id}")
def get_progetto(id: str, db: Session = Depends(get_db), utente: Persona = Depends(tutti_i_ruoli)):
    return {"data": progetto_dict(_get_or_404(id, db))}


@router.post("")
def crea_progetto(body: dict, db: Session = Depends(get_db), utente: Persona = Depends(solo_amministrativo)):
    campi = {k: v for k, v in body.items() if hasattr(Progetto, k)}
    p = Progetto(**campi)
    p.stato = "bozza"
    db.add(p)
    db.commit()
    db.refresh(p)
    return {"data": progetto_dict(p)}


@router.patch("/{id}")
def aggiorna_progetto(id: str, body: dict, db: Session = Depends(get_db), utente: Persona = Depends(solo_amministrativo)):
    p = _get_or_404(id, db)
    for k, v in body.items():
        if hasattr(Progetto, k) and k not in ("id", "stato"):
            setattr(p, k, v)
    db.commit()
    db.refresh(p)
    return {"data": progetto_dict(p)}


@router.post("/{id}/attiva")
def attiva(id: str, db: Session = Depends(get_db), utente: Persona = Depends(solo_amministrativo)):
    return _transizione(id, "attiva", db)


@router.post("/{id}/chiudi")
def chiudi(id: str, db: Session = Depends(get_db), utente: Persona = Depends(solo_amministrativo)):
    return _transizione(id, "chiudi", db)


# ─── Partner del progetto ─────────────────────────────────────────────────────

@router.get("/{id}/partner")
def lista_partner_progetto(id: str, db: Session = Depends(get_db), utente: Persona = Depends(tutti_i_ruoli)):
    _get_or_404(id, db)
    pp = db.query(ProgettoPartner).filter(ProgettoPartner.progetto_id == id).all()
    return {"data": [{"id": str(x.id), "progetto_id": str(x.progetto_id),
                      "partner_id": str(x.partner_id), "ruolo": x.ruolo,
                      "budget_assegnato": float(x.budget_assegnato) if x.budget_assegnato else None,
                      "partner": {"id": str(x.partner.id), "nome": x.partner.nome} if x.partner else None}
                     for x in pp]}


@router.post("/{id}/partner")
def aggiungi_partner(id: str, body: dict, db: Session = Depends(get_db), utente: Persona = Depends(solo_amministrativo)):
    _get_or_404(id, db)
    pp = ProgettoPartner(progetto_id=id, partner_id=body["partner_id"],
                         ruolo=body.get("ruolo", "partner"),
                         budget_assegnato=body.get("budget_assegnato"))
    db.add(pp)
    db.commit()
    db.refresh(pp)
    return {"data": {"id": str(pp.id), "partner_id": str(pp.partner_id), "ruolo": pp.ruolo}}


@router.delete("/{id}/partner/{pp_id}")
def rimuovi_partner(id: str, pp_id: str, db: Session = Depends(get_db), utente: Persona = Depends(solo_amministrativo)):
    pp = db.query(ProgettoPartner).filter(ProgettoPartner.id == pp_id, ProgettoPartner.progetto_id == id).first()
    if not pp:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Partner non trovato"}})
    db.delete(pp)
    db.commit()
    return {"data": {"deleted": True}}


# ─── Budget voci ──────────────────────────────────────────────────────────────

@router.get("/{id}/budget")
def lista_budget(id: str, db: Session = Depends(get_db), utente: Persona = Depends(tutti_i_ruoli)):
    _get_or_404(id, db)
    voci = db.query(BudgetVoce).filter(BudgetVoce.progetto_id == id).all()
    return {"data": [{"id": str(v.id), "progetto_id": str(v.progetto_id),
                      "voce_id": str(v.voce_id),
                      "voce": {"codice": v.voce.codice, "descrizione": v.voce.descrizione, "categoria": v.voce.categoria} if v.voce else None,
                      "importo_previsto": float(v.importo_previsto),
                      "importo_rendicontato": float(v.importo_rendicontato),
                      "importo_residuo": float(v.importo_previsto) - float(v.importo_rendicontato),
                      "percentuale_utilizzata": round(float(v.importo_rendicontato) / float(v.importo_previsto) * 100, 2)
                                                if float(v.importo_previsto) > 0 else 0}
                     for v in voci]}


@router.post("/{id}/budget")
def salva_budget(id: str, body: dict, db: Session = Depends(get_db), utente: Persona = Depends(solo_amministrativo)):
    p = _get_or_404(id, db)
    # Controlla che il totale budget non superi il costo totale del progetto
    totale_voci = sum(float(v.get("importo_previsto", 0)) for v in body.get("voci", []))
    if totale_voci > float(p.costo_totale):
        raise HTTPException(
            status_code=422,
            detail={"error": {
                "code": "BUDGET_SUPERA_COSTO_TOTALE",
                "message": f"Il totale delle voci ({totale_voci:,.2f}€) supera il costo totale del progetto ({float(p.costo_totale):,.2f}€)",
                "detail": {"totale_voci": totale_voci, "costo_totale": float(p.costo_totale)},
            }},
        )
    voci_ids = [v["voce_id"] for v in body.get("voci", [])]
    # Cancella le voci rimosse
    db.query(BudgetVoce).filter(
        BudgetVoce.progetto_id == id,
        BudgetVoce.voce_id.notin_(voci_ids)
    ).delete(synchronize_session=False)
    # Aggiorna o crea le voci presenti
    for voce_data in body.get("voci", []):
        existing = db.query(BudgetVoce).filter(
            BudgetVoce.progetto_id == id,
            BudgetVoce.voce_id == voce_data["voce_id"]
        ).first()
        if existing:
            existing.importo_previsto = voce_data["importo_previsto"]
        else:
            bv = BudgetVoce(progetto_id=id, voce_id=voce_data["voce_id"],
                            importo_previsto=voce_data["importo_previsto"],
                            importo_rendicontato=0)
            db.add(bv)
    db.commit()
    return {"data": {"saved": True}}


# ─── Work Package ─────────────────────────────────────────────────────────────

@router.get("/{id}/wp")
def lista_wp(id: str, db: Session = Depends(get_db), utente: Persona = Depends(tutti_i_ruoli)):
    _get_or_404(id, db)
    wps = db.query(WorkPackage).filter(WorkPackage.progetto_id == id).order_by(WorkPackage.codice).all()
    return {"data": [{"id": str(w.id), "progetto_id": str(w.progetto_id),
                      "codice": w.codice, "titolo": w.titolo, "descrizione": w.descrizione,
                      "data_inizio": str(w.data_inizio), "data_fine": str(w.data_fine),
                      "stato": w.stato, "responsabile_id": str(w.responsabile_id) if w.responsabile_id else None}
                     for w in wps]}


@router.post("/{id}/wp")
def crea_wp(id: str, body: dict, db: Session = Depends(get_db), utente: Persona = Depends(solo_amministrativo)):
    p = _get_or_404(id, db)
    data_inizio = date.fromisoformat(body["data_inizio"])
    data_fine = date.fromisoformat(body["data_fine"])
    _valida_date_nel_progetto(p, data_inizio, data_fine, "Work Package")
    wp = WorkPackage(progetto_id=id, codice=body["codice"], titolo=body["titolo"],
                     descrizione=body.get("descrizione"),
                     data_inizio=data_inizio,
                     data_fine=data_fine,
                     stato=body.get("stato", "pianificato"),
                     responsabile_id=body.get("responsabile_id"))
    db.add(wp)
    db.commit()
    db.refresh(wp)
    return {"data": {"id": str(wp.id), "codice": wp.codice, "titolo": wp.titolo}}


@sub_router.patch("/wp/{wp_id}")
def aggiorna_wp(wp_id: str, body: dict, db: Session = Depends(get_db), utente: Persona = Depends(solo_amministrativo)):
    wp = db.query(WorkPackage).filter(WorkPackage.id == wp_id).first()
    if not wp:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "WP non trovato"}})
    
    # Validazione date se vengono modificate
    data_inizio = date.fromisoformat(body["data_inizio"]) if "data_inizio" in body else wp.data_inizio
    data_fine = date.fromisoformat(body["data_fine"]) if "data_fine" in body else wp.data_fine
    progetto = db.query(Progetto).filter(Progetto.id == wp.progetto_id).first()
    if progetto:
        _valida_date_nel_progetto(progetto, data_inizio, data_fine, "Work Package")
    
    for k, v in body.items():
        if hasattr(WorkPackage, k) and k != "id":
            setattr(wp, k, v)
    db.commit()
    db.refresh(wp)
    return {"data": {"id": str(wp.id), "codice": wp.codice}}


@sub_router.delete("/wp/{wp_id}")
def elimina_wp(wp_id: str, db: Session = Depends(get_db), utente: Persona = Depends(solo_amministrativo)):
    wp = db.query(WorkPackage).filter(WorkPackage.id == wp_id).first()
    if not wp:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "WP non trovato"}})
    db.delete(wp)
    db.commit()
    return {"data": {"deleted": True}}


# ─── Allocazioni ─────────────────────────────────────────────────────────────

@router.get("/{id}/allocazioni")
def lista_allocazioni(id: str, db: Session = Depends(get_db), utente: Persona = Depends(tutti_i_ruoli)):
    _get_or_404(id, db)
    from app.models.persona import Persona as PersonaModel
    alloc = db.query(Allocazione).join(PersonaModel, Allocazione.persona_id == PersonaModel.id).filter(Allocazione.progetto_id == id).order_by(PersonaModel.cognome, PersonaModel.nome).all()
    return {"data": [{"id": str(a.id), "persona_id": str(a.persona_id),
                      "progetto_id": str(a.progetto_id),
                      "ore_assegnate": float(a.ore_assegnate),
                      "data_inizio": str(a.data_inizio), "data_fine": str(a.data_fine),
                      "note": a.note,
                      "is_pi": bool(a.is_pi),
                      "persona": {"nome": a.persona.nome, "cognome": a.persona.cognome} if a.persona else None}
                     for a in alloc]}


@router.post("/{id}/allocazioni")
def crea_allocazione(id: str, body: dict, db: Session = Depends(get_db), utente: Persona = Depends(solo_amministrativo)):
    p = _get_or_404(id, db)
    data_inizio = date.fromisoformat(body["data_inizio"])
    data_fine = date.fromisoformat(body["data_fine"])
    _valida_date_nel_progetto(p, data_inizio, data_fine, "Allocazione personale")
    anno = data_inizio.year

    # Controlla disponibilità monte ore
    monte = db.query(MonteOreAnnuale).filter(
        MonteOreAnnuale.persona_id == body["persona_id"],
        MonteOreAnnuale.anno == anno,
    ).first()

    if monte:
        ore_residue = float(monte.ore_disponibili) - float(monte.ore_allocate)
        if float(body["ore_assegnate"]) > ore_residue:
            raise HTTPException(
                status_code=422,
                detail={"error": {"code": "MONTE_ORE_INSUFFICIENTE",
                                  "message": f"Ore residue disponibili: {ore_residue}h",
                                  "detail": {"ore_residue": ore_residue}}},
            )
        monte.ore_allocate = float(monte.ore_allocate) + float(body["ore_assegnate"])

    # Controlla se la persona è già allocata sul progetto
    esistente = db.query(Allocazione).filter(
        Allocazione.progetto_id == id,
        Allocazione.persona_id == body["persona_id"],
    ).first()
    if esistente:
        raise HTTPException(status_code=409, detail={"error": {
            "code": "PERSONA_GIA_ALLOCATA",
            "message": "Questa persona è già allocata su questo progetto. Modifica l'allocazione esistente."
        }})

    # Se is_pi=True, rimuovi il ruolo PI da eventuali allocazioni precedenti
    if body.get("is_pi"):
        db.query(Allocazione).filter(
            Allocazione.progetto_id == id,
            Allocazione.is_pi == True
        ).update({"is_pi": False})

    a = Allocazione(progetto_id=id, persona_id=body["persona_id"],
                    ore_assegnate=body["ore_assegnate"],
                    data_inizio=date.fromisoformat(body["data_inizio"]),
                    data_fine=date.fromisoformat(body["data_fine"]),
                    note=body.get("note"),
                    is_pi=bool(body.get("is_pi", False)))
    db.add(a)
    db.commit()
    db.refresh(a)
    return {"data": {"id": str(a.id), "ore_assegnate": float(a.ore_assegnate)}}


@sub_router.patch("/progetti/{id}/allocazioni/{alloc_id}")
def aggiorna_allocazione(id: str, alloc_id: str, body: dict, db: Session = Depends(get_db), utente: Persona = Depends(solo_amministrativo)):
    a = db.query(Allocazione).filter(Allocazione.id == alloc_id, Allocazione.progetto_id == id).first()
    if not a:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Allocazione non trovata"}})

    # Validazione date se modificate
    p = _get_or_404(id, db)
    data_inizio = date.fromisoformat(body["data_inizio"]) if "data_inizio" in body else a.data_inizio
    data_fine = date.fromisoformat(body["data_fine"]) if "data_fine" in body else a.data_fine
    _valida_date_nel_progetto(p, data_inizio, data_fine, "Allocazione personale")

    # Aggiorna monte ore se cambiano le ore assegnate
    if "ore_assegnate" in body and float(body["ore_assegnate"]) != float(a.ore_assegnate):
        anno = data_inizio.year
        monte = db.query(MonteOreAnnuale).filter(
            MonteOreAnnuale.persona_id == a.persona_id,
            MonteOreAnnuale.anno == anno,
        ).first()
        if monte:
            differenza = float(body["ore_assegnate"]) - float(a.ore_assegnate)
            if differenza > 0:
                ore_residue = float(monte.ore_disponibili) - float(monte.ore_allocate)
                if differenza > ore_residue:
                    raise HTTPException(
                        status_code=422,
                        detail={"error": {"code": "MONTE_ORE_INSUFFICIENTE",
                                          "message": f"Ore residue disponibili: {ore_residue}h"}},
                    )
            monte.ore_allocate = max(0, float(monte.ore_allocate) + differenza)

    # Se is_pi=True, rimuovi PI da tutte le altre allocazioni del progetto
    if body.get("is_pi"):
        db.query(Allocazione).filter(
            Allocazione.progetto_id == id,
            Allocazione.is_pi == True,
            Allocazione.id != alloc_id,
        ).update({"is_pi": False})

    for k, v in body.items():
        if hasattr(Allocazione, k) and k not in ("id", "persona_id", "progetto_id"):
            setattr(a, k, v)
    db.commit()
    db.refresh(a)
    return {"data": {"id": str(a.id), "ore_assegnate": float(a.ore_assegnate)}}


@sub_router.delete("/progetti/{id}/allocazioni/{alloc_id}")
def elimina_allocazione(id: str, alloc_id: str, db: Session = Depends(get_db), utente: Persona = Depends(solo_amministrativo)):
    a = db.query(Allocazione).filter(Allocazione.id == alloc_id, Allocazione.progetto_id == id).first()
    if not a:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Allocazione non trovata"}})
    # Aggiorna monte ore
    anno = a.data_inizio.year
    monte = db.query(MonteOreAnnuale).filter(
        MonteOreAnnuale.persona_id == a.persona_id,
        MonteOreAnnuale.anno == anno,
    ).first()
    if monte:
        monte.ore_allocate = max(0, float(monte.ore_allocate) - float(a.ore_assegnate))
    db.delete(a)
    db.commit()
    return {"data": {"deleted": True}}


# ─── Helper ───────────────────────────────────────────────────────────────────

def _get_or_404(id: str, db: Session) -> Progetto:
    p = db.query(Progetto).filter(Progetto.id == id).first()
    if not p:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Progetto non trovato"}})
    return p


def _transizione(id: str, azione: str, db: Session):
    p = _get_or_404(id, db)
    nuovo_stato = TRANSIZIONI.get(p.stato, {}).get(azione)
    if not nuovo_stato:
        raise HTTPException(status_code=409,
                            detail={"error": {"code": "TRANSIZIONE_NON_VALIDA",
                                              "message": f"Impossibile '{azione}' da stato '{p.stato}'"}})
    p.stato = nuovo_stato
    db.commit()
    db.refresh(p)
    return {"data": progetto_dict(p)}


# ─── Validazioni helper ───────────────────────────────────────────────────────

def _valida_date_nel_progetto(progetto: Progetto, data_inizio: date, data_fine: date, entita: str):
    """Verifica che le date siano comprese nel periodo del progetto."""
    if data_inizio < progetto.data_inizio:
        raise HTTPException(
            status_code=422,
            detail={"error": {"code": "DATE_FUORI_PROGETTO",
                               "message": f"{entita}: la data di inizio ({data_inizio}) è precedente all'inizio del progetto ({progetto.data_inizio})"}},
        )
    if data_fine > progetto.data_fine:
        raise HTTPException(
            status_code=422,
            detail={"error": {"code": "DATE_FUORI_PROGETTO",
                               "message": f"{entita}: la data di fine ({data_fine}) è successiva alla fine del progetto ({progetto.data_fine})"}},
        )
    if data_inizio > data_fine:
        raise HTTPException(
            status_code=422,
            detail={"error": {"code": "DATE_NON_VALIDE",
                               "message": f"{entita}: la data di inizio deve essere precedente alla data di fine"}},
        )


# ─── Spese ────────────────────────────────────────────────────────────────────

@router.get("/{id}/spese")
def lista_spese(
    id: str,
    voce_id: str = Query(None),
    sal_id: str = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    utente: Persona = Depends(tutti_i_ruoli),
):
    from app.models.budget import Spesa, VoceDiCosto
    _get_or_404(id, db)
    q = db.query(Spesa).filter(Spesa.progetto_id == id)
    if voce_id:
        q = q.filter(Spesa.voce_id == voce_id)
    if sal_id:
        q = q.filter(Spesa.sal_id == sal_id)
    q = q.order_by(Spesa.data.desc())
    total = q.count()
    items = q.offset((page - 1) * page_size).limit(page_size).all()
    return {
        "data": [_spesa_dict(s) for s in items],
        "meta": {"total": total, "page": page, "page_size": page_size,
                 "total_pages": max(1, (total + page_size - 1) // page_size)},
    }


@router.post("/{id}/spese")
def registra_spesa(
    id: str,
    body: dict,
    db: Session = Depends(get_db),
    utente: Persona = Depends(tutti_i_ruoli),
):
    if utente.ruolo not in ("amministrativo", "pi"):
        raise HTTPException(status_code=403, detail={"error": {
            "code": "FORBIDDEN", "message": "Solo amministrativi e PI possono registrare spese"}})
    from app.models.budget import Spesa, BudgetVoce
    import uuid as _uuid
    p = _get_or_404(id, db)
    spesa = Spesa(
        id=_uuid.uuid4(),
        progetto_id=id,
        voce_id=body.get("voce_id"),
        persona_id=body.get("persona_id"),
        sal_id=body.get("sal_id"),
        spesa_origine_id=body.get("spesa_origine_id"),
        importo=body.get("importo", 0),
        data=body.get("data"),
        numero_documento=body.get("numero_documento"),
        descrizione=body.get("descrizione"),
        stato="registrata",
    )
    db.add(spesa)
    # Aggiorna importo_rendicontato sulla voce di budget
    bv = db.query(BudgetVoce).filter(
        BudgetVoce.progetto_id == id,
        BudgetVoce.voce_id == spesa.voce_id,
    ).first()
    if bv:
        bv.importo_rendicontato = float(bv.importo_rendicontato or 0) + float(spesa.importo)
    db.commit()
    db.refresh(spesa)
    return {"data": _spesa_dict(spesa)}


@router.post("/spese/{id}/annulla")
def annulla_spesa(
    id: str,
    db: Session = Depends(get_db),
    utente: Persona = Depends(solo_amministrativo),
):
    from app.models.budget import Spesa, BudgetVoce
    spesa = db.query(Spesa).filter(Spesa.id == id).first()
    if not spesa:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Spesa non trovata"}})
    if spesa.stato == "annullata":
        raise HTTPException(status_code=409, detail={"error": {"code": "GIA_ANNULLATA", "message": "Spesa già annullata"}})
    # Storna importo_rendicontato
    bv = db.query(BudgetVoce).filter(
        BudgetVoce.progetto_id == spesa.progetto_id,
        BudgetVoce.voce_id == spesa.voce_id,
    ).first()
    if bv:
        bv.importo_rendicontato = max(0, float(bv.importo_rendicontato or 0) - float(spesa.importo))
    spesa.stato = "annullata"
    db.commit()
    db.refresh(spesa)
    return {"data": _spesa_dict(spesa)}


@router.post("/spese/{id}/allegato")
def upload_allegato(
    id: str,
    db: Session = Depends(get_db),
    utente: Persona = Depends(tutti_i_ruoli),
):
    from app.models.budget import Spesa
    spesa = db.query(Spesa).filter(Spesa.id == id).first()
    if not spesa:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Spesa non trovata"}})
    return {"data": {"allegato_path": None, "message": "Upload non ancora implementato"}}


def _spesa_dict(s) -> dict:
    from app.models.budget import VoceDiCosto
    return {
        "id": str(s.id),
        "progetto_id": str(s.progetto_id),
        "voce_id": str(s.voce_id) if s.voce_id else None,
        "persona_id": str(s.persona_id) if s.persona_id else None,
        "sal_id": str(s.sal_id) if s.sal_id else None,
        "spesa_origine_id": str(s.spesa_origine_id) if s.spesa_origine_id else None,
        "importo": float(s.importo),
        "data": str(s.data) if s.data else None,
        "numero_documento": s.numero_documento,
        "descrizione": s.descrizione,
        "stato": s.stato,
        "allegato_path": s.allegato_path,
    }


# ─── Documenti ────────────────────────────────────────────────────────────────

@router.get("/{id}/documenti")
def lista_documenti(
    id: str,
    db: Session = Depends(get_db),
    utente: Persona = Depends(tutti_i_ruoli),
):
    from app.models.documento import DocumentoProgetto
    _get_or_404(id, db)
    docs = db.query(DocumentoProgetto).filter(
        DocumentoProgetto.progetto_id == id
    ).order_by(DocumentoProgetto.uploaded_at.desc()).all()
    return {"data": [_doc_dict(d) for d in docs]}


@router.post("/{id}/documenti")
async def upload_documento(
    id: str,
    file: UploadFile = File(...),
    tipo_documento: str = "altro",
    versione: str = None,
    descrizione: str = None,
    db: Session = Depends(get_db),
    utente: Persona = Depends(tutti_i_ruoli),
):
    if utente.ruolo not in ("amministrativo", "pi"):
        raise HTTPException(status_code=403, detail={"error": {
            "code": "FORBIDDEN", "message": "Solo amministrativi e PI possono caricare documenti"}})
    from app.models.documento import DocumentoProgetto
    import os, uuid as _uuid
    _get_or_404(id, db)

    upload_dir = f"/app/uploads/documenti/{id}"
    os.makedirs(upload_dir, exist_ok=True)

    doc_id = _uuid.uuid4()
    ext = os.path.splitext(file.filename)[1] if file.filename else ""
    dest = f"{upload_dir}/{doc_id}{ext}"

    content_bytes = await file.read()
    with open(dest, "wb") as f_out:
        f_out.write(content_bytes)

    doc = DocumentoProgetto(
        id=doc_id,
        progetto_id=id,
        tipo_documento=tipo_documento,
        nome_file=file.filename or f"{doc_id}{ext}",
        path_file=dest,
        versione=versione,
        descrizione=descrizione,
        uploaded_by=utente.id,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return {"data": _doc_dict(doc)}


@router.delete("/documenti/{doc_id}")
def elimina_documento(
    doc_id: str,
    db: Session = Depends(get_db),
    utente: Persona = Depends(tutti_i_ruoli),
):
    from app.models.documento import DocumentoProgetto
    import os
    doc = db.query(DocumentoProgetto).filter(DocumentoProgetto.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Documento non trovato"}})
    if os.path.exists(doc.path_file):
        os.remove(doc.path_file)
    db.delete(doc)
    db.commit()
    return {"data": {"deleted": True}}


@router.get("/documenti/{doc_id}/download")
def download_documento(
    doc_id: str,
    db: Session = Depends(get_db),
    utente: Persona = Depends(tutti_i_ruoli),
):
    from app.models.documento import DocumentoProgetto
    from fastapi.responses import FileResponse
    import os
    doc = db.query(DocumentoProgetto).filter(DocumentoProgetto.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Documento non trovato"}})
    if not os.path.exists(doc.path_file):
        raise HTTPException(status_code=404, detail={"error": {"code": "FILE_NON_TROVATO", "message": "File non trovato sul server"}})
    return FileResponse(doc.path_file, filename=doc.nome_file)


def _doc_dict(d) -> dict:
    return {
        "id": str(d.id),
        "progetto_id": str(d.progetto_id),
        "tipo_documento": d.tipo_documento,
        "nome_file": d.nome_file,
        "versione": d.versione,
        "descrizione": d.descrizione,
        "uploaded_at": d.uploaded_at.isoformat() if d.uploaded_at else None,
        "uploaded_by": str(d.uploaded_by) if d.uploaded_by else None,
    }


@router.delete("/{id}")
def elimina_progetto(
    id: str,
    db: Session = Depends(get_db),
    utente: Persona = Depends(solo_amministrativo),
):
    from app.models.partner import ProgettoPartner
    from app.models.struttura import WorkPackage
    from app.models.personale import Allocazione
    from app.models.budget import BudgetVoce, Spesa, Sal
    from app.models.documento import DocumentoProgetto
    from app.models.timesheet import TimesheetTestata

    p = _get_or_404(id, db)
    if p.stato != "bozza":
        raise HTTPException(status_code=409, detail={"error": {
            "code": "PROGETTO_NON_ELIMINABILE",
            "message": "Solo i progetti in stato bozza possono essere eliminati"
        }})

    # Elimina manualmente tutte le righe correlate
    db.query(ProgettoPartner).filter(ProgettoPartner.progetto_id == p.id).delete()
    db.query(Allocazione).filter(Allocazione.progetto_id == p.id).delete()
    db.query(BudgetVoce).filter(BudgetVoce.progetto_id == p.id).delete()
    db.query(Spesa).filter(Spesa.progetto_id == p.id).delete()
    db.query(Sal).filter(Sal.progetto_id == p.id).delete()
    db.query(DocumentoProgetto).filter(DocumentoProgetto.progetto_id == p.id).delete()

    # WP prima dei timesheet (i timesheet referenziano i WP)
    wp_ids = [str(w.id) for w in db.query(WorkPackage).filter(WorkPackage.progetto_id == p.id).all()]
    db.query(WorkPackage).filter(WorkPackage.progetto_id == p.id).delete()

    db.query(TimesheetTestata).filter(TimesheetTestata.progetto_id == p.id).delete()

    db.delete(p)
    db.commit()
    return {"data": {"deleted": True}}


# ─── Milestone ────────────────────────────────────────────────────────────────

@router.get("/{id}/milestone")
def lista_milestone(id: str, db: Session = Depends(get_db), utente: Persona = Depends(tutti_i_ruoli)):
    from app.models.struttura import Milestone
    _get_or_404(id, db)
    items = db.query(Milestone).filter(Milestone.progetto_id == id).order_by(Milestone.data_prevista).all()
    return {"data": [_milestone_dict(m) for m in items]}

@router.post("/{id}/milestone")
def crea_milestone(id: str, body: dict, db: Session = Depends(get_db), utente: Persona = Depends(solo_amministrativo)):
    from app.models.struttura import Milestone
    import uuid as _uuid
    _get_or_404(id, db)
    m = Milestone(id=_uuid.uuid4(), progetto_id=id, **{k: v for k, v in body.items() if k != 'progetto_id' and hasattr(Milestone, k)})
    db.add(m); db.commit(); db.refresh(m)
    return {"data": _milestone_dict(m)}

@router.patch("/{id}/milestone/{ms_id}")
def aggiorna_milestone(id: str, ms_id: str, body: dict, db: Session = Depends(get_db), utente: Persona = Depends(solo_amministrativo)):
    from app.models.struttura import Milestone
    m = db.query(Milestone).filter(Milestone.id == ms_id, Milestone.progetto_id == id).first()
    if not m: raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Milestone non trovata"}})
    for k, v in body.items():
        if hasattr(Milestone, k) and k not in ('id', 'progetto_id'): setattr(m, k, v)
    db.commit(); db.refresh(m)
    return {"data": _milestone_dict(m)}

@router.delete("/{id}/milestone/{ms_id}")
def elimina_milestone(id: str, ms_id: str, db: Session = Depends(get_db), utente: Persona = Depends(solo_amministrativo)):
    from app.models.struttura import Milestone
    m = db.query(Milestone).filter(Milestone.id == ms_id, Milestone.progetto_id == id).first()
    if not m: raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Milestone non trovata"}})
    db.delete(m); db.commit()
    return {"data": {"deleted": True}}

def _milestone_dict(m) -> dict:
    return {"id": str(m.id), "progetto_id": str(m.progetto_id), "wp_id": str(m.wp_id) if m.wp_id else None,
            "codice": m.codice, "titolo": m.titolo, "data_prevista": str(m.data_prevista) if m.data_prevista else None,
            "data_effettiva": str(m.data_effettiva) if m.data_effettiva else None, "stato": m.stato}


# ─── Deliverable ──────────────────────────────────────────────────────────────

@router.get("/{id}/deliverable")
def lista_deliverable(id: str, db: Session = Depends(get_db), utente: Persona = Depends(tutti_i_ruoli)):
    from app.models.struttura import Deliverable
    _get_or_404(id, db)
    items = db.query(Deliverable).filter(Deliverable.progetto_id == id).order_by(Deliverable.data_scadenza).all()
    return {"data": [_deliverable_dict(d) for d in items]}

@router.post("/{id}/deliverable")
def crea_deliverable(id: str, body: dict, db: Session = Depends(get_db), utente: Persona = Depends(solo_amministrativo)):
    from app.models.struttura import Deliverable
    import uuid as _uuid
    _get_or_404(id, db)
    d = Deliverable(id=_uuid.uuid4(), progetto_id=id, **{k: v for k, v in body.items() if k != 'progetto_id' and hasattr(Deliverable, k)})
    db.add(d); db.commit(); db.refresh(d)
    return {"data": _deliverable_dict(d)}

@router.patch("/{id}/deliverable/{del_id}")
def aggiorna_deliverable(id: str, del_id: str, body: dict, db: Session = Depends(get_db), utente: Persona = Depends(solo_amministrativo)):
    from app.models.struttura import Deliverable
    d = db.query(Deliverable).filter(Deliverable.id == del_id, Deliverable.progetto_id == id).first()
    if not d: raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Deliverable non trovato"}})
    for k, v in body.items():
        if hasattr(Deliverable, k) and k not in ('id', 'progetto_id'): setattr(d, k, v)
    db.commit(); db.refresh(d)
    return {"data": _deliverable_dict(d)}

@router.delete("/{id}/deliverable/{del_id}")
def elimina_deliverable(id: str, del_id: str, db: Session = Depends(get_db), utente: Persona = Depends(solo_amministrativo)):
    from app.models.struttura import Deliverable
    d = db.query(Deliverable).filter(Deliverable.id == del_id, Deliverable.progetto_id == id).first()
    if not d: raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Deliverable non trovato"}})
    db.delete(d); db.commit()
    return {"data": {"deleted": True}}

def _deliverable_dict(d) -> dict:
    return {"id": str(d.id), "progetto_id": str(d.progetto_id), "wp_id": str(d.wp_id) if d.wp_id else None,
            "codice": d.codice, "titolo": d.titolo, "tipo": d.tipo,
            "data_scadenza": str(d.data_scadenza) if d.data_scadenza else None,
            "data_consegna": str(d.data_consegna) if d.data_consegna else None, "stato": d.stato}
