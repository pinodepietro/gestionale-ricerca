# backend/app/services/pdf_missione.py
import os
import re
import unicodedata
from datetime import date
from sqlalchemy.orm import Session
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, Image
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

from app.services.pdf_autorizzazione import LOGO_PATH

W, H = A4


def _safe_name(s: str) -> str:
    """Converte una stringa in formato sicuro per nome file: minuscolo, senza accenti, solo alfanumerici e underscore."""
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode('ascii')
    s = s.lower().replace(' ', '_')
    return re.sub(r'[^a-z0-9_]', '', s)


def _euro(v) -> str:
    try:
        return f"€ {float(v):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    except Exception:
        return "—"


def _data(d) -> str:
    if not d:
        return "—"
    if isinstance(d, str):
        return d
    return d.strftime("%d/%m/%Y")


def _nome(persona) -> str:
    return f"{persona.cognome} {persona.nome}" if persona else "—"


def _ora(t) -> str:
    if not t:
        return "—"
    return t.strftime("%H:%M")


def _stili():
    styles = getSampleStyleSheet()
    normale = ParagraphStyle("normale", parent=styles["Normal"], fontSize=9, leading=13,
                              fontName="Helvetica", spaceBefore=2)
    bold = ParagraphStyle("bold", parent=normale, fontName="Helvetica-Bold")
    titolo = ParagraphStyle("titolo", parent=styles["Normal"], fontSize=14, leading=18,
                             fontName="Helvetica-Bold", alignment=TA_CENTER, spaceAfter=4)
    sottotitolo = ParagraphStyle("sottotitolo", parent=styles["Normal"], fontSize=11, leading=14,
                                  fontName="Helvetica-Bold", alignment=TA_CENTER, spaceAfter=2)
    piccolo = ParagraphStyle("piccolo", parent=normale, fontSize=8, textColor=colors.HexColor("#555555"))
    return normale, bold, titolo, sottotitolo, piccolo


def _header(story, titolo_doc: str):
    normale, bold, titolo, sottotitolo, piccolo = _stili()
    if os.path.exists(LOGO_PATH):
        img = Image(LOGO_PATH, width=35 * mm, height=35 * mm * 148 / 374)
        story.append(img)
    story.append(Spacer(1, 4 * mm))
    story.append(Paragraph(titolo_doc, titolo))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#003366")))
    story.append(Spacer(1, 4 * mm))


def _tabella_dati(righe: list[tuple[str, str]], larghezze=(55 * mm, 110 * mm)) -> Table:
    normale, bold, *_ = _stili()
    data = [[Paragraph(f"<b>{label}</b>", normale), Paragraph(str(valore), normale)]
            for label, valore in righe]
    t = Table(data, colWidths=list(larghezze), hAlign="LEFT")
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#cccccc")),
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f5f5f5")),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    return t


