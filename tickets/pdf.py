import io
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm, mm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable
)
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.graphics.shapes import Drawing, Circle, String, Rect, Line
from reportlab.graphics import renderPDF

GREEN  = colors.HexColor('#1B5E20')
PINK   = colors.HexColor('#C2185B')
BLACK  = colors.black
WHITE  = colors.white
LGREY  = colors.HexColor('#f0f0f0')


# ── styles ───────────────────────────────────────────────────────────────────

def _styles():
    base = dict(fontName='Helvetica', fontSize=9, leading=12, textColor=BLACK)
    return {
        'normal':      ParagraphStyle('normal',      **base),
        'small':       ParagraphStyle('small',       fontName='Helvetica',      fontSize=8,  leading=10, textColor=BLACK),
        'small_it':    ParagraphStyle('small_it',    fontName='Helvetica-Oblique', fontSize=7, leading=9, textColor=BLACK, alignment=TA_CENTER),
        'bold':        ParagraphStyle('bold',        fontName='Helvetica-Bold', fontSize=9,  leading=12, textColor=BLACK),
        'bold_u':      ParagraphStyle('bold_u',      fontName='Helvetica-Bold', fontSize=9,  leading=12, textColor=BLACK),
        'hdr_green':   ParagraphStyle('hdr_green',   fontName='Helvetica-Bold', fontSize=9,  leading=12, textColor=WHITE,  alignment=TA_CENTER),
        'hdr_grey':    ParagraphStyle('hdr_grey',    fontName='Helvetica-Bold', fontSize=9,  leading=12, textColor=BLACK,  alignment=TA_CENTER),
        'di_line':     ParagraphStyle('di_line',     fontName='Helvetica-Bold', fontSize=10, leading=14, textColor=BLACK),
        'pink':        ParagraphStyle('pink',        fontName='Helvetica-Bold', fontSize=8,  leading=11, textColor=PINK,   alignment=TA_CENTER),
        'title_green': ParagraphStyle('title_green', fontName='Helvetica-Bold', fontSize=14, leading=17, textColor=GREEN,  alignment=TA_CENTER),
        'ref_small':   ParagraphStyle('ref_small',   fontName='Helvetica',      fontSize=7,  leading=10, textColor=BLACK),
        'right_small': ParagraphStyle('right_small', fontName='Helvetica',      fontSize=8,  leading=10, textColor=BLACK,  alignment=TA_RIGHT),
        'section':     ParagraphStyle('section',     fontName='Helvetica-Bold', fontSize=9,  leading=12, textColor=BLACK,  alignment=TA_CENTER),
    }


def _p(text, style, empty='—'):
    val = str(text).strip() if text else empty
    if not val:
        val = empty
    return Paragraph(val, style)


# ── logo BUMIGEB (dessin vectoriel) ──────────────────────────────────────────

def _logo(size=50):
    d = Drawing(size, size)
    r = size / 2
    d.add(Circle(r, r, r - 1, fillColor=GREEN, strokeColor=GREEN, strokeWidth=0))
    d.add(String(r, r - 3, 'BUMIGEB', fontName='Helvetica-Bold', fontSize=7,
                 fillColor=WHITE, textAnchor='middle'))
    return d


# ── carré à cocher ────────────────────────────────────────────────────────────

def _checkbox(checked=False, size=9):
    d = Drawing(size + 4, size + 4)
    d.add(Rect(2, 2, size, size, fillColor=WHITE, strokeColor=BLACK, strokeWidth=0.8))
    if checked:
        d.add(Line(2, 2, size + 2, size + 2, strokeColor=BLACK, strokeWidth=1.2))
        d.add(Line(2, size + 2, size + 2, 2, strokeColor=BLACK, strokeWidth=1.2))
    return d


# ── helper tableau section (titre fond gris centré souligné) ──────────────────

