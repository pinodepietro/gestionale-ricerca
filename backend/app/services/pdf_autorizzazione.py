# backend/app/services/pdf_autorizzazione.py
import os
from datetime import date
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

MACROCATEGORIE = {
    "personale": "MACROCATEGORIA PERSONALE",
    "spese_generali": "MACROCATEGORIA SPESE GENERALI",
    "consulenze_servizi": "MACROCATEGORIA ACQUISIZIONE DI CONSULENZE E/O SERVIZI",
    "strumentazioni": "MACROCATEGORIA STRUMENTAZIONI E ATTREZZATURE",
}

VOCI_DESCRIZIONE = {
    "a": "a) Contratti di Ricerca",
    "b": "b) RTDA",
    "c": "c) RTD o forme analoghe",
    "d": "d) Assegni di ricerca",
    "e": "e) Borse di ricerca",
    "f": "f) Co.Co.Co/Co.Co.Pro",
    "g": "g) Incentivazione Personale Docente",
    "h": "h) Altro",
    "i": "i) Consulenze",
    "j": "j) Prestazioni Professionali",
    "k": "k) Contratti di edizione per articoli e libri (Pubblicazioni)",
    "l": "l) Materiali di consumo",
    "m": "m) Altro",
    "n": "n) Consulenze",
    "o": "o) Prestazioni Professionali",
    "p": "p) Altro",
    "q": "q) PC",
    "r": "r) Software",
    "s": "s) Server",
    "t": "t) Arredi",
    "u": "u) Altro",
}

QUALITA_LABEL = {
    "professore_ordinario": "Professore Ordinario",
    "professore_associato": "Professore Associato",
    "ricercatore": "Ricercatore",
}

SEZIONE1_VOCI = set("abcdefhijknop")
SEZIONE2_VOCI = set("lmqrstu")


def _campo(label: str, valore: str, styles) -> list:
    """Riga campo con label grassetto e valore."""
    return [
        Paragraph(f"<b>{label}:</b> {valore or '—'}", styles["Normal"]),
        Spacer(1, 2 * mm),
    ]


