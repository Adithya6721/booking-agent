"""
email_service.py
────────────────
Sends booking confirmation emails via Resend API.

Interview Crux:
  We use Resend (not SMTP) because it gives us delivery tracking, 
  bounce handling, and rich HTML emails without managing an SMTP server.
  The email is built as a pure HTML string — no template engine needed.
  PDF attachment is generated in-memory using Python's reportlab library,
  encoded as base64 (the only format email protocols understand for binary),
  and attached via Resend's attachments field.

  The "from" domain is Resend's shared sandbox (onboarding@resend.dev),
  which works instantly without DNS verification — ideal for dev/student projects.
  In production, you'd swap this for a verified custom domain.
"""

import os, base64, uuid
from datetime import datetime
from dotenv import load_dotenv
import requests

load_dotenv()

RESEND_API_KEY   = os.getenv("RESEND_API_KEY")
RESEND_SEND_URL  = "https://api.resend.com/emails"
FROM_EMAIL       = "Voyager Travel <onboarding@resend.dev>"


# ── PDF Generator ─────────────────────────────────────────────────────────────
def generate_itinerary_pdf(itinerary: list, booking: dict) -> bytes:
    """
    Builds a lightweight PDF itinerary in-memory using reportlab.
    Returns raw bytes — no file is ever written to disk.

    Interview Crux:
      reportlab draws PDFs programmatically (like a canvas).
      We write to an io.BytesIO buffer instead of a file path,
      then return .getvalue() as raw bytes for the email attachment.
    """
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib.units import cm
        import io

        buf = io.BytesIO()
        doc = SimpleDocTemplate(buf, pagesize=A4,
                                topMargin=2*cm, bottomMargin=2*cm,
                                leftMargin=2*cm, rightMargin=2*cm)

        styles = getSampleStyleSheet()
        title_style  = ParagraphStyle("title",  fontSize=22, fontName="Helvetica-Bold",
                                      textColor=colors.HexColor("#1a1a2e"), spaceAfter=6)
        sub_style    = ParagraphStyle("sub",    fontSize=11, fontName="Helvetica",
                                      textColor=colors.HexColor("#4a4a6a"), spaceAfter=4)
        day_style    = ParagraphStyle("day",    fontSize=13, fontName="Helvetica-Bold",
                                      textColor=colors.HexColor("#6366f1"), spaceAfter=4, spaceBefore=12)
        body_style   = ParagraphStyle("body",   fontSize=10, fontName="Helvetica",
                                      textColor=colors.HexColor("#333333"), leading=16)

        story = []

        # Header
        story.append(Paragraph("✈️ Voyager — Trip Itinerary", title_style))
        story.append(Paragraph(
            f"{booking.get('from_city','?')} → {booking.get('to_city','?')} &nbsp;|&nbsp; "
            f"{booking.get('start_date','?')} – {booking.get('end_date','?')}",
            sub_style))
        story.append(Paragraph(
            f"Travelers: {booking.get('travelers',1)} &nbsp;|&nbsp; Booking Ref: <b>{booking.get('pnr','N/A')}</b>",
            sub_style))
        story.append(Spacer(1, 0.5*cm))

        # Itinerary days
        for day in itinerary:
            story.append(Paragraph(f"Day {day.get('day','')} — {day.get('title','')}", day_style))
            story.append(Paragraph(day.get("description",""), body_style))
            story.append(Spacer(1, 0.2*cm))

            # Schedule table
            table_data = [["Time", "Activity", "Tip"]]
            for slot in day.get("schedule", []):
                table_data.append([
                    Paragraph(slot.get("time",""), body_style),
                    Paragraph(slot.get("activity",""), body_style),
                    Paragraph(slot.get("tip",""), body_style),
                ])

            t = Table(table_data, colWidths=[3.5*cm, 9*cm, 5*cm])
            t.setStyle(TableStyle([
                ("BACKGROUND",  (0,0), (-1,0), colors.HexColor("#6366f1")),
                ("TEXTCOLOR",   (0,0), (-1,0), colors.white),
                ("FONTNAME",    (0,0), (-1,0), "Helvetica-Bold"),
                ("FONTSIZE",    (0,0), (-1,-1), 9),
                ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.HexColor("#f8f9ff"), colors.white]),
                ("GRID",        (0,0), (-1,-1), 0.5, colors.HexColor("#e0e0f0")),
                ("VALIGN",      (0,0), (-1,-1), "TOP"),
                ("LEFTPADDING", (0,0), (-1,-1), 6),
                ("RIGHTPADDING",(0,0), (-1,-1), 6),
                ("TOPPADDING",  (0,0), (-1,-1), 4),
                ("BOTTOMPADDING",(0,0),(-1,-1), 4),
            ]))
            story.append(t)

            if day.get("local_tip"):
                story.append(Spacer(1, 0.15*cm))
                story.append(Paragraph(f"💡 Local tip: {day['local_tip']}", body_style))

        story.append(Spacer(1, 0.5*cm))
        story.append(Paragraph(
            f"Generated by Voyager AI on {datetime.now().strftime('%d %b %Y')}. Have a wonderful trip! 🌏",
            sub_style))

        doc.build(story)
        return buf.getvalue()

    except ImportError:
        # reportlab not installed — return a plain-text fallback as bytes
        text = f"Voyager Itinerary\n{'='*40}\n"
        text += f"Trip: {booking.get('from_city')} → {booking.get('to_city')}\n"
        text += f"Dates: {booking.get('start_date')} – {booking.get('end_date')}\n\n"
        for day in itinerary:
            text += f"\nDay {day.get('day')}: {day.get('title')}\n{day.get('description')}\n"
            for slot in day.get("schedule", []):
                text += f"  {slot.get('time')}: {slot.get('activity')}\n"
        return text.encode()