def _section_title(text, width, style):
    t = Table([[Paragraph(f'<u>{text}</u>', style)]], colWidths=[width])
    t.setStyle(TableStyle([
        ('BACKGROUND',    (0, 0), (-1, -1), LGREY),
        ('BOX',           (0, 0), (-1, -1), 0.8, BLACK),
        ('LEFTPADDING',   (0, 0), (-1, -1), 6),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 6),
        ('TOPPADDING',    (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    return t


def _tbl_style(extra=None):
    base = [
        ('GRID',          (0, 0), (-1, -1), 0.8, BLACK),
        ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING',   (0, 0), (-1, -1), 5),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 5),
        ('TOPPADDING',    (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]
    return TableStyle(base + (extra or []))


# ── fonction principale ───────────────────────────────────────────────────────

def generate_ticket_pdf(ticket):
    buffer = io.BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=1.5 * cm,
        rightMargin=1.5 * cm,
        topMargin=1.5 * cm,
        bottomMargin=1.5 * cm,
    )

    W = A4[0] - 3 * cm   # largeur utile
    S = _styles()
    story = []

    # ── données ticket ────────────────────────────────────────────────────────
    created_str = ticket.created_at.strftime('%d/%m/%Y à %H:%M') if ticket.created_at else '—'
    created_date = ticket.created_at.strftime('%d/%m/%Y') if ticket.created_at else '—'

    dept_name = '—'
    if hasattr(ticket.requester, 'department') and ticket.requester.department:
        dept_name = ticket.requester.department.name

    beneficiaire = '—'
    if ticket.assigned_to:
        beneficiaire = f"{ticket.assigned_to.first_name} {ticket.assigned_to.last_name}".strip() or '—'

    equip_code = '—'
    if ticket.equipment:
        equip_code = ticket.equipment.name
        if ticket.equipment.serial_number:
            equip_code += f' ({ticket.equipment.serial_number})'

    last_intv = ticket.interventions.order_by('-date').first()
    tech_name    = '—'
    intv_date    = '—'
    intv_desc    = '—'
    intv_mat     = '—'
    intv_end     = '—'
    intv_amount  = '—'
    intv_po      = '—'

    if last_intv:
        if last_intv.technician:
            tech_name = f"{last_intv.technician.first_name} {last_intv.technician.last_name}".strip() or '—'
        intv_date   = last_intv.date.strftime('%d/%m/%Y à %H:%M') if last_intv.date else '—'
        intv_desc   = last_intv.description or '—'
        intv_mat    = last_intv.materials_provided or '—'
        intv_end    = last_intv.end_time.strftime('%d/%m/%Y à %H:%M') if last_intv.end_time else '—'
        intv_amount = f"{last_intv.amount} FCFA" if last_intv.amount else '—'
        intv_po     = last_intv.purchase_order_number or '—'

    has_eval  = hasattr(ticket, 'evaluation') and ticket.evaluation
    satisfied = has_eval and ticket.evaluation.rating >= 3
    eval_comment = (ticket.evaluation.comment or '') if has_eval else ''

    # ── 1. EN-TÊTE ────────────────────────────────────────────────────────────
    logo_para = Paragraph(
        'BUMIGEB<br/><font size="8">Service Géologique National</font>',
        ParagraphStyle('logo', fontName='Helvetica-Bold', fontSize=16,
                       textColor=GREEN, leading=20, alignment=TA_LEFT),
    )

    centre_block = [
        Paragraph('PROCESSUS GERER LE SYSTEME D\'INFORMATION',
                  ParagraphStyle('pink_hdr', fontName='Helvetica-Bold', fontSize=9,
                                 textColor=PINK, leading=12, alignment=TA_CENTER)),
        Paragraph('Demande d\'intervention SI',
                  ParagraphStyle('green_title', fontName='Helvetica-Bold', fontSize=13,
                                 textColor=GREEN, leading=16, alignment=TA_CENTER)),
    ]

    ref_para = Paragraph(
        'Référence : BUMIGEB/PS-SI/FO01<br/>Version : V04<br/>Date : 05/03/2024',
        S['ref_small'],
    )

    header_data = [[logo_para, centre_block, ref_para]]
    header_table = Table(header_data, colWidths=[120, 250, 130])
    header_table.setStyle(TableStyle([
        ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING',   (0, 0), (-1, -1), 8),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 8),
        ('TOPPADDING',    (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('BOX',           (2, 0), (2, 0),   0.5, BLACK),
        ('LINEBELOW',     (0, 0), (-1, 0),  1.0, BLACK),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 6))

    # ── 2. LIGNE DI N° / DATE ─────────────────────────────────────────────────
    story.append(_p(
        f'DEMANDE D\'INTERVENTION (DI) N° {ticket.ticket_number}'
        f'     '
        f'DATE {created_date}',
        S['di_line']
    ))
    story.append(Spacer(1, 6))

    # ── 3. TABLEAU SERVICE DEMANDEUR / BÉNÉFICIAIRE ───────────────────────────
    info_data = [
        [_p('SERVICE DEMANDEUR', S['bold']), _p(dept_name, S['normal'])],
        [_p('BENEFICIAIRE',      S['bold']), _p(beneficiaire, S['normal'])],
    ]
    info_table = Table(info_data, colWidths=[W * 0.35, W * 0.65])
    info_table.setStyle(_tbl_style([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 6))

    # ── 4. TABLEAU 4 COLONNES ─────────────────────────────────────────────────
    cw = W / 4
    detail_data = [
        [
            _p('DESIGNATION',     S['hdr_grey']),
            _p('CODE MATERIEL',   S['hdr_grey']),
            _p('DEFAUTS SIGNALES',S['hdr_grey']),
            _p('OBSERVATIONS',    S['hdr_grey']),
        ],
        [
            _p(ticket.title,                  S['small']),
            _p(equip_code,                    S['small']),
            _p(ticket.description,            S['small']),
            _p(ticket.observations or '—',    S['small']),
        ],
    ]
    detail_table = Table(detail_data, colWidths=[cw] * 4,
                         rowHeights=[None, 60])
    detail_table.setStyle(_tbl_style([
        ('FONTNAME',      (0, 0), (-1, 0),   'Helvetica-Bold'),
        ('BACKGROUND',    (0, 0), (-1, 0),   LGREY),
        ('VALIGN',        (0, 1), (-1, 1),   'TOP'),
    ]))
    story.append(detail_table)
    story.append(Spacer(1, 6))

    # ── 5. RÉSERVÉ AUX SERVICES TECHNIQUES ───────────────────────────────────
    story.append(_section_title('RESERVE AUX SERVICES TECHNIQUES', W, S['section']))

    meta_lines = [
        f'Nom et prénom de l\'intervenant : {tech_name}',
        f'Date et Heure de réception de la fiche : {created_str}',
        f'Date d\'intervention : {intv_date}',
    ]
    for line in meta_lines:
        story.append(_p(line, S['normal']))
    story.append(Spacer(1, 4))

    travaux_data = [
        [_p('TRAVAUX A EFFECTUER', S['hdr_grey']), _p('MATERIELS A FOURNIR', S['hdr_grey'])],
        [_p(intv_desc, S['small']),                _p(intv_mat, S['small'])],
    ]
    travaux_table = Table(travaux_data, colWidths=[W * 0.5, W * 0.5],
                          rowHeights=[None, 60])
    travaux_table.setStyle(_tbl_style([
        ('FONTNAME',   (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BACKGROUND', (0, 0), (-1, 0), LGREY),
        ('VALIGN',     (0, 1), (-1, 1), 'TOP'),
    ]))
    story.append(travaux_table)
    story.append(Spacer(1, 6))

    # ── 6. RÉSERVÉ AU BÉNÉFICIAIRE ────────────────────────────────────────────
    benef_header = Table([[
        Paragraph('<u>RESERVE AU BENEFICIAIRE</u>', S['bold_u']),
        Paragraph('<u>VISA DU BENEFICIAIRE :</u>',  S['right_small']),
    ]], colWidths=[W * 0.55, W * 0.45])
    benef_header.setStyle(TableStyle([
        ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING',   (0, 0), (-1, -1), 0),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 0),
        ('TOPPADDING',    (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ('BOX',           (0, 0), (-1, -1), 0.8, BLACK),
        ('BACKGROUND',    (0, 0), (-1, -1), LGREY),
        ('LEFTPADDING',   (0, 0), (0, 0),   6),
        ('RIGHTPADDING',  (1, 0), (1, 0),   6),
    ]))
    story.append(benef_header)

    story.append(_p(f'Date et Heure de fin d\'intervention : {intv_end}', S['normal']))
    story.append(Spacer(1, 4))

    # Cases à cocher Satisfait / Insatisfait
    cb_sat   = _checkbox(checked=(has_eval and satisfied),     size=9)
    cb_insat = _checkbox(checked=(has_eval and not satisfied), size=9)

    sat_row = Table(
        [[cb_sat,   _p('Satisfait',   S['normal']),
          cb_insat, _p('Insatisfait', S['normal'])]],
        colWidths=[14, W * 0.35, 14, W * 0.35],
    )
    sat_row.setStyle(TableStyle([
        ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING',   (0, 0), (-1, -1), 2),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 2),
        ('TOPPADDING',    (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))
    story.append(sat_row)

    dots = '.' * 70
    story.append(_p(f'Si insatisfait pourquoi ? {dots}', S['small']))
    story.append(_p('.' * 80, S['small']))
    story.append(Spacer(1, 6))

    # ── 7. RÉSERVÉ AU SERVICE D'APPROVISIONNEMENT ─────────────────────────────
    story.append(_section_title(
        'RESERVE AU SERVICE D\'APPROVISIONNEMENT ET ENGAGEMENT¹',
        W, S['section']
    ))

    appro_data = [[
        _p(f'COÛT : {intv_amount}',  S['bold']),
        _p(f'N°BC : {intv_po}',      S['bold']),
    ]]
    appro_table = Table(appro_data, colWidths=[W * 0.5, W * 0.5],
                        rowHeights=[40])
    appro_table.setStyle(_tbl_style([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(appro_table)
    story.append(_p('¹ En cas de besoin', S['small']))
    story.append(Spacer(1, 10))

    # ── 8. PIED DE PAGE ───────────────────────────────────────────────────────
    story.append(HRFlowable(width=W, thickness=0.8, color=BLACK))
    story.append(Spacer(1, 3))

    footer_data = [[
        Paragraph(
            '<i>Avant utilisation d\'un document papier, vérifier sa validité</i>',
            S['small_it']
        ),
        Paragraph('1 | 1', S['right_small']),
    ]]
    footer_table = Table(footer_data, colWidths=[W * 0.80, W * 0.20])
    footer_table.setStyle(TableStyle([
        ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING',   (0, 0), (-1, -1), 0),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 0),
        ('TOPPADDING',    (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(footer_table)

    doc.build(story)
    buffer.seek(0)
    return buffer