def genera_pdf_autorizzazione(richiesta, output_dir: str) -> str:
    """
    Genera il PDF del Modulo Richiesta Autorizzazione alla Spesa.
    Restituisce il path del file generato.
    """
    os.makedirs(output_dir, exist_ok=True)
    filename = f"AutorizzazioneSpesa_{str(richiesta.id)[:8]}.pdf"
    filepath = os.path.join(output_dir, filename)

    doc = SimpleDocTemplate(
        filepath,
        pagesize=A4,
        leftMargin=20 * mm, rightMargin=20 * mm,
        topMargin=15 * mm, bottomMargin=15 * mm,
    )

    styles = getSampleStyleSheet()
    stile_titolo = ParagraphStyle("Titolo", parent=styles["Heading1"], fontSize=13,
                                  alignment=TA_CENTER, spaceAfter=6)
    stile_sezione = ParagraphStyle("Sezione", parent=styles["Heading2"], fontSize=10,
                                   spaceBefore=8, spaceAfter=4, textColor=colors.HexColor("#1a3d6e"))
    stile_normale = ParagraphStyle("Normale", parent=styles["Normal"], fontSize=9, leading=13)
    stile_firma = ParagraphStyle("Firma", parent=styles["Normal"], fontSize=9,
                                 alignment=TA_RIGHT, spaceBefore=8)
    stile_piccolo = ParagraphStyle("Piccolo", parent=styles["Normal"], fontSize=8,
                                   textColor=colors.grey)
    styles.add(stile_titolo, "TitoloDoc")
    styles.add(stile_normale, "Normale")

    story = []

    # ── Intestazione ──────────────────────────────────────────────────────────
    story.append(Paragraph("Università Telematica Pegaso", stile_titolo))
    story.append(Paragraph("<u><b>MODULO RICHIESTA AUTORIZZAZIONE ALLA SPESA</b></u>", stile_titolo))
    story.append(Spacer(1, 4 * mm))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#1a3d6e")))
    story.append(Spacer(1, 3 * mm))

    # Destinatari
    dip_nome = richiesta.dipartimento.nome if richiesta.dipartimento else "—"
    dir_dip = f"{richiesta.dipartimento.direttore.cognome} {richiesta.dipartimento.direttore.nome}" \
        if richiesta.dipartimento and richiesta.dipartimento.direttore else "—"
    rs_nome = "—"
    if richiesta.progetto:
        from app.models.personale import Allocazione
        from app.models.persona import Persona as P
        # Non possiamo fare query qui, usiamo il dato serializzato
        pass

    dest_data = [
        ["A:", f"Direttore del Dipartimento di {dip_nome}, Prof. {dir_dip}"],
        ["", "Responsabile Scientifico del Progetto"],
        ["", "Direttore Generale dell'Università Telematica Pegaso"],
        ["", "Magnifico Rettore dell'Università Telematica Pegaso"],
        ["", "Ufficio Ricerca (ufficio.ricerca@unipegaso.it)"],
    ]
    dest_table = Table(dest_data, colWidths=[15 * mm, None])
    dest_table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
    ]))
    story.append(dest_table)
    story.append(Spacer(1, 4 * mm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.lightgrey))
    story.append(Spacer(1, 3 * mm))

    # ── Richiedente ───────────────────────────────────────────────────────────
    story.append(Paragraph("<b>DATI DEL RICHIEDENTE</b>", stile_sezione))
    richiedente = richiesta.richiedente
    nome_richiedente = f"{richiedente.cognome} {richiedente.nome}" if richiedente else "—"
    qualita = QUALITA_LABEL.get(richiesta.qualita_richiedente, richiesta.qualita_richiedente)
    contratto = "Pieno" if richiesta.tipo_contratto == "pieno" else "Definito"

    dati_rich = [
        ["Il sottoscritto:", nome_richiedente, "In qualità di:", qualita],
        ["A tempo:", contratto, "", ""],
    ]
    t = Table(dati_rich, colWidths=[35 * mm, 70 * mm, 30 * mm, None])
    t.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (2, 0), (2, 0), "Helvetica-Bold"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    story.append(t)
    story.append(Spacer(1, 3 * mm))

    # ── Progetto ──────────────────────────────────────────────────────────────
    story.append(Paragraph("<b>DATI DEL PROGETTO</b>", stile_sezione))
    if richiesta.progetto:
        p = richiesta.progetto
        dati_prog = [
            ["Progetto:", p.titolo or "—"],
            ["CUP/ID:", p.cup or "—"],
            ["Bando:", p.riferimento_bando or "—"],
            ["In qualità di:", richiesta.qualita_progetto or "—"],
        ]
    else:
        dati_prog = [["Tipo richiesta:", "Fondi individuali"]]

    t2 = Table(dati_prog, colWidths=[35 * mm, None])
    t2.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    story.append(t2)
    story.append(Spacer(1, 3 * mm))

    # ── Tipo di spesa ─────────────────────────────────────────────────────────
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.lightgrey))
    story.append(Paragraph("<b>CHIEDE AUTORIZZAZIONE A EFFETTUARE LA SEGUENTE SPESA</b>", stile_sezione))

    macro_label = MACROCATEGORIE.get(richiesta.macrocategoria, richiesta.macrocategoria)
    voce_label = VOCI_DESCRIZIONE.get(richiesta.voce_lettera, richiesta.voce_lettera)
    if richiesta.voce_altro:
        voce_label += f": {richiesta.voce_altro}"

    story.append(Paragraph(f"<b>{macro_label}:</b> {voce_label}", stile_normale))
    story.append(Spacer(1, 4 * mm))

    # ── Dettagli spesa ────────────────────────────────────────────────────────
    voce = richiesta.voce_lettera
    if voce in SEZIONE1_VOCI:
        story.append(Paragraph("<b>Sezione 1 — Dettagli della richiesta</b>", stile_sezione))
        dati_sp = [
            ["Oggetto:", richiesta.oggetto],
            ["Descrizione:", richiesta.descrizione],
            ["Importo:", f"€ {float(richiesta.importo):,.2f}"],
        ]
        if richiesta.durata_da or richiesta.durata_a:
            da = richiesta.durata_da.strftime("%d/%m/%Y") if richiesta.durata_da else "—"
            a = richiesta.durata_a.strftime("%d/%m/%Y") if richiesta.durata_a else "—"
            dati_sp.append(["Durata:", f"Dal {da} al {a}"])
        if richiesta.termini_pagamento:
            dati_sp.append(["Termini di pagamento:", richiesta.termini_pagamento])
    else:
        story.append(Paragraph("<b>Sezione 2 — Dettagli della richiesta</b>", stile_sezione))
        dati_sp = [
            ["Oggetto:", richiesta.oggetto],
            ["Descrizione:", richiesta.descrizione],
            ["Importo:", f"€ {float(richiesta.importo):,.2f}"],
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
    anticip = "SÌ" if richiesta.anticipazione_spesa else "NO"
    story.append(Paragraph(f"<b>Il richiedente intende anticipare la spesa e richiedere successivo rimborso:</b> {anticip}", stile_normale))
    story.append(Spacer(1, 6 * mm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.lightgrey))
    story.append(Spacer(1, 4 * mm))

    # ── Firme ─────────────────────────────────────────────────────────────────
    story.append(Paragraph("<b>FIRME</b>", stile_sezione))
    firme_data = [
        ["Firma del Richiedente", "Firma del Responsabile Scientifico"],
        ["\n\n\n_______________________", "\n\n\n_______________________"],
        ["Luogo e Data: ___________", "Luogo e Data: ___________"],
        ["", ""],
        ["Firma del Direttore di Dipartimento", "Firma del Direttore Generale"],
        ["\n\n\n_______________________", "\n\n\n_______________________"],
        ["Luogo e Data: ___________", "Luogo e Data: ___________"],
    ]
    t_firme = Table(firme_data, colWidths=[None, None])
    t_firme.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME", (0, 4), (-1, 4), "Helvetica-Bold"),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]))
    story.append(t_firme)

    # ── Footer ────────────────────────────────────────────────────────────────
    story.append(Spacer(1, 6 * mm))
    story.append(HRFlowable(width="100%", thickness=0.3, color=colors.lightgrey))
    story.append(Paragraph(
        f"Documento generato il {date.today().strftime('%d/%m/%Y')} — Università Telematica Pegaso — Gestionale Ricerca",
        stile_piccolo,
    ))

    doc.build(story)
    return filepath
