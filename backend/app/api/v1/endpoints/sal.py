# backend/app/api/v1/endpoints/sal.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import tutti_i_ruoli, solo_amministrativo
from app.models.persona import Persona
from app.models.budget import Sal
from app.models.progetto import Progetto
import uuid

router = APIRouter()

TRANSIZIONI_SAL = {
    "aperto":       {"chiudi": "chiuso"},
    "chiuso":       {"invia": "inviato", "riapri": "aperto"},
    "inviato":      {"contesta": "contestato", "rendiconta": "rendicontato"},
    "contestato":   {"invia": "inviato"},
    "rendicontato": {},
}


def _sal_dict(s: Sal) -> dict:
    return {
        "id": str(s.id),
        "progetto_id": str(s.progetto_id),
        "numero": s.numero,
        "data_inizio": str(s.data_inizio) if s.data_inizio else None,
        "data_fine": str(s.data_fine) if s.data_fine else None,
        "stato": s.stato,
        "importo_tranche": float(s.importo_tranche) if s.importo_tranche else None,
        "importo_erogato": float(s.importo_erogato) if s.importo_erogato else None,
        "data_erogazione": str(s.data_erogazione) if s.data_erogazione else None,
        "data_scadenza_rendiconto": str(s.data_scadenza_rendiconto) if s.data_scadenza_rendiconto else None,
        "motivo_contestazione": s.motivo_contestazione,
    }


def _get_sal_or_404(id: str, db: Session) -> Sal:
    s = db.query(Sal).filter(Sal.id == id).first()
    if not s:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "SAL non trovato"}})
    return s


@router.get("/sal")
def lista_sal(
    progetto_id: str = Query(None),
    db: Session = Depends(get_db),
    utente: Persona = Depends(tutti_i_ruoli),
):
    q = db.query(Sal)
    if progetto_id:
        q = q.filter(Sal.progetto_id == progetto_id)
    q = q.order_by(Sal.numero)
    items = q.all()
    return {"data": [_sal_dict(s) for s in items], "meta": {"total": len(items)}}


@router.get("/sal/{id}")
def get_sal(
    id: str,
    db: Session = Depends(get_db),
    utente: Persona = Depends(tutti_i_ruoli),
):
    s = _get_sal_or_404(id, db)
    return {"data": _sal_dict(s)}


