import io
import csv
from datetime import datetime, timezone
import pandas as pd
from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether

def generate_csv_report(plots_data: list[dict]) -> str:
    """
    Generates a RFC 4180 compliant CSV string for export.
    """
    output = io.StringIO()
    if not plots_data:
        return ""
        
    keys = [
        "plot_id", "region", "plot_type", "tree_count",
        "estimated_agb_kg", "lower_ci_95_kg", "upper_ci_95_kg", "relative_uncertainty_pct",
        "uncertainty_score", "data_quality_score", "biomass_impact_score",
        "composite_priority_score", "priority_level", "priority_rank",
        "recommended_action", "verification_status"
    ]
    
    writer = csv.DictWriter(output, fieldnames=keys, extrasaction='ignore')
    writer.writeheader()
    for row in plots_data:
        writer.writerow(row)
        
    return output.getvalue()

def generate_pdf_report(
    summary_data: dict,
    plots_data: list[dict],
    officer_name: str = "Chief MRV Verifier"
) -> bytes:
    """
    Generates a professional Blue Carbon MRV Verification Prioritization Audit Report (PDF).
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(letter),
        rightMargin=30,
        leftMargin=30,
        topMargin=30,
        bottomMargin=30
    )
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontSize=18,
        leading=22,
        textColor=colors.HexColor('#064e3b'), # Forest Green / Teal
        fontName='Helvetica-Bold'
    )
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#334155'),
        fontName='Helvetica'
    )
    section_style = ParagraphStyle(
        'DocSection',
        parent=styles['Heading2'],
        fontSize=13,
        leading=16,
        textColor=colors.HexColor('#0f172a'),
        fontName='Helvetica-Bold'
    )
    cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontSize=8,
        leading=10,
        fontName='Helvetica'
    )
    cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontSize=8,
        leading=10,
        fontName='Helvetica-Bold'
    )
    
    elements = []
    
    # Header Banner
    elements.append(Paragraph("BLUE CARBON MRV SYSTEM — VERIFICATION PRIORITIZATION AUDIT REPORT", title_style))
    elements.append(Paragraph(
        f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')} | "
        f"Framework: Uncertainty-Aware Tri-Indicator Optimization (Chave et al. 2014) | "
        f"Auditor: {officer_name}",
        subtitle_style
    ))
    elements.append(Spacer(1, 15))
    
    # Executive KPI Summary Table
    total_plots = summary_data.get("total_plots", len(plots_data))
    high_p = summary_data.get("high_priority_count", 0)
    med_p = summary_data.get("medium_priority_count", 0)
    low_p = summary_data.get("low_priority_count", 0)
    mean_score = summary_data.get("mean_priority_score", 0.0)
    mean_unc = summary_data.get("mean_uncertainty_pct", 0.0)
    total_biomass = summary_data.get("total_biomass_tonnes", 0.0)
    
    kpi_data = [
        [
            Paragraph("<b>Total Mangrove Plots</b>", cell_style),
            Paragraph(f"{total_plots}", cell_bold),
            Paragraph("<b>High Priority Audit Plots</b>", cell_style),
            Paragraph(f"<font color='#dc2626'><b>{high_p}</b></font>", cell_bold),
            Paragraph("<b>Total Aboveground Biomass (AGB)</b>", cell_style),
            Paragraph(f"{total_biomass:,.2f} Mg", cell_bold)
        ],
        [
            Paragraph("<b>Mean Composite Score</b>", cell_style),
            Paragraph(f"{mean_score:.1f} / 100", cell_bold),
            Paragraph("<b>Med / Low Priority Plots</b>", cell_style),
            Paragraph(f"{med_p} Med / {low_p} Low", cell_bold),
            Paragraph("<b>Mean Relative Uncertainty (95% CI)</b>", cell_style),
            Paragraph(f"±{mean_unc:.2f}%", cell_bold)
        ]
    ]
    
    kpi_table = Table(kpi_data, colWidths=[130, 90, 130, 90, 150, 110])
    kpi_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#cbd5e1')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(kpi_table)
    elements.append(Spacer(1, 15))
    
    # Priority Ranking Table (Top Plots)
    elements.append(Paragraph("PRIORITIZED MANGROVE PLOT AUDIT SCHEDULE (Top Ranked Entries)", section_style))
    elements.append(Spacer(1, 6))
    
    table_headers = [
        Paragraph("<b>Rank</b>", cell_bold),
        Paragraph("<b>Plot ID</b>", cell_bold),
        Paragraph("<b>Region</b>", cell_bold),
        Paragraph("<b>Type</b>", cell_bold),
        Paragraph("<b>AGB (kg)</b>", cell_bold),
        Paragraph("<b>95% CI (kg)</b>", cell_bold),
        Paragraph("<b>Rel Unc</b>", cell_bold),
        Paragraph("<b>DQ Score</b>", cell_bold),
        Paragraph("<b>Priority</b>", cell_bold),
        Paragraph("<b>Priority Level</b>", cell_bold),
        Paragraph("<b>Verification Action</b>", cell_bold)
    ]
    
    rows = [table_headers]
    
    # Render top 25 prioritized plots in PDF
    for idx, p in enumerate(plots_data[:28]):
        rank = p.get("priority_rank", idx + 1)
        pid = p.get("plot_id", "")
        reg = p.get("region", "").split()[0]
        ptype = p.get("plot_type", "")
        agb = f"{p.get('estimated_agb_kg', 0):,.1f}"
        ci = f"[{p.get('lower_ci_95_kg', 0):,.0f} - {p.get('upper_ci_95_kg', 0):,.0f}]"
        unc = f"{p.get('relative_uncertainty_pct', 0):.1f}%"
        dq = f"{p.get('data_quality_score', 0):.1f}"
        score = f"{p.get('composite_priority_score', 0):.1f}"
        level = p.get("priority_level", "Medium")
        
        level_color = "#dc2626" if "High" in level else ("#d97706" if "Medium" in level else "#16a34a")
        level_cell = Paragraph(f"<font color='{level_color}'><b>{level}</b></font>", cell_style)
        
        action = p.get("recommended_action", "").split(":")[0]
        
        rows.append([
            Paragraph(str(rank), cell_style),
            Paragraph(f"<b>{pid}</b>", cell_style),
            Paragraph(reg, cell_style),
            Paragraph(ptype, cell_style),
            Paragraph(agb, cell_style),
            Paragraph(ci, cell_style),
            Paragraph(unc, cell_style),
            Paragraph(dq, cell_style),
            Paragraph(f"<b>{score}</b>", cell_style),
            level_cell,
            Paragraph(action, cell_style)
        ])
        
    table = Table(rows, colWidths=[30, 60, 75, 55, 65, 95, 50, 45, 50, 80, 145])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#064e3b')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')])
    ]))
    
    # Change header text color to white
    table_headers_white = [
        Paragraph("<b>Rank</b>", ParagraphStyle('W', parent=cell_bold, textColor=colors.white)),
        Paragraph("<b>Plot ID</b>", ParagraphStyle('W', parent=cell_bold, textColor=colors.white)),
        Paragraph("<b>Region</b>", ParagraphStyle('W', parent=cell_bold, textColor=colors.white)),
        Paragraph("<b>Type</b>", ParagraphStyle('W', parent=cell_bold, textColor=colors.white)),
        Paragraph("<b>AGB (kg)</b>", ParagraphStyle('W', parent=cell_bold, textColor=colors.white)),
        Paragraph("<b>95% CI (kg)</b>", ParagraphStyle('W', parent=cell_bold, textColor=colors.white)),
        Paragraph("<b>Rel Unc</b>", ParagraphStyle('W', parent=cell_bold, textColor=colors.white)),
        Paragraph("<b>DQ Score</b>", ParagraphStyle('W', parent=cell_bold, textColor=colors.white)),
        Paragraph("<b>Priority</b>", ParagraphStyle('W', parent=cell_bold, textColor=colors.white)),
        Paragraph("<b>Priority Level</b>", ParagraphStyle('W', parent=cell_bold, textColor=colors.white)),
        Paragraph("<b>Verification Action</b>", ParagraphStyle('W', parent=cell_bold, textColor=colors.white))
    ]
    rows[0] = table_headers_white
    
    elements.append(table)
    elements.append(Spacer(1, 15))
    
    # Sign-off & Blockchain Audit Block
    footer_text = (
        "<b>LEGAL & BLOCKCHAIN AUDIT NOTE:</b> All Aboveground Biomass calculations utilize the Chave et al. (2014) "
        "allometric standard. Individual plot hashes and audit decisions are immutably anchored to the distributed "
        "ledger. Total Ecosystem Carbon Stock estimation requires additional soil organic carbon (SOC) and belowground "
        "biomass (BGB) core analyses and is deliberately segregated from this AGB inventory."
    )
    elements.append(Paragraph(footer_text, subtitle_style))
    
    doc.build(elements)
    return buffer.getvalue()