def genera_pdf_missione(missione, db: Session, output_dir: str) -> str:
    os.makedirs(output_dir, exist_ok=True)
    richiedente_raw = missione.richiedente
    _nome_file = _safe_name(f"{richiedente_raw.nome}_{richiedente_raw.cognome}") if richiedente_raw else "richiedente"
    _data_app = (missione.approvata_il.strftime('%Y%m%d')
                 if missione.approvata_il else date.today().strftime('%Y%m%d'))
    output_path = os.path.join(output_dir, f"AUT_MISS_{_nome_file}_{_data_app}.pdf")

    normale, bold, titolo_s, sottotitolo_s, piccolo = _stili()
    story = []
    doc = SimpleDocTemplate(output_path, pagesize=A4,
                             leftMargin=20 * mm, rightMargin=20 * mm,
                             topMargin=20 * mm, bottomMargin=20 * mm)

    _header(story,
            "RICHIESTA DI AUTORIZZAZIONE PER MISSIONE E PER TRASFERTA<br/>"
            "PER ATTIVITA' DI RICERCA<br/>"
            "- PERSONALE DOCENTE")

    richiedente = missione.richiedente
    progetto = missione.progetto

    from app.models.personale import Allocazione
    from app.models.persona import Persona
    from app.models.progetto import Progetto
    from app.models.autorizzazione_spesa import Dipartimento

    alloc_pi = db.query(Allocazione).filter(
        Allocazione.progetto_id == missione.progetto_id, Allocazione.is_pi == True).first()
    pi = alloc_pi.persona if alloc_pi else None

    dir_dip = None
    if progetto and getattr(progetto, "dipartimento_id", None):
        dip = db.query(Dipartimento).filter(Dipartimento.id == progetto.dipartimento_id).first()
        if dip and getattr(dip, "direttore_id", None):
            dir_dip = db.query(Persona).filter(Persona.id == dip.direttore_id).first()

    dg = db.query(Persona).filter(Persona.ruolo == "direttore_generale", Persona.attivo == True).first()

    story.append(Paragraph("DATI DELLA MISSIONE", bold))
    story.append(Spacer(1, 2 * mm))

    GRUPPO_LABEL = {
        "A": "Gruppo A — Professore/Professoressa di I e II Fascia; membro di organi o commissioni",
        "B": "Gruppo B — Ricercatore/Ricercatrice (a tempo determinato o indeterminato)",
        "C": "Gruppo C — Docente a contratto; assegnisti; dottorandi; tutor",
    }

    mezzo_label = {
        "ordinario": "Mezzo ordinario",
        "straordinario": "Mezzo straordinario",
    }.get(missione.mezzo_tipo, missione.mezzo_tipo or "—")
    if missione.mezzo_descrizione:
        mezzo_label = f"{mezzo_label} — {missione.mezzo_descrizione}"
    if missione.auto_alimentazione:
        mezzo_label += f", {missione.auto_alimentazione}"
    if missione.auto_cilindrata:
        mezzo_label += f" {missione.auto_cilindrata}"

    copertura_label = {
        "progetto": "Progetto finanziato",
        "strategico": "Progetto strategico di Ateneo",
        "altro": "Altro",
    }.get(missione.copertura_tipo, missione.copertura_tipo or "—")

    gruppo = missione.gruppo_missione
    dati_missione = [
        ("Richiedente", _nome(richiedente)),
        ("Gruppo", GRUPPO_LABEL.get(gruppo, f"Gruppo {gruppo}") if gruppo else "—"),
        ("Progetto", f"{progetto.codice} — {progetto.titolo}" if progetto else "—"),
        ("Responsabile Scientifico", _nome(pi) if pi else "—"),
        ("Destinazione", missione.destinazione or "—"),
        ("Data inizio", _data(missione.data_inizio) + (f" ore {_ora(missione.ora_inizio)}" if missione.ora_inizio else "")),
        ("Data fine", _data(missione.data_fine) + (f" ore {_ora(missione.ora_fine)}" if missione.ora_fine else "")),
        ("Motivo", missione.motivo or "—"),
        ("Mezzo di trasporto", mezzo_label),
        ("Copertura finanziaria", copertura_label + (f" — {missione.copertura_descrizione}" if missione.copertura_descrizione else "")),
        ("Importo stimato", _euro(missione.importo_stimato)),
    ]
    if missione.motivazione_mezzo_straordinario:
        dati_missione.append(("Motivazione mezzo straordinario", missione.motivazione_mezzo_straordinario))

    story.append(_tabella_dati(dati_missione))
    story.append(Spacer(1, 10 * mm))

    # ── Firme: Resp. Scientifico | Dir. Dipartimento | Dir. Generale ─────────
    pi_step = next((s for s in missione.step_approvazione if s.ruolo == "pi"), None)
    dir_dip_step = next((s for s in missione.step_approvazione if s.ruolo == "dir_dip"), None)
    dg_step = next((s for s in missione.step_approvazione if s.ruolo == "dg"), None)

    def _luogo_data(step) -> str:
        if not step:
            return "____________________"
        luogo = step.luogo_firma or "—"
        data_str = _data(step.decided_at) if step.decided_at else "—"
        return f"{luogo}, {data_str}"

    def _firma_img(persona):
        path = getattr(persona, "firma_olografa", None) if persona else None
        if path and os.path.exists(path):
            return Image(path, width=45 * mm, height=18 * mm)
        return Spacer(1, 18 * mm)

    COL = 56 * mm
    firma_data = [
        # riga titoli
        [Paragraph("<b>Il Responsabile Scientifico</b>", piccolo),
         Paragraph("<b>Il Direttore di Dipartimento</b>", piccolo),
         Paragraph("<b>Il Direttore Generale</b>", piccolo)],
        # riga firme
        [_firma_img(pi), _firma_img(dir_dip), _firma_img(dg)],
        # riga nomi
        [Paragraph(_nome(pi) if pi else "—", piccolo),
         Paragraph(_nome(dir_dip) if dir_dip else "—", piccolo),
         Paragraph(_nome(dg) if dg else "—", piccolo)],
        # riga luogo e data
        [Paragraph(f"Luogo e data:<br/>{_luogo_data(pi_step)}", piccolo),
         Paragraph(f"Luogo e data:<br/>{_luogo_data(dir_dip_step)}", piccolo),
         Paragraph(f"Luogo e data:<br/>{_luogo_data(dg_step)}", piccolo)],
    ]

    t_firme = Table(firma_data, colWidths=[COL, COL, COL], hAlign="LEFT")
    t_firme.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#cccccc")),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f0f4ff")),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("ROWBACKGROUNDS", (0, 1), (-1, 1), [colors.white]),
    ]))
    story.append(t_firme)

    doc.build(story)
    return output_path


