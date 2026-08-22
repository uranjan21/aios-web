import logging
import uuid
import math
import datetime as dt
from collections import defaultdict
from sqlmodel import select, desc

from app.db.session import AsyncSessionLocal
from app.models.finance import FinanceExpense
from app.models.health import HealthLog
from app.models.captures import Capture
from app.models.insights import Insight
from app.services.ai.insights import generate_text

logger = logging.getLogger(__name__)

def _pearson(x: list[float], y: list[float]) -> float:
    n = len(x)
    if n < 2: return 0.0
    mean_x = sum(x) / n
    mean_y = sum(y) / n
    num = sum((xi - mean_x) * (yi - mean_y) for xi, yi in zip(x, y))
    den_x = sum((xi - mean_x)**2 for xi in x)
    den_y = sum((yi - mean_y)**2 for yi in y)
    if den_x == 0 or den_y == 0: return 0.0
    return num / math.sqrt(den_x * den_y)

async def _extract_series(session, user_id: uuid.UUID, days: int = 45):
    now = dt.datetime.utcnow()
    start_date = now - dt.timedelta(days=days)
    
    # Init series dicts: date -> value
    spend_series = defaultdict(float)
    gym_series = defaultdict(float)
    sleep_series = defaultdict(list)
    captures_series = defaultdict(float)
    
    # Spend
    expenses = (await session.execute(
        select(FinanceExpense).where(FinanceExpense.user_id == user_id, FinanceExpense.logged_at >= start_date)
    )).scalars().all()
    for e in expenses:
        d = e.logged_at.date()
        spend_series[d] += float(e.amount)
        
    # Health (Gym + Sleep)
    logs = (await session.execute(
        select(HealthLog).where(HealthLog.user_id == user_id, HealthLog.logged_at >= start_date)
    )).scalars().all()
    for l in logs:
        d = l.logged_at.date()
        if l.entry_type == "gym":
            gym_series[d] = 1.0
        elif l.entry_type == "sleep" and l.value:
            sleep_series[d].append(float(l.value))
            
    # Captures
    captures = (await session.execute(
        select(Capture).where(Capture.user_id == user_id, Capture.created_at >= start_date)
    )).scalars().all()
    for c in captures:
        d = c.created_at.date()
        captures_series[d] += 1.0
        
    # Align on dates
    aligned = {}
    for i in range(days):
        d = (start_date + dt.timedelta(days=i)).date()
        aligned[d] = {
            "spend": spend_series.get(d, 0.0),
            "gym": gym_series.get(d, 0.0),
            "sleep": sum(sleep_series[d]) / len(sleep_series[d]) if d in sleep_series else None,
            "captures": captures_series.get(d, 0.0)
        }
        
    return aligned

async def _get_threshold(session, user_id: uuid.UUID) -> float:
    # Guardrail: if 👎-rate >40% over trailing 20, raise |r| threshold to 0.7
    stmt = select(Insight).where(Insight.user_id == user_id, Insight.feedback != None).order_by(desc(Insight.created_at)).limit(20)
    recent = (await session.execute(stmt)).scalars().all()
    if len(recent) >= 10:
        thumbs_down = sum(1 for r in recent if r.feedback == -1)
        if thumbs_down / len(recent) > 0.4:
            return 0.7
    return 0.6

async def compute_correlations_for_user(session, user_id: uuid.UUID):
    from app.models.user import User
    from app.services.ai.keys import list_user_providers

    series = await _extract_series(session, user_id, days=45)
    dates = sorted(series.keys())
    metrics = ["spend", "gym", "sleep", "captures"]

    threshold = await _get_threshold(session, user_id)

    # LLM phrasing runs on the user's own key — without one, the plain wording.
    user = (await session.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    can_use_ai = user is not None and bool(await list_user_providers(session, user_id))
    
    candidates = []
    
    for m1 in metrics:
        for m2 in metrics:
            if m1 >= m2: continue
            
            # Lag 0
            x, y = [], []
            for d in dates:
                v1 = series[d][m1]
                v2 = series[d][m2]
                if v1 is not None and v2 is not None:
                    x.append(v1)
                    y.append(v2)
                    
            if len(x) >= 21:
                r = _pearson(x, y)
                if abs(r) >= threshold:
                    candidates.append((m1, m2, 0, r, len(x)))
                    
            # Lag 1 (m1 leads m2 by 1 day)
            x_lag, y_lag = [], []
            for i in range(len(dates) - 1):
                d1 = dates[i]
                d2 = dates[i+1]
                v1 = series[d1][m1]
                v2 = series[d2][m2]
                if v1 is not None and v2 is not None:
                    x_lag.append(v1)
                    y_lag.append(v2)
                    
            if len(x_lag) >= 21:
                r_lag = _pearson(x_lag, y_lag)
                if abs(r_lag) >= threshold:
                    candidates.append((m1, m2, 1, r_lag, len(x_lag)))
                    
    # Process candidates
    for m1, m2, lag, r, n in candidates:
        # Check dedupe: same pair < 14 days old
        cutoff = dt.datetime.utcnow() - dt.timedelta(days=14)
        existing = (await session.execute(
            select(Insight).where(
                Insight.user_id == user_id,
                Insight.metric_a == m1,
                Insight.metric_b == m2,
                Insight.created_at >= cutoff
            )
        )).scalars().first()
        
        if existing:
            continue
            
        # Generate LLM phrasing (user's own key; falls back to a plain sentence)
        text = f"Noticeable relationship between {m1} and {m2} (r={r:.2f}). Try an experiment to see if changing one affects the other."
        if can_use_ai:
            system = "You are an AI finding lifestyle correlations. Write ONE short sentence explaining the correlation and ONE suggested experiment to test it."
            prompt = f"Metric A: {m1}, Metric B: {m2}. Correlation (r): {r:.2f}, Lag: {lag} days. (Positive means they move together, negative means opposite)."
            try:
                text = await generate_text(system, prompt, max_tokens=100, user_id=str(user_id))
            except Exception:
                pass
            
        # Parse title and body (simple approach)
        parts = text.split('.')
        title = parts[0] + "."
        body = text[len(title):].strip() if len(parts) > 1 else "Experiment to see if it holds."
        
        insight = Insight(
            user_id=user_id,
            kind="correlation",
            title=title[:255],
            body=body,
            metric_a=m1,
            metric_b=m2,
            r=r,
            n=n,
            lag=lag,
            score=abs(r),
            status="new"
        )
        session.add(insight)
        
    await session.commit()
    
async def run_synergy_job():
    """Nightly job (03:00 UTC) to compute correlations."""
    from app.models.user import User
    async with AsyncSessionLocal() as session:
        user_ids = [u.id for u in (await session.execute(select(User))).scalars().all()]
    # Fresh session per user so one failure can't poison the rest of the batch.
    for uid in user_ids:
        try:
            async with AsyncSessionLocal() as session:
                await compute_correlations_for_user(session, uid)
        except Exception as e:
            logger.error(f"Synergy job failed for user {uid}: {e}")
