# backend/app/services/pdf_rimborso_spesa.py
import os
from sqlalchemy.orm import Session
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, Image
from reportlab.lib.enums import TA_CENTER, TA_RIGHT

from app.services.pdf_autorizzazione import LOGO_PATH, _euro, _data, _nome_persona, _persona_pi, _persona_dg


def genera_pdf_rimborso_spesa(richiesta, db: Session, output_dir: str) -> str:
    """
    Genera il PDF della Scheda Richiesta di Rimborso (Allegato E2), compilato con i dati
    della richiesta di rimborso, dell'autorizzazione di spesa collegata e le date di
    approvazione del flusso di firme.
    Restituisce il path del file generato.
    """
    os.makedirs(output_dir, exist_ok=True)
    filename = f"RimborsoSpesa_{str(richiesta.id)[:8]}.pdf"
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
    stile_piccolo = ParagraphStyle("PiccoloDoc", parent=styles["Normal"], fontSize=8)

    ras = richiesta.richiesta_autorizzazione
    richiedente = richiesta.richiedente
    nome_richiedente = _nome_persona(richiedente)
    dir_dip_persona = ras.dipartimento.direttore if ras.dipartimento else None
    dir_dip_nome = _nome_persona(dir_dip_persona)
    pi_persona = _persona_pi(ras, db) if ras.tipo == "progetto" else None
    dg_persona = _persona_dg(db)

    # Il sottoscrittore della richiesta è il Responsabile Scientifico per i progetti
    # (il richiedente resta il beneficiario del compenso), oppure il titolare
    # del Fondo per la Ricerca Individuale, che coincide col richiedente.
    firmatario = pi_persona if (ras.tipo == "progetto" and pi_persona) else richiedente
    nome_firmatario = _nome_persona(firmatario)

    totale_righe = sum(float(r.importo) for r in richiesta.righe)

    story = []

    # ── Intestazione ──────────────────────────────────────────────────────────
    if os.path.exists(LOGO_PATH):
        img = Image(LOGO_PATH, width=40 * mm, height=40 * mm * 148 / 374)
        img.hAlign = "CENTER"
        story.append(img)
        story.append(Spacer(1, 2 * mm))

    story.append(Paragraph("<u><b>ALLEGATO E2 — SCHEDA RICHIESTA DI RIMBORSO</b></u>", stile_titolo))
    story.append(Spacer(1, 3 * mm))

    # ── Destinatari ───────────────────────────────────────────────────────────
    story.append(Paragraph(f"Al Direttore del Dipartimento di {ras.dipartimento.nome if ras.dipartimento else '—'}, Prof. {dir_dip_nome};", stile_dest))
    story.append(Paragraph("p.c. All'Ufficio del Personale, All'Ufficio AFC, All'Ufficio Ricerca;", stile_dest))
    story.append(Paragraph("Direttore Generale dell'Università Telematica Pegaso;", stile_dest))
    story.append(Spacer(1, 2 * mm))
    story.append(Paragraph("SEDE: Centro Direzionale isola F2, SNC — 80143, Napoli", stile_dest))
    story.append(Spacer(1, 4 * mm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.lightgrey))
    story.append(Spacer(1, 3 * mm))

    # ── Riferimento autorizzazione ───────────────────────────────────────────
    if ras.progetto:
        dati_rif = [
            ["Progetto:", ras.progetto.titolo or "—"],
            ["CUP/ID:", ras.progetto.cup or "—"],
            ["Autorizzazione di spesa:", ras.oggetto],
            ["Importo autorizzato:", _euro(ras.importo)],
            ["Approvata il:", _data(ras.data_approvazione_dg)],
        ]
    else:
        dati_rif = [
            ["Fondo per la Ricerca Individuale del:", nome_richiedente],
            ["Autorizzazione di spesa:", ras.oggetto],
            ["Importo autorizzato:", _euro(ras.importo)],
            ["Approvata il:", _data(ras.data_approvazione_dg)],
        ]

    t_rif = Table(dati_rif, colWidths=[50 * mm, None])
    t_rif.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("GRID", (0, 0), (-1, -1), 0.3, colors.lightgrey),
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f5f5f5")),
    ]))
    story.append(t_rif)
    story.append(Spacer(1, 4 * mm))

    # ── Richiedente ───────────────────────────────────────────────────────────
    qualita = "Responsabile Scientifico del Progetto in epigrafe" if ras.tipo == "progetto" else "titolare del Fondo per la Ricerca Individuale in epigrafe"
    story.append(Paragraph(f"Io sottoscritta/o {nome_firmatario}", stile_normale))
    story.append(Paragraph(f"Email: {firmatario.email if firmatario else '—'}", stile_normale))
    story.append(Spacer(1, 2 * mm))
    story.append(Paragraph(f"In qualità di {qualita}, con la presente", stile_normale))
    story.append(Spacer(1, 2 * mm))
    story.append(Paragraph("<b>CHIEDO</b>", stile_sezione))
    story.append(Paragraph(f"Che venga erogato il compenso di Euro: {_euro(totale_righe)}", stile_normale))
    story.append(Paragraph(f"Al/alla Dottore/Dottoressa/Prof./Prof.ssa: {nome_richiedente}", stile_normale))
    story.append(Spacer(1, 3 * mm))

    # ── Tabella spese ─────────────────────────────────────────────────────────
    intestazione = ["Descrizione", "Data", "Importo €"]
    righe_tabella = [intestazione]
    for r in richiesta.righe:
        righe_tabella.append([r.descrizione, _data(r.data), _euro(r.importo).replace(" €", "")])
    righe_tabella.append(["", "Totale", _euro(totale_righe).replace(" €", "")])

    t_spese = Table(righe_tabella, colWidths=[100 * mm, 30 * mm, 30 * mm])
    t_spese.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ALIGN", (1, 0), (-1, -1), "CENTER"),
        ("ALIGN", (2, 0), (2, -1), "RIGHT"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("GRID", (0, 0), (-1, -1), 0.3, colors.lightgrey),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f5f5f5")),
        ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#f5f5f5")),
        ("SPAN", (0, -1), (1, -1)),
    ]))
    story.append(t_spese)
    story.append(Spacer(1, 4 * mm))

    if richiesta.note:
        story.append(Paragraph(f"<b>Note:</b> {richiesta.note}", stile_normale))
        story.append(Spacer(1, 3 * mm))

    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.lightgrey))
    story.append(Spacer(1, 3 * mm))

    story.append(Paragraph("<b>A tal fine si allegano i giustificativi di spesa.</b>", stile_normale))
    story.append(Paragraph("Si richiede il parere favorevole dell'Amministrazione di codesto Ateneo per il relativo pagamento.", stile_normale))
    story.append(Spacer(1, 6 * mm))

    # ── Firme ─────────────────────────────────────────────────────────────────
    story.append(Paragraph("<b>FIRME</b>", stile_sezione))

    firme = [
        ("Firma del Richiedente", richiedente, richiesta.data_invio),
    ]
    if ras.tipo == "progetto":
        firme.append(("Firma del Responsabile Scientifico di progetto", pi_persona, richiesta.data_approvazione_rs))
    firme.append(("Firma del Direttore di Dipartimento", dir_dip_persona, richiesta.data_approvazione_dir_dip))
    firme.append(("Firma del Direttore Generale", dg_persona, richiesta.data_approvazione_dg))

    for etichetta, persona, quando in firme:
        story.append(Paragraph(f"<b>{etichetta}</b>", stile_normale))
        story.append(Paragraph(f"Approvato da {_nome_persona(persona)} il {_data(quando)}", stile_normale))
        story.append(Spacer(1, 3 * mm))

    story.append(Spacer(1, 2 * mm))
    story.append(Paragraph("Richiesta Prot. n. _______________ del _______________", stile_piccolo))

    doc.build(story)
    return filepath