def genera_pdf_rimborso_missione(rimborso, db: Session, output_dir: str) -> str:
    os.makedirs(output_dir, exist_ok=True)
    _richiedente = rimborso.richiedente
    _nome_file = _safe_name(f"{_richiedente.nome}_{_richiedente.cognome}") if _richiedente else "richiedente"
    _data_app = (rimborso.approvata_il.strftime('%Y%m%d')
                 if rimborso.approvata_il else date.today().strftime('%Y%m%d'))
    output_path = os.path.join(output_dir, f"RIMB_MISS_{_nome_file}_{_data_app}.pdf")

    normale, bold, titolo_s, sottotitolo_s, piccolo = _stili()
    # stile per le celle di intestazione tabella: testo bianco (il TEXTCOLOR del TableStyle
    # non ha effetto sui Paragraph → serve uno stile dedicato)
    piccolo_bianco = ParagraphStyle("piccolo_bianco", parent=piccolo, textColor=colors.white)

    story = []
    doc = SimpleDocTemplate(output_path, pagesize=A4,
                             leftMargin=20 * mm, rightMargin=20 * mm,
                             topMargin=20 * mm, bottomMargin=20 * mm)

    _header(story, "RIMBORSO SPESE DI MISSIONE")

    missione = rimborso.missione
    richiedente = rimborso.richiedente
    progetto = missione.progetto if missione else None

    from app.models.personale import Allocazione
    from app.models.autorizzazione_spesa import Dipartimento as DipModel

    alloc_pi = db.query(Allocazione).filter(
        Allocazione.progetto_id == missione.progetto_id, Allocazione.is_pi == True).first() if missione else None
    pi = alloc_pi.persona if alloc_pi else None

    dir_dip = None
    if missione and progetto and progetto.dipartimento_id:
        dip = db.query(DipModel).filter(DipModel.id == progetto.dipartimento_id).first()
        if dip and dip.direttore_id:
            from app.models.persona import Persona as PersonaModel
            dir_dip = db.query(PersonaModel).filter(PersonaModel.id == dip.direttore_id).first()

    from app.models.persona import Persona as PersonaModel
    dg = db.query(PersonaModel).filter(
        PersonaModel.ruolo == "direttore_generale", PersonaModel.attivo == True).first()

    story.append(Paragraph("RIFERIMENTO MISSIONE", bold))
    story.append(Spacer(1, 2 * mm))
    dati_rif = [
        ("Richiedente", _nome(richiedente)),
        ("Progetto", f"{progetto.codice} — {progetto.titolo}" if progetto else "—"),
        ("Responsabile Scientifico", _nome(pi) if pi else "—"),
        ("Destinazione", missione.destinazione if missione else "—"),
        ("Periodo", f"{_data(missione.data_inizio)} — {_data(missione.data_fine)}" if missione else "—"),
    ]
    story.append(_tabella_dati(dati_rif))
    story.append(Spacer(1, 5 * mm))

    # Righe rimborso — sezione rinominata "VOCI DI SPESA"
    story.append(Paragraph("VOCI DI SPESA", bold))
    story.append(Spacer(1, 2 * mm))
    header_righe = [
        Paragraph("<b>Data inizio</b>", piccolo_bianco),
        Paragraph("<b>Data fine</b>", piccolo_bianco),
        Paragraph("<b>Attività/Descrizione</b>", piccolo_bianco),
        Paragraph("<b>Importo</b>", piccolo_bianco),
    ]
    righe_data = [header_righe]
    totale = 0.0
    for riga in rimborso.righe:
        imp = float(riga.importo or 0)
        totale += imp
        righe_data.append([
            Paragraph(_data(riga.data_inizio), piccolo),
            Paragraph(_data(riga.data_fine), piccolo),
            Paragraph(riga.attivita or "—", piccolo),
            Paragraph(_euro(riga.importo) if riga.importo else "—", piccolo),
        ])
    righe_data.append([
        Paragraph("", piccolo), Paragraph("", piccolo),
        Paragraph("<b>TOTALE</b>", normale),
        Paragraph(f"<b>{_euro(totale)}</b>", normale),
    ])

    t_righe = Table(righe_data, colWidths=[28 * mm, 28 * mm, 90 * mm, 30 * mm], hAlign="LEFT")
    t_righe.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#003366")),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#cccccc")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -2), [colors.white, colors.HexColor("#f9f9f9")]),
        ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#e8f0fe")),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(t_righe)
    story.append(Spacer(1, 10 * mm))

    # ── Firme: Resp. Scientifico | Dir. Dipartimento | Dir. Generale ─────────
    pi_step = next((s for s in rimborso.step_approvazione if s.ruolo == "pi"), None)
    dir_dip_step = next((s for s in rimborso.step_approvazione if s.ruolo == "dir_dip"), None)
    dg_step = next((s for s in rimborso.step_approvazione if s.ruolo == "dg"), None)

    def _luogo_data(step) -> str:
        if not step:
            return "____________________"
        luogo = step.luogo_firma or "—"
        data_str = _data(step.decided_at) if step.decided_at else "—"
        return f"{luogo}, {data_str}"

    def _firma_img(persona):
        path = getattr(persona, "firma_olografa", None) if persona else None
        if path and os.path.exists(path):
            return Image(path, width=45 * mm, height=18 * mm)
        return Spacer(1, 18 * mm)

    COL = 56 * mm
    firma_data = [
        [Paragraph("<b>Il Responsabile Scientifico</b>", piccolo),
         Paragraph("<b>Il Direttore di Dipartimento</b>", piccolo),
         Paragraph("<b>Il Direttore Generale</b>", piccolo)],
        [_firma_img(pi), _firma_img(dir_dip), _firma_img(dg)],
        [Paragraph(_nome(pi) if pi else "—", piccolo),
         Paragraph(_nome(dir_dip) if dir_dip else "—", piccolo),
         Paragraph(_nome(dg) if dg else "—", piccolo)],
        [Paragraph(f"Luogo e data:<br/>{_luogo_data(pi_step)}", piccolo),
         Paragraph(f"Luogo e data:<br/>{_luogo_data(dir_dip_step)}", piccolo),
         Paragraph(f"Luogo e data:<br/>{_luogo_data(dg_step)}", piccolo)],
    ]

    t_firme = Table(firma_data, colWidths=[COL, COL, COL], hAlign="LEFT")
    t_firme.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#cccccc")),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f0f4ff")),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    story.append(t_firme)

    doc.build(story)
    return output_path
