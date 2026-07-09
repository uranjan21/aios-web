import logging
import uuid
from datetime import datetime
from sqlmodel import select
from app.db.session import AsyncSessionLocal
from app.models.action import AgentAction
from app.services.chat.tools import execute_tool

logger = logging.getLogger(__name__)

async def execute_action(action: AgentAction, db_session) -> None:
    """
    Executes an approved action payload using chat tools.
    """
    logger.info(f"Executing action {action.id} of type {action.action_type}")
    
    try:
        result_text, affected_paths = await execute_tool(action.action_type, action.payload, action.user_id)
        if action.ai_explanation:
            action.ai_explanation += f"\n\nExecuted: {result_text}"
        else:
            action.ai_explanation = f"Executed {action.action_type}: {result_text}"
        action.status = "executed"
    except Exception as e:
        logger.error(f"Failed to execute action {action.id}: {e}")
        if action.ai_explanation:
            action.ai_explanation += f"\n\nFailed to execute: {str(e)}"
        else:
            action.ai_explanation = f"Failed to execute: {str(e)}"
        action.status = "rejected"
        
    db_session.add(action)

async def run_auto_commit_pending_actions(user_id: uuid.UUID) -> None:
    """Cron job that auto-commits pending agent actions older than 24 hours."""
    try:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(AgentAction)
                .where(AgentAction.user_id == user_id)
                .where(AgentAction.status == "pending")
                .where(AgentAction.auto_commit_at < datetime.utcnow())
            )
            pending_actions = result.scalars().all()
            
            for pending in pending_actions:
                await execute_action(pending, session)
                
            if pending_actions:
                await session.commit()
                logger.info("Auto-committed %d pending actions for user %s", len(pending_actions), user_id)
                
    except Exception as e:
        logger.error("Failed to auto-commit actions for user %s: %s", user_id, e)