@router.post("/sal")
def crea_sal(
    body: dict,
    db: Session = Depends(get_db),
    utente: Persona = Depends(solo_amministrativo),
):
    progetto_id = body.get("progetto_id")
    if not progetto_id:
        raise HTTPException(status_code=422, detail={"error": {"code": "CAMPO_MANCANTE", "message": "progetto_id obbligatorio"}})

    # Verifica che il progetto esista e sia attivo
    p = db.query(Progetto).filter(Progetto.id == progetto_id).first()
    if not p:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Progetto non trovato"}})
    if p.stato != "attivo":
        raise HTTPException(status_code=409, detail={"error": {"code": "PROGETTO_NON_ATTIVO", "message": "Il progetto deve essere in stato attivo per creare un SAL"}})

    # Numero progressivo automatico
    ultimo = db.query(Sal).filter(Sal.progetto_id == progetto_id).order_by(Sal.numero.desc()).first()
    numero = (ultimo.numero + 1) if ultimo else 1

    s = Sal(
        id=uuid.uuid4(),
        progetto_id=progetto_id,
        numero=numero,
        data_inizio=body.get("data_inizio"),
        data_fine=body.get("data_fine"),
        importo_tranche=body.get("importo_tranche"),
        data_scadenza_rendiconto=body.get("data_scadenza_rendiconto"),
        stato="aperto",
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    return {"data": _sal_dict(s)}


@router.patch("/sal/{id}")
def aggiorna_sal(
    id: str,
    body: dict,
    db: Session = Depends(get_db),
    utente: Persona = Depends(solo_amministrativo),
):
    s = _get_sal_or_404(id, db)
    if s.stato != "aperto":
        raise HTTPException(status_code=409, detail={"error": {"code": "SAL_NON_MODIFICABILE", "message": "Solo i SAL aperti possono essere modificati"}})
    for k in ("data_inizio", "data_fine", "importo_tranche", "data_scadenza_rendiconto"):
        if k in body:
            setattr(s, k, body[k])
    db.commit()
    db.refresh(s)
    return {"data": _sal_dict(s)}


@router.delete("/sal/{id}")
def elimina_sal(
    id: str,
    db: Session = Depends(get_db),
    utente: Persona = Depends(solo_amministrativo),
):
    s = _get_sal_or_404(id, db)
    if s.stato != "aperto":
        raise HTTPException(status_code=409, detail={"error": {"code": "SAL_NON_ELIMINABILE", "message": "Solo i SAL aperti possono essere eliminati"}})
    db.delete(s)
    db.commit()
    return {"data": {"deleted": True}}


@router.post("/sal/{id}/chiudi")
def chiudi_sal(
    id: str,
    db: Session = Depends(get_db),
    utente: Persona = Depends(solo_amministrativo),
):
    return _transizione_sal(id, "chiudi", db)


def _transizione_sal(id: str, azione: str, db: Session, extra: dict = {}):
    s = _get_sal_or_404(id, db)
    nuovo_stato = TRANSIZIONI_SAL.get(s.stato, {}).get(azione)
    if not nuovo_stato:
        raise HTTPException(
            status_code=409,
            detail={"error": {"code": "TRANSIZIONE_NON_VALIDA",
                               "message": f"Impossibile eseguire '{azione}' da stato '{s.stato}'"}},
        )
    s.stato = nuovo_stato
    for k, v in extra.items():
        setattr(s, k, v)
    db.commit()
    db.refresh(s)
    return {"data": _sal_dict(s)}


@router.get("/sal/{id}/dettaglio")
def dettaglio_sal(
    id: str,
    db: Session = Depends(get_db),
    utente: Persona = Depends(tutti_i_ruoli),
):
    from app.models.budget import Spesa, BudgetVoce, VoceDiCosto
    from app.models.timesheet import TimesheetTestata, TimesheetRiga, TimesheetCella
    from app.models.personale import CostoOrarioPersona
    from app.models.struttura import WorkPackage
    from sqlalchemy import and_
    from datetime import date

    s = _get_sal_or_404(id, db)

    # ── Spese manuali nel periodo ─────────────────────────────────────────────
    spese = db.query(Spesa).filter(
        and_(
            Spesa.progetto_id == s.progetto_id,
            Spesa.stato == "registrata",
            Spesa.data >= s.data_inizio,
            Spesa.data <= s.data_fine,
        )
    ).all()

    # Spese già associate a questo SAL (selezionate esplicitamente)
    spese_associate = db.query(Spesa).filter(
        Spesa.sal_id == s.id,
        Spesa.stato == "registrata",
    ).all()
    ids_associate = {str(sp.id) for sp in spese_associate}

    spese_list = []
    for sp in spese:
        voce = db.query(VoceDiCosto).filter(VoceDiCosto.id == sp.voce_id).first()
        spese_list.append({
            "id": str(sp.id),
            "tipo": "spesa",
            "data": str(sp.data),
            "descrizione": sp.descrizione or sp.numero_documento or "Spesa",
            "importo": float(sp.importo),
            "voce_id": str(sp.voce_id) if sp.voce_id else None,
            "voce_descrizione": f"{voce.codice} — {voce.descrizione}" if voce else "—",
            "wp_id": None,
            "wp_descrizione": None,
            "selezionato": str(sp.id) in ids_associate or sp.sal_id is None,
            "sal_id": str(sp.sal_id) if sp.sal_id else None,
        })

    # ── Timesheet approvati nel periodo ───────────────────────────────────────
    # Cerca timesheet il cui mese ricade nel periodo del SAL
    ts_list_raw = db.query(TimesheetTestata).filter(
        and_(
            TimesheetTestata.progetto_id == s.progetto_id,
            TimesheetTestata.stato == "approvato",
        )
    ).all()

    timesheet_list = []
    for ts in ts_list_raw:
        # Calcola se il mese del timesheet ricade nel periodo del SAL
        ts_data_inizio = date(ts.anno, ts.mese, 1)
        import calendar
        ultimo_giorno = calendar.monthrange(ts.anno, ts.mese)[1]
        ts_data_fine = date(ts.anno, ts.mese, ultimo_giorno)

        if ts_data_fine < s.data_inizio or ts_data_inizio > s.data_fine:
            continue

        # Costo totale del timesheet (snapshot all'approvazione)
        ore_totali = 0
        costo_totale = 0
        for riga in ts.righe:
            if riga.tipo_riga != "progetto":
                continue
            for cella in riga.celle:
                ore_totali += float(cella.ore)
                costo_totale += float(cella.costo_calcolato or 0)

        if ore_totali == 0:
            continue

        # Persona
        from app.models.persona import Persona as PersonaModel
        persona = db.query(PersonaModel).filter(PersonaModel.id == ts.persona_id).first()
        nome_persona = f"{persona.nome} {persona.cognome}" if persona else "—"

        # Voce di costo personale
        voce_personale = db.query(VoceDiCosto).filter(
            VoceDiCosto.categoria == "personale"
        ).first()

        timesheet_list.append({
            "id": str(ts.id),
            "tipo": "timesheet",
            "data": str(ts_data_inizio),
            "descrizione": f"Timesheet {nome_persona} — {ts.mese}/{ts.anno}",
            "persona_nome": nome_persona,
            "mese": ts.mese,
            "anno": ts.anno,
            "importo": costo_totale,
            "ore": ore_totali,
            "voce_id": str(voce_personale.id) if voce_personale else None,
            "voce_descrizione": f"{voce_personale.codice} — {voce_personale.descrizione}" if voce_personale else "Personale",
            "wp_id": None,
            "wp_descrizione": None,
            "selezionato": str(ts.id) in {str(t) for t in (s.timesheet_ids if hasattr(s, 'timesheet_ids') else [])},
            "sal_id": str(ts.sal_id) if ts.sal_id else None,
        })

    # ── Totali per voce di costo ──────────────────────────────────────────────
    tutti = spese_list + timesheet_list
    totali_per_voce: dict = {}
    for item in tutti:
        if not item["selezionato"]:
            continue
        key = item["voce_id"] or "altro"
        if key not in totali_per_voce:
            totali_per_voce[key] = {
                "voce_id": key,
                "voce_descrizione": item["voce_descrizione"],
                "importo": 0,
            }
        totali_per_voce[key]["importo"] += item["importo"]

    return {
        "data": {
            "sal": _sal_dict(s),
            "voci": spese_list + timesheet_list,
            "totali_per_voce": list(totali_per_voce.values()),
            "totale": sum(i["importo"] for i in tutti if i["selezionato"]),
        }
    }


@router.post("/sal/{id}/associa-voci")
def associa_voci_sal(
    id: str,
    body: dict,
    db: Session = Depends(get_db),
    utente: Persona = Depends(solo_amministrativo),
):
    """Associa/disassocia spese e timesheet a un SAL."""
    from app.models.budget import Spesa
    from app.models.timesheet import TimesheetTestata

    s = _get_sal_or_404(id, db)
    if s.stato != "aperto":
        raise HTTPException(status_code=409, detail={"error": {
            "code": "SAL_NON_MODIFICABILE",
            "message": "Solo i SAL aperti possono essere modificati"
        }})

    spese_ids = body.get("spese_ids", [])
    timesheet_ids = body.get("timesheet_ids", [])

    # Disassocia tutte le spese precedentemente associate a questo SAL
    db.query(Spesa).filter(
        Spesa.sal_id == s.id,
        Spesa.progetto_id == s.progetto_id,
    ).update({"sal_id": None})

    # Associa le spese selezionate
    for spesa_id in spese_ids:
        db.query(Spesa).filter(Spesa.id == spesa_id).update({"sal_id": str(s.id)})

    # Disassocia tutti i timesheet precedentemente associati
    db.query(TimesheetTestata).filter(
        TimesheetTestata.sal_id == s.id,
        TimesheetTestata.progetto_id == s.progetto_id,
    ).update({"sal_id": None})

    # Associa i timesheet selezionati
    for ts_id in timesheet_ids:
        db.query(TimesheetTestata).filter(TimesheetTestata.id == ts_id).update({"sal_id": str(s.id)})

    db.commit()
    return {"data": {"spese_associate": len(spese_ids), "timesheet_associati": len(timesheet_ids)}}


@router.get("/sal/{id}/export/xlsx")
def export_sal_xlsx(
    id: str,
    db: Session = Depends(get_db),
    utente: Persona = Depends(tutti_i_ruoli),
):
    from fastapi.responses import StreamingResponse
    from openpyxl import Workbook
    from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
    from openpyxl.utils import get_column_letter
    from app.models.budget import Spesa, VoceDiCosto
    from app.models.timesheet import TimesheetTestata
    from app.models.persona import Persona as PersonaModel
    from app.models.progetto import Progetto
    from sqlalchemy import and_
    import io, calendar

    s = _get_sal_or_404(id, db)
    progetto = db.query(Progetto).filter(Progetto.id == s.progetto_id).first()

    wb = Workbook()
    ws = wb.active
    ws.title = f"SAL {s.numero}"

    blu = "185FA5"
    grigio = "F5F5F5"
    header_font = Font(bold=True, color="FFFFFF", size=11)
    header_fill = PatternFill("solid", fgColor=blu)
    sub_font = Font(bold=True, size=10)
    sub_fill = PatternFill("solid", fgColor=grigio)
    border = Border(
        left=Side(style="thin"), right=Side(style="thin"),
        top=Side(style="thin"), bottom=Side(style="thin")
    )
    center = Alignment(horizontal="center", vertical="center")
    right = Alignment(horizontal="right", vertical="center")
    left = Alignment(horizontal="left", vertical="center")

    def style(cell, font=None, fill=None, align=None):
        if font: cell.font = font
        if fill: cell.fill = fill
        if align: cell.alignment = align
        cell.border = border

    riga = 1

    # ── Intestazione ──
    ws.merge_cells(f"A{riga}:F{riga}")
    c = ws.cell(riga, 1, f"SAL {s.numero} — {progetto.acronimo or progetto.codice if progetto else ''}")
    style(c, header_font, header_fill, center)
    ws.row_dimensions[riga].height = 28
    riga += 1

    info = [
        ("Progetto", progetto.titolo if progetto else "—"),
        ("Periodo", f"{s.data_inizio} → {s.data_fine}"),
        ("Stato", s.stato.upper()),
        ("Scad. rendiconto", str(s.data_scadenza_rendiconto) if s.data_scadenza_rendiconto else "—"),
    ]
    for label, val in info:
        ws.cell(riga, 1, label).font = Font(bold=True)
        ws.cell(riga, 1).border = border
        ws.merge_cells(f"B{riga}:F{riga}")
        style(ws.cell(riga, 2, val), align=left)
        riga += 1

    riga += 1

    # ── Spese ──
    spese = db.query(Spesa).filter(
        and_(Spesa.progetto_id == s.progetto_id, Spesa.sal_id == s.id, Spesa.stato == "registrata")
    ).all()

    if spese:
        ws.merge_cells(f"A{riga}:F{riga}")
        style(ws.cell(riga, 1, "SPESE"), sub_font, sub_fill, center)
        riga += 1

        headers_spese = ["Data", "N° Documento", "Voce di costo", "Descrizione", "Importo"]
        for col, h in enumerate(headers_spese, 1):
            style(ws.cell(riga, col, h), sub_font, sub_fill, center)
        riga += 1

        tot_spese = 0
        for sp in spese:
            voce = db.query(VoceDiCosto).filter(VoceDiCosto.id == sp.voce_id).first()
            row_data = [
                str(sp.data) if sp.data else "—",
                sp.numero_documento or "—",
                f"{voce.codice} — {voce.descrizione}" if voce else "—",
                sp.descrizione or "—",
                float(sp.importo),
            ]
            for col, val in enumerate(row_data, 1):
                c = ws.cell(riga, col, val)
                style(c, align=right if col == 5 else left)
            tot_spese += float(sp.importo)
            riga += 1

        ws.cell(riga, 4, "Totale spese").font = Font(bold=True)
        ws.cell(riga, 4).border = border
        c = ws.cell(riga, 5, tot_spese)
        style(c, Font(bold=True), align=right)
        riga += 2

    # ── Timesheet ──
    ts_list = db.query(TimesheetTestata).filter(
        and_(TimesheetTestata.progetto_id == s.progetto_id,
             TimesheetTestata.sal_id == s.id,
             TimesheetTestata.stato == "approvato")
    ).all()

    if ts_list:
        ws.merge_cells(f"A{riga}:F{riga}")
        style(ws.cell(riga, 1, "TIMESHEET"), sub_font, sub_fill, center)
        riga += 1

        headers_ts = ["Persona", "Mese/Anno", "Ore progetto", "Costo orario", "Costo totale"]
        for col, h in enumerate(headers_ts, 1):
            style(ws.cell(riga, col, h), sub_font, sub_fill, center)
        riga += 1

        tot_ts = 0
        for ts in ts_list:
            persona = db.query(PersonaModel).filter(PersonaModel.id == ts.persona_id).first()
            ore = sum(float(c.ore) for r in ts.righe if r.tipo_riga == "progetto" for c in r.celle)
            costo = sum(float(c.costo_calcolato or 0) for r in ts.righe if r.tipo_riga == "progetto" for c in r.celle)
            costo_orario = costo / ore if ore > 0 else 0
            row_data = [
                f"{persona.cognome} {persona.nome}" if persona else "—",
                f"{ts.mese:02d}/{ts.anno}",
                ore, round(costo_orario, 2), round(costo, 2),
            ]
            for col, val in enumerate(row_data, 1):
                c = ws.cell(riga, col, val)
                style(c, align=right if col >= 3 else left)
            tot_ts += costo
            riga += 1

        ws.cell(riga, 4, "Totale personale").font = Font(bold=True)
        ws.cell(riga, 4).border = border
        c = ws.cell(riga, 5, round(tot_ts, 2))
        style(c, Font(bold=True), align=right)
        riga += 2

    # ── Totali per voce ──
    ws.merge_cells(f"A{riga}:F{riga}")
    style(ws.cell(riga, 1, "TOTALI PER VOCE DI COSTO"), sub_font, sub_fill, center)
    riga += 1

    totali_voce: dict = {}
    for sp in spese:
        voce = db.query(VoceDiCosto).filter(VoceDiCosto.id == sp.voce_id).first()
        key = voce.descrizione if voce else "Altro"
        totali_voce[key] = totali_voce.get(key, 0) + float(sp.importo)
    for ts in ts_list:
        costo = sum(float(c.costo_calcolato or 0) for r in ts.righe if r.tipo_riga == "progetto" for c in r.celle)
        totali_voce["Personale dipendente"] = totali_voce.get("Personale dipendente", 0) + costo

    totale_generale = 0
    for voce_desc, importo in totali_voce.items():
        ws.cell(riga, 1, voce_desc).border = border
        ws.merge_cells(f"A{riga}:D{riga}")
        c = ws.cell(riga, 5, round(importo, 2))
        style(c, align=right)
        totale_generale += importo
        riga += 1

    ws.cell(riga, 4, "TOTALE GENERALE").font = Font(bold=True, color="FFFFFF")
    ws.cell(riga, 4).fill = PatternFill("solid", fgColor=blu)
    ws.cell(riga, 4).border = border
    c = ws.cell(riga, 5, round(totale_generale, 2))
    style(c, Font(bold=True), PatternFill("solid", fgColor=blu), right)
    c.font = Font(bold=True, color="FFFFFF")

    # Larghezze colonne
    ws.column_dimensions["A"].width = 30
    ws.column_dimensions["B"].width = 20
    ws.column_dimensions["C"].width = 30
    ws.column_dimensions["D"].width = 20
    ws.column_dimensions["E"].width = 15

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    filename = f"SAL_{s.numero}_{progetto.codice if progetto else 'export'}.xlsx"
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/notifiche")
def notifiche(
    db: Session = Depends(get_db),
    utente: Persona = Depends(tutti_i_ruoli),
):
    from datetime import date, timedelta
    from app.models.timesheet import TimesheetTestata
    from app.models.progetto import Progetto
    from app.models.personale import Allocazione

    oggi = date.today()
    tra_30 = oggi + timedelta(days=30)
    risultati = []

    # SAL in scadenza entro 30 giorni
    if utente.ruolo in ("amministrativo", "management", "pi"):
        if utente.ruolo in ("amministrativo", "management"):
            sal_q = db.query(Sal)
        else:
            # PI vede solo i SAL dei progetti a cui partecipa
            proj_ids = [str(a.progetto_id) for a in
                       db.query(Allocazione).filter(Allocazione.persona_id == utente.id).all()]
            sal_q = db.query(Sal).filter(Sal.progetto_id.in_(proj_ids))

        sal_scadenza = sal_q.filter(
            Sal.stato.in_(["aperto", "chiuso"]),
            Sal.data_scadenza_rendiconto != None,
            Sal.data_scadenza_rendiconto >= oggi,
            Sal.data_scadenza_rendiconto <= tra_30,
        ).all()

        for s in sal_scadenza:
            p = db.query(Progetto).filter(Progetto.id == s.progetto_id).first()
            giorni = (s.data_scadenza_rendiconto - oggi).days
            risultati.append({
                "id": str(s.id),
                "tipo": "sal_scadenza",
                "titolo": f"SAL {s.numero} in scadenza",
                "messaggio": f"{p.acronimo or p.codice} — scade tra {giorni} giorn{'o' if giorni == 1 else 'i'}",
                "giorni_rimanenti": giorni,
                "link": f"/sal/{s.id}",
                "urgente": giorni <= 7,
            })

    # Timesheet in attesa di approvazione
    if utente.ruolo in ("pi", "amministrativo"):
        ts_pendenti = db.query(TimesheetTestata).filter(
            TimesheetTestata.stato == "inviato"
        ).all()

        for ts in ts_pendenti:
            p = db.query(Progetto).filter(Progetto.id == ts.progetto_id).first()
            from app.models.persona import Persona as PersonaModel
            persona = db.query(PersonaModel).filter(PersonaModel.id == ts.persona_id).first()
            risultati.append({
                "id": str(ts.id),
                "tipo": "timesheet_pendente",
                "titolo": "Timesheet da approvare",
                "messaggio": f"{persona.nome} {persona.cognome} — {ts.mese:02d}/{ts.anno} ({p.acronimo or p.codice if p else ''})",
                "giorni_rimanenti": None,
                "link": f"/timesheet/{ts.id}",
                "urgente": False,
            })

    # Ordina: urgenti prima, poi per giorni rimanenti
    risultati.sort(key=lambda x: (not x["urgente"], x["giorni_rimanenti"] if x["giorni_rimanenti"] is not None else 999))

    # Aggiungi notifiche personali dal sistema
    try:
        from app.models.notifica import Notifica
        notifiche_db = db.query(Notifica).filter(
            Notifica.persona_id == utente.id,
            Notifica.letta == False,
        ).order_by(Notifica.created_at.desc()).all()

        for n in notifiche_db:
            risultati.insert(0, {
                "id": str(n.id),
                "tipo": n.tipo,
                "titolo": n.titolo,
                "messaggio": n.messaggio or "",
                "giorni_rimanenti": None,
                "link": n.link or "/",
                "urgente": False,
            })
    except Exception:
        pass

    return {"data": risultati, "meta": {"totale": len(risultati)}}


@router.post("/notifiche/{id}/letta")
def segna_notifica_letta(
    id: str,
    db: Session = Depends(get_db),
    utente: Persona = Depends(tutti_i_ruoli),
):
    from app.models.notifica import Notifica
    n = db.query(Notifica).filter(Notifica.id == id, Notifica.persona_id == utente.id).first()
    if n:
        n.letta = True
        db.commit()
    return {"data": {"ok": True}}
