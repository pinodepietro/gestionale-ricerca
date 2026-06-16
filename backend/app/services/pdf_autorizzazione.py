# backend/app/services/pdf_autorizzazione.py
import os
from sqlalchemy.orm import Session
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, Image
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

LOGO_PATH = os.path.join(os.path.dirname(__file__), "..", "assets", "logo_pegaso.png")

MACRO_TITOLI = {
    "personale": "MACROCATEGORIA PERSONALE",
    "spese_generali": "MACROCATEGORIA SPESE GENERALI",
    "consulenze_servizi": "MACROCATEGORIA ACQUISIZIONE DI CONSULENZE E/O SERVIZI",
    "strumentazioni": "MACROCATEGORIA STRUMENTAZIONI E ATTREZZATURE",
}

MACRO_VOCI = {
    "personale": ["a", "b", "c", "d", "e", "f", "g", "h"],
    "spese_generali": ["i", "j", "k", "l", "m"],
    "consulenze_servizi": ["n", "o", "p"],
    "strumentazioni": ["q", "r", "s", "t", "u"],
}

VOCI_LABEL = {
    "a": "Contratti di Ricerca",
    "b": "RTDA",
    "c": "RTD o forme analoghe",
    "d": "Assegni di ricerca",
    "e": "Borse di ricerca",
    "f": "Co.Co.Co/Co.Co.Pro",
    "g": "Incentivazione Personale Docente",
    "h": "Altro",
    "i": "Consulenze",
    "j": "Prestazioni Professionali",
    "k": "Contratti di edizione per articoli e libri, validi ai fini VQR (Pubblicazioni, libri, monografie, etc.)",
    "l": "Materiali di consumo",
    "m": "Altro",
    "n": "Consulenze",
    "o": "Prestazioni Professionali",
    "p": "Altro",
    "q": "PC",
    "r": "Software",
    "s": "Server",
    "t": "Arredi",
    "u": "Altro",
}

# Voci "Altro" che ammettono una specifica testuale
VOCI_ALTRO = {"h", "m", "p", "u"}

QUALITA_LABEL = {
    "professore_ordinario": "Professore Ordinario",
    "professore_associato": "Professore Associato",
    "ricercatore": "Ricercatore",
}

SEZIONE1_VOCI = set("abcdefhijknop")
SEZIONE2_VOCI = set("lmqrstu")


def _euro(value) -> str:
    if value is None:
        return "—"
    testo = f"{float(value):,.2f}"
    return testo.replace(",", "X").replace(".", ",").replace("X", ".") + " €"


def _data(dt) -> str:
    if not dt:
        return "—"
    return dt.strftime("%d/%m/%Y")


def _checkbox(selezionato: bool) -> str:
    return "[X]" if selezionato else "[ ]"


def _persona_pi(richiesta, db: Session):
    from app.models.personale import Allocazione
    alloc = db.query(Allocazione).filter(
        Allocazione.progetto_id == richiesta.progetto_id, Allocazione.is_pi == True).first()
    return alloc.persona if alloc else None


def _persona_dg(db: Session):
    from app.models.persona import Persona
    return db.query(Persona).filter(Persona.ruolo == "direttore_generale", Persona.attivo == True).first()


def _nome_persona(persona) -> str:
    return f"{persona.cognome} {persona.nome}" if persona else "—"


