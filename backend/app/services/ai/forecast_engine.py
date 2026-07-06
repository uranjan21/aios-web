"""On-demand forecast generation (the "Generate Forecast" button).

Runs the same deterministic pipeline as the nightly `forecasts_nightly` job
(plan §7.7: linear burn / least-squares weight slope) and returns the freshest
forecast for the requested domain. No LLM dependency — the button must work
even with AI off; `ai_insight` is produced by the pipeline's own phrasing.
"""

import uuid
import logging

from sqlalchemy import desc
from sqlmodel import select

from app.models.forecast import Forecast
from app.services.ai.forecasting import run_forecasting_pipeline

logger = logging.getLogger(__name__)

SUPPORTED_DOMAINS = {"finance", "health"}


async def generate_domain_forecast(user_id: uuid.UUID, domain: str, db) -> Forecast:
    if domain not in SUPPORTED_DOMAINS:
        raise ValueError(f"Unknown domain for forecasting: {domain}")

    # Idempotent per day — re-running just returns today's forecast.
    await run_forecasting_pipeline(user_id, db)

    forecast = (await db.execute(
        select(Forecast)
        .where(Forecast.user_id == user_id, Forecast.domain == domain)
        .order_by(desc(Forecast.created_at))
        .limit(1)
    )).scalars().first()

    if forecast is None:
        raise ValueError(
            "Not enough data to forecast yet — log a few more entries in this domain first."
        )
    return forecast
