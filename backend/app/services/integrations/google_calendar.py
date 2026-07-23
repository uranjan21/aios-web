import logging
from datetime import datetime, timezone
from typing import Optional
import uuid

import httpx
from sqlmodel import select, col

from app.models.google_sync import CalendarEvent
from app.services.integrations.google_oauth import get_valid_access_token

logger = logging.getLogger(__name__)

CALENDAR_EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events"


async def fetch_events(
    user_id: uuid.UUID,
    db,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    max_results: int = 50,
) -> list[dict]:
    access_token = await get_valid_access_token(user_id, db, "gcal")
    if not access_token:
        return []

    now = datetime.now(timezone.utc)
    time_min = date_from + "T00:00:00Z" if date_from else now.strftime("%Y-%m-%dT00:00:00Z")
    time_max = date_to + "T23:59:59Z" if date_to else None

    params: dict = {
        "timeMin": time_min,
        "maxResults": str(max_results),
        "singleEvents": "true",
        "orderBy": "startTime",
    }
    if time_max:
        params["timeMax"] = time_max

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            CALENDAR_EVENTS_URL,
            params=params,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        resp.raise_for_status()
        data = resp.json()

    events = []
    for item in data.get("items", []):
        start = item.get("start", {})
        end = item.get("end", {})
        events.append({
            "google_event_id": item["id"],
            "title": item.get("summary", "(No title)"),
            "description": item.get("description"),
            "start_time": start.get("dateTime") or start.get("date"),
            "end_time": end.get("dateTime") or end.get("date"),
            "location": item.get("location"),
            "status": item.get("status", "confirmed"),
            "html_link": item.get("htmlLink"),
        })
    return events


async def sync_events(user_id: uuid.UUID, db, days_ahead: int = 14) -> int:
    now = datetime.utcnow()  # naive UTC — calendar_events columns are tz-naive
    date_from = now.strftime("%Y-%m-%d")
    from datetime import timedelta
    date_to = (now + timedelta(days=days_ahead)).strftime("%Y-%m-%d")

    events = await fetch_events(user_id, db, date_from=date_from, date_to=date_to, max_results=200)
    if not events:
        return 0

    synced = 0
    for ev in events:
        result = await db.execute(
            select(CalendarEvent).where(CalendarEvent.user_id == user_id).where(CalendarEvent.google_event_id == ev["google_event_id"])
        )
        existing = result.scalar_one_or_none()

        start_dt = _parse_dt(ev["start_time"])
        end_dt = _parse_dt(ev["end_time"])

        if existing:
            existing.title = ev["title"]
            existing.description = ev.get("description")
            existing.start_time = start_dt
            existing.end_time = end_dt
            existing.location = ev.get("location")
            existing.status = ev.get("status", "confirmed")
            existing.html_link = ev.get("html_link")
            existing.updated_at = now
            db.add(existing)
        else:
            db.add(CalendarEvent(
                user_id=user_id,
                google_event_id=ev["google_event_id"],
                title=ev["title"],
                description=ev.get("description"),
                start_time=start_dt,
                end_time=end_dt,
                location=ev.get("location"),
                status=ev.get("status", "confirmed"),
                html_link=ev.get("html_link"),
            ))
        synced += 1

    await db.commit()
    logger.info("Synced %d calendar events", synced)
    return synced


async def get_stored_events(
    user_id: uuid.UUID,
    db,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
) -> list[dict]:
    query = select(CalendarEvent).where(CalendarEvent.user_id == user_id).order_by(col(CalendarEvent.start_time))

    # Column is TIMESTAMP WITHOUT TIME ZONE (naive UTC) — strip tzinfo or asyncpg
    # rejects the aware/naive comparison.
    if date_from:
        dt = _parse_dt(date_from + "T00:00:00Z").astimezone(timezone.utc).replace(tzinfo=None)
        query = query.where(CalendarEvent.start_time >= dt)
    if date_to:
        dt = _parse_dt(date_to + "T23:59:59Z").astimezone(timezone.utc).replace(tzinfo=None)
        query = query.where(CalendarEvent.start_time <= dt)

    result = await db.execute(query)
    rows = result.scalars().all()

    return [
        {
            "id": str(r.id),
            "google_event_id": r.google_event_id,
            "title": r.title,
            "description": r.description,
            "start_time": r.start_time.isoformat() if r.start_time else None,
            "end_time": r.end_time.isoformat() if r.end_time else None,
            "location": r.location,
            "status": r.status,
            "html_link": r.html_link,
        }
        for r in rows
    ]


def _parse_dt(dt_str: str) -> datetime:
    """Parse a Google event datetime to NAIVE UTC — start_time/end_time are
    TIMESTAMP WITHOUT TIME ZONE and asyncpg rejects tz-aware values."""
    if not dt_str:
        return datetime.utcnow()
    for fmt in ("%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%dT%H:%M:%S.%f%z", "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%d"):
        try:
            parsed = datetime.strptime(dt_str, fmt)
            if parsed.tzinfo is not None:
                parsed = parsed.astimezone(timezone.utc).replace(tzinfo=None)
            return parsed
        except ValueError:
            continue
    from dateutil.parser import isoparse
    try:
        parsed = isoparse(dt_str)
        if parsed.tzinfo is not None:
            parsed = parsed.astimezone(timezone.utc).replace(tzinfo=None)
        return parsed
    except Exception:
        return datetime.utcnow()