def genera_pdf_autorizzazione(richiesta, db: Session, output_dir: str) -> str:
    """
    Genera il PDF del Modulo Richiesta Autorizzazione alla Spesa (Allegato E0),
    compilato con i dati della richiesta e le date di approvazione del flusso di firme.
    Restituisce il path del file generato.
    """
    os.makedirs(output_dir, exist_ok=True)
    from app.services.storage import _safe
    from datetime import date as _date
    _rich = richiesta.richiedente
    _cog = _safe(_rich.cognome if _rich else "richiedente")
    _dt = (richiesta.data_approvazione_dg.strftime('%Y%m%d')
           if richiesta.data_approvazione_dg else _date.today().strftime('%Y%m%d'))
    filename = f"AUT_SPESA_{_cog}_{_dt}.pdf"
    filepath = os.path.join(output_dir, filename)

    doc = SimpleDocTemplate(
        filepath,
        pagesize=A4,
        leftMargin=20 * mm, rightMargin=20 * mm,
        topMargin=15 * mm, bottomMargin=15 * mm,
    )

    styles = getSampleStyleSheet()
    stile_titolo = ParagraphStyle("TitoloDoc", parent=styles["Heading1"], fontSize=13,
                                   alignment=TA_CENTER, spaceAfter=6)
    stile_sezione = ParagraphStyle("SezioneDoc", parent=styles["Heading2"], fontSize=10,
                                    spaceBefore=8, spaceAfter=4, textColor=colors.HexColor("#1a3d6e"))
    stile_normale = ParagraphStyle("NormaleDoc", parent=styles["Normal"], fontSize=9, leading=13)
    stile_dest = ParagraphStyle("DestDoc", parent=styles["Normal"], fontSize=9,
                                 alignment=TA_RIGHT, leading=13)
    stile_check = ParagraphStyle("CheckDoc", parent=styles["Normal"], fontSize=9, leading=13,
                                  leftIndent=8 * mm)
    stile_piccolo = ParagraphStyle("PiccoloDoc", parent=styles["Normal"], fontSize=8)

    story = []

    # ── Intestazione ──────────────────────────────────────────────────────────
    if os.path.exists(LOGO_PATH):
        img = Image(LOGO_PATH, width=40 * mm, height=40 * mm * 148 / 374)
        img.hAlign = "CENTER"
        story.append(img)
        story.append(Spacer(1, 2 * mm))

    story.append(Paragraph("Richiesta Prot. n. _______________ del _______________", stile_piccolo))
    story.append(Spacer(1, 2 * mm))
    story.append(Paragraph("<u><b>MODULO RICHIESTA AUTORIZZAZIONE ALLA SPESA</b></u>", stile_titolo))
    story.append(Spacer(1, 3 * mm))

    # ── Destinatari ───────────────────────────────────────────────────────────
    dip_nome = richiesta.dipartimento.nome if richiesta.dipartimento else "—"
    dir_dip_persona = richiesta.dipartimento.direttore if richiesta.dipartimento else None
    dir_dip_nome = _nome_persona(dir_dip_persona)

    pi_persona = _persona_pi(richiesta, db) if richiesta.progetto_id else None
    dg_persona = _persona_dg(db)

    story.append(Paragraph(f"A:<br/>Direttore del Dipartimento di {dip_nome}, Prof. {dir_dip_nome};", stile_dest))
    if richiesta.tipo == "progetto":
        story.append(Paragraph(f"Responsabile Scientifico, Prof. {_nome_persona(pi_persona)};", stile_dest))
    story.append(Paragraph("Direttore Generale dell'Università Telematica Pegaso;", stile_dest))
    story.append(Paragraph("Magnifico Rettore dell'Università Telematica Pegaso;", stile_dest))
    story.append(Paragraph("Ufficio Ricerca dell'Università Telematica Pegaso (ufficio.ricerca@unipegaso.it);", stile_dest))
    story.append(Spacer(1, 2 * mm))
    story.append(Paragraph("SEDE: Centro Direzionale isola F2, SNC — 80143, Napoli", stile_dest))
    story.append(Spacer(1, 4 * mm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.lightgrey))
    story.append(Spacer(1, 3 * mm))

    # ── Richiedente ───────────────────────────────────────────────────────────
    richiedente = richiesta.richiedente
    nome_richiedente = _nome_persona(richiedente)
    qualita = QUALITA_LABEL.get(richiesta.qualita_richiedente, richiesta.qualita_richiedente)

    story.append(Paragraph(f"<b>Il/La sottoscritto/a:</b> {nome_richiedente}", stile_normale))
    story.append(Spacer(1, 1 * mm))

    qualifica_riga = "   ".join(
        f"{_checkbox(richiesta.qualita_richiedente == k)} {v}" for k, v in QUALITA_LABEL.items()
    )
    story.append(Paragraph(f"<b>In qualità di:</b> {qualifica_riga}", stile_check))

    tempo_riga = "   ".join([
        f"{_checkbox(richiesta.tipo_contratto == 'pieno')} Pieno",
        f"{_checkbox(richiesta.tipo_contratto == 'definito')} Definito",
    ])
    story.append(Paragraph(f"<b>A tempo:</b> {tempo_riga}", stile_check))
    story.append(Spacer(1, 3 * mm))

    # ── Progetto / Fondi individuali ─────────────────────────────────────────
    if richiesta.progetto:
        p = richiesta.progetto
        dati_prog = [
            ["Progetto:", p.titolo or "—"],
            ["CUP/ID:", p.cup or "—"],
            ["Bando:", p.riferimento_bando or "—"],
            ["In qualità di:", richiesta.qualita_progetto or "—"],
        ]
    else:
        dati_prog = [["Fondo per la Ricerca Individuale del Prof.:", nome_richiedente]]

    t_prog = Table(dati_prog, colWidths=[55 * mm, None])
    t_prog.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    story.append(t_prog)
    story.append(Spacer(1, 4 * mm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.lightgrey))
    story.append(Spacer(1, 3 * mm))

    # ── Macrocategorie / voce di costo ───────────────────────────────────────
    story.append(Paragraph("<b>CHIEDE AUTORIZZAZIONE A EFFETTUARE LA SEGUENTE SPESA</b>", stile_sezione))

    for macro_key, voci in MACRO_VOCI.items():
        story.append(Paragraph(f"<b>{MACRO_TITOLI[macro_key]}:</b>", stile_normale))
        for v in voci:
            selezionata = (richiesta.macrocategoria == macro_key and richiesta.voce_lettera == v)
            etichetta = f"{v}) {VOCI_LABEL[v]}"
            if selezionata and v in VOCI_ALTRO and richiesta.voce_altro:
                etichetta += f": {richiesta.voce_altro}"
            stile_riga = stile_check
            if selezionata:
                etichetta = f"<b>{etichetta}</b>"
            story.append(Paragraph(f"{_checkbox(selezionata)} {etichetta}", stile_riga))
        story.append(Spacer(1, 2 * mm))

    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.lightgrey))
    story.append(Spacer(1, 3 * mm))

    # ── Dettagli della spesa (Sezione 1 / Sezione 2) ─────────────────────────
    voce = richiesta.voce_lettera
    if voce in SEZIONE1_VOCI:
        story.append(Paragraph("<b>Sezione 1 — Dettagli della richiesta</b>", stile_sezione))
        dati_sp = [
            ["Oggetto:", richiesta.oggetto],
            ["Descrizione:", richiesta.descrizione],
            ["Importo:", _euro(richiesta.importo)],
        ]
        if richiesta.durata_da or richiesta.durata_a:
            dati_sp.append(["Durata:", f"Dal {_data(richiesta.durata_da)} al {_data(richiesta.durata_a)}"])
        if richiesta.termini_pagamento:
            dati_sp.append(["Termini di pagamento:", richiesta.termini_pagamento])
    else:
        story.append(Paragraph("<b>Sezione 2 — Dettagli della richiesta</b>", stile_sezione))
        dati_sp = [
            ["Oggetto:", richiesta.oggetto],
            ["Descrizione:", richiesta.descrizione],
            ["Importo:", _euro(richiesta.importo)],
        ]

    t3 = Table(dati_sp, colWidths=[42 * mm, None])
    t3.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("GRID", (0, 0), (-1, -1), 0.3, colors.lightgrey),
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f5f5f5")),
    ]))
    story.append(t3)
    story.append(Spacer(1, 3 * mm))

    # Anticipazione
    anticip_riga = "   ".join([
        f"{_checkbox(richiesta.anticipazione_spesa)} SI",
        f"{_checkbox(not richiesta.anticipazione_spesa)} NO",
    ])
    story.append(Paragraph(
        f"<b>Il richiedente intende anticipare la spesa e attivare successivamente procedura di rimborso:</b> {anticip_riga}",
        stile_check,
    ))
    story.append(Spacer(1, 6 * mm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.lightgrey))
    story.append(Spacer(1, 4 * mm))

    # ── Firme ─────────────────────────────────────────────────────────────────
    story.append(Paragraph("<b>FIRME</b>", stile_sezione))

    firme = [
        ("Firma del Richiedente", richiedente, richiesta.data_invio),
    ]
    if richiesta.tipo == "progetto":
        firme.append(("Firma del Responsabile Scientifico di progetto", pi_persona, richiesta.data_approvazione_rs))
    firme.append(("Firma del Direttore di Dipartimento", dir_dip_persona, richiesta.data_approvazione_dir_dip))
    firme.append(("Firma del Direttore Generale", dg_persona, richiesta.data_approvazione_dg))

    for etichetta, persona, quando in firme:
        story.append(Paragraph(f"<b>{etichetta}</b>", stile_normale))
        story.append(Paragraph(f"Approvato da {_nome_persona(persona)} il {_data(quando)}", stile_normale))
        story.append(Spacer(1, 3 * mm))

    doc.build(story)
    return filepath
