import logging
from datetime import datetime, timedelta, timezone
from typing import Optional
import uuid

import httpx
from sqlmodel import select

from app.models.google_sync import GoogleFitMetric
from app.services.integrations.google_oauth import get_valid_access_token

logger = logging.getLogger(__name__)

FITNESS_DATASOURCES_URL = "https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate"

DATA_TYPE_MAP = {
    "steps": "com.google.step_count.delta",
    "calories": "com.google.calories.expended",
    "distance": "com.google.distance.delta",
    "weight": "com.google.weight",
    "heart_rate": "com.google.heart_rate.bpm",
}


def _millis(dt: datetime) -> int:
    return int(dt.timestamp() * 1000)


async def fetch_fitness_data(
    user_id: uuid.UUID,
    db,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
) -> dict:
    access_token = await get_valid_access_token(user_id, db, "gfit")
    if not access_token:
        return {}

    now = datetime.now(timezone.utc)
    if date_from:
        start = datetime.strptime(date_from, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    else:
        start = (now - timedelta(days=7)).replace(hour=0, minute=0, second=0, microsecond=0)

    if date_to:
        end = datetime.strptime(date_to, "%Y-%m-%d").replace(
            hour=23, minute=59, second=59, tzinfo=timezone.utc
        )
    else:
        end = now

    aggregate_by = [{"dataTypeName": dt} for dt in DATA_TYPE_MAP.values()]
    body = {
        "aggregateBy": aggregate_by,
        "bucketByTime": {"durationMillis": 86400000},
        "startTimeMillis": _millis(start),
        "endTimeMillis": _millis(end),
    }

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            FITNESS_DATASOURCES_URL,
            json=body,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
        )
        resp.raise_for_status()
        data = resp.json()

    results: dict[str, list] = {}
    for bucket in data.get("bucket", []):
        bucket_start = datetime.fromtimestamp(
            int(bucket["startTimeMillis"]) / 1000, tz=timezone.utc
        )
        date_str = bucket_start.strftime("%Y-%m-%d")
        day_data: dict = {"date": date_str}

        for dataset in bucket.get("dataset", []):
            data_type = dataset.get("dataSourceId", "")
            points = dataset.get("point", [])

            for metric_key, type_name in DATA_TYPE_MAP.items():
                if type_name in data_type:
                    if points:
                        values = []
                        for pt in points:
                            for val in pt.get("value", []):
                                if "fpVal" in val:
                                    values.append(val["fpVal"])
                                elif "intVal" in val:
                                    values.append(val["intVal"])
                        if values:
                            if metric_key in ("weight", "heart_rate"):
                                day_data[metric_key] = round(sum(values) / len(values), 2)
                            else:
                                day_data[metric_key] = round(sum(values), 2)

        results[date_str] = day_data

    return results


async def sync_fitness(user_id: uuid.UUID, db, days_back: int = 7) -> int:
    now = datetime.utcnow()  # naive UTC — google_fit_metrics columns are tz-naive
    date_from = (now - timedelta(days=days_back)).strftime("%Y-%m-%d")
    date_to = now.strftime("%Y-%m-%d")

    daily_data = await fetch_fitness_data(user_id, db, date_from=date_from, date_to=date_to)
    if not daily_data:
        return 0

    synced = 0
    for date_str, metrics in daily_data.items():
        result = await db.execute(
            select(GoogleFitMetric).where(GoogleFitMetric.user_id == user_id).where(GoogleFitMetric.date == date_str)
        )
        existing = result.scalar_one_or_none()

        if existing:
            existing.steps = metrics.get("steps")
            existing.calories = metrics.get("calories")
            existing.distance_m = metrics.get("distance")
            existing.weight_kg = metrics.get("weight")
            existing.heart_rate_bpm = metrics.get("heart_rate")
            existing.updated_at = now
            db.add(existing)
        else:
            db.add(GoogleFitMetric(
                user_id=user_id,
                date=date_str,
                steps=metrics.get("steps"),
                calories=metrics.get("calories"),
                distance_m=metrics.get("distance"),
                weight_kg=metrics.get("weight"),
                heart_rate_bpm=metrics.get("heart_rate"),
            ))
        synced += 1

    await db.commit()
    logger.info("Synced %d days of fitness data", synced)
    return synced


async def get_stored_metrics(
    user_id: uuid.UUID,
    db,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
) -> list[dict]:
    query = select(GoogleFitMetric).where(GoogleFitMetric.user_id == user_id).order_by(GoogleFitMetric.date.desc())

    if date_from:
        query = query.where(GoogleFitMetric.date >= date_from)
    if date_to:
        query = query.where(GoogleFitMetric.date <= date_to)

    result = await db.execute(query)
    rows = result.scalars().all()

    return [
        {
            "id": str(r.id),
            "date": r.date,
            "steps": r.steps,
            "calories": r.calories,
            "distance_m": r.distance_m,
            "weight_kg": r.weight_kg,
            "heart_rate_bpm": r.heart_rate_bpm,
        }
        for r in rows
    ]