# ── HTML Email Builder ────────────────────────────────────────────────────────
def _build_html(booking: dict, itinerary: list, weather: dict) -> str:
    """Builds the rich HTML email body as a string."""

    # Itinerary day cards
    day_cards_html = ""
    for day in itinerary:
        schedule_rows = ""
        for slot in day.get("schedule", []):
            schedule_rows += f"""
            <tr>
                <td style="padding:8px 12px; color:#a0a8c0; font-size:12px; white-space:nowrap; vertical-align:top;">
                    {slot.get('time','')}
                </td>
                <td style="padding:8px 12px; color:#e0e4f0; font-size:13px; vertical-align:top;">
                    {slot.get('activity','')}
                </td>
            </tr>"""

        day_cards_html += f"""
        <div style="background:#1c2030; border-radius:12px; padding:20px; margin-bottom:16px; border-left:4px solid #6366f1;">
            <p style="margin:0 0 4px; color:#6366f1; font-size:12px; text-transform:uppercase; letter-spacing:1px;">Day {day.get('day')}</p>
            <h3 style="margin:0 0 6px; color:#ffffff; font-size:16px;">{day.get('title','')}</h3>
            <p style="margin:0 0 12px; color:#8890a8; font-size:13px;">{day.get('description','')}</p>
            <table style="width:100%; border-collapse:collapse;">
                {schedule_rows}
            </table>
            {"<p style='margin:10px 0 0; color:#f0c040; font-size:12px;'>💡 " + day.get('local_tip','') + "</p>" if day.get('local_tip') else ""}
        </div>"""

    # Weather summary strip
    forecast = weather.get("forecast", [])
    weather_strip = ""
    for f in forecast[:5]:   # show max 5 days
        weather_strip += f"""
        <div style="text-align:center; padding:8px 12px; background:#1c2030; border-radius:8px; min-width:80px;">
            <p style="margin:0; font-size:10px; color:#8890a8;">{f.get('date','')}</p>
            <p style="margin:4px 0; font-size:16px;">{f.get('condition','').split()[0]}</p>
            <p style="margin:0; font-size:11px; color:#e0e4f0;">{f.get('temp_max','?')}° / {f.get('temp_min','?')}°</p>
            <p style="margin:2px 0 0; font-size:10px; color:#60a5fa;">🌧 {f.get('rain_mm',0)}mm</p>
        </div>"""

    # Google Calendar deep link for the full trip
    cal_start  = booking.get("start_date","").replace("-","")
    cal_end    = booking.get("end_date","").replace("-","")
    cal_title  = f"✈️ Trip to {booking.get('to_city','')} — {booking.get('pnr','')}"
    cal_url = (
        f"https://calendar.google.com/calendar/render?action=TEMPLATE"
        f"&text={requests.utils.quote(cal_title)}"
        f"&dates={cal_start}/{cal_end}"
        f"&details={requests.utils.quote('Booked via Voyager AI. Have a great trip!')}"
        f"&location={requests.utils.quote(booking.get('to_city','') + ', India')}"
    )

    return f"""
    <!DOCTYPE html>
    <html>
    <body style="margin:0; padding:0; background:#0d0f14; font-family:'Segoe UI',Arial,sans-serif;">
    <div style="max-width:620px; margin:0 auto; background:#0d0f14; color:#ffffff;">

        <!-- Hero Banner -->
        <div style="background:linear-gradient(135deg,#6366f1 0%,#06b6d4 100%); padding:40px 32px; border-radius:0 0 24px 24px; text-align:center;">
            <p style="margin:0 0 8px; font-size:40px;">✈️</p>
            <h1 style="margin:0; font-size:28px; color:#fff;">Booking Confirmed!</h1>
            <p style="margin:8px 0 0; color:rgba(255,255,255,0.85); font-size:15px;">
                Your Voyager trip is all set. Safe travels!
            </p>
        </div>

        <div style="padding:32px;">

            <!-- Booking Summary Card -->
            <div style="background:#141720; border-radius:16px; padding:24px; margin-bottom:24px; border:1px solid rgba(255,255,255,0.07);">
                <h2 style="margin:0 0 16px; color:#fff; font-size:16px;">📋 Booking Summary</h2>
                <table style="width:100%;">
                    <tr><td style="color:#8890a8; padding:4px 0; width:40%;">Route</td>
                        <td style="color:#e0e4f0; font-weight:bold;">{booking.get('from_city','?')} → {booking.get('to_city','?')}</td></tr>
                    <tr><td style="color:#8890a8; padding:4px 0;">Dates</td>
                        <td style="color:#e0e4f0;">{booking.get('start_date','?')} – {booking.get('end_date','?')}</td></tr>
                    <tr><td style="color:#8890a8; padding:4px 0;">Travelers</td>
                        <td style="color:#e0e4f0;">{booking.get('travelers',1)} person(s)</td></tr>
                    <tr><td style="color:#8890a8; padding:4px 0;">Booking Ref</td>
                        <td style="color:#22d3ee; font-weight:bold; font-size:18px; letter-spacing:2px;">{booking.get('pnr','N/A')}</td></tr>
                    {"<tr><td style='color:#8890a8; padding:4px 0;'>Hotel</td><td style='color:#e0e4f0;'>" + booking.get('hotel','') + "</td></tr>" if booking.get('hotel') else ""}
                </table>
            </div>

            <!-- Weather Forecast Strip -->
            {"<h2 style='margin:0 0 12px; color:#fff; font-size:15px;'>🌤️ Weather Forecast at " + booking.get('to_city','') + "</h2><div style='display:flex; gap:8px; flex-wrap:wrap; margin-bottom:24px;'>" + weather_strip + "</div>" if weather_strip else ""}

            <!-- Google Calendar CTA -->
            <div style="text-align:center; margin-bottom:24px;">
                <a href="{cal_url}" target="_blank"
                   style="display:inline-block; background:#1a73e8; color:#fff; text-decoration:none;
                          padding:12px 28px; border-radius:50px; font-size:14px; font-weight:600;">
                    📅 Add to Google Calendar
                </a>
            </div>

            <!-- Itinerary -->
            <h2 style="margin:0 0 16px; color:#fff; font-size:16px;">🗺️ Your Day-by-Day Itinerary</h2>
            {day_cards_html}

            <!-- Footer -->
            <p style="margin:24px 0 0; font-size:11px; color:#555e78; text-align:center; line-height:1.6;">
                This is a confirmation email from Voyager AI (Student Project Demo).<br>
                Full PDF itinerary attached below. · Voyager, Chennai, India
            </p>
        </div>
    </div>
    </body>
    </html>"""


# ── Public send function ───────────────────────────────────────────────────────
def send_booking_email(user_email: str, booking: dict, itinerary: list, weather: dict) -> dict:
    """
    Main entry point called by /confirm-booking endpoint.

    Interview Crux:
      1. Generate PDF bytes in-memory with reportlab
      2. Base64-encode the bytes (email protocols require this for binary data)
      3. Send via Resend REST API — one HTTP POST with HTML body + attachment
      The whole thing is synchronous; for production you'd push this to a 
      background task queue (Celery/RQ) so the user doesn't wait.
    """
    if not RESEND_API_KEY:
        return {"error": "RESEND_API_KEY not set"}

    html_body = _build_html(booking, itinerary, weather)

    # Generate PDF and base64-encode for email attachment
    pdf_bytes   = generate_itinerary_pdf(itinerary, booking)
    pdf_b64     = base64.b64encode(pdf_bytes).decode("utf-8")

    payload = {
        "from":    FROM_EMAIL,
        "to":      [user_email],
        "subject": f"✈️ Booking Confirmed — {booking.get('from_city')} → {booking.get('to_city')} ({booking.get('pnr')})",
        "html":    html_body,
        "attachments": [
            {
                "filename": f"voyager_itinerary_{booking.get('pnr','trip')}.pdf",
                "content":  pdf_b64,
            }
        ],
    }

    try:
        resp = requests.post(
            RESEND_SEND_URL,
            headers={
                "Authorization": f"Bearer {RESEND_API_KEY}",
                "Content-Type":  "application/json",
            },
            json=payload,
            timeout=15,
        )
        resp.raise_for_status()
        return {"status": "sent", "email": user_email, "resend_id": resp.json().get("id")}
    except Exception as e:
        print("Email send error:", e)
        return {"error": str(e)}
