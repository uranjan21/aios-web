import logging
import uuid
from app.models.action import AgentAction

logger = logging.getLogger(__name__)

async def execute_action(action: AgentAction, db_session) -> None:
    """
    Executes an approved action payload.
    """
    logger.info(f"Executing action {action.id} of type {action.action_type}")
    
    if action.action_type == "calendar_block":
        # TODO: Integrate with Google Calendar API using stored OAuth tokens.
        pass
    elif action.action_type == "draft_email":
        # TODO: Integrate with Gmail API or local drafts table.
        pass
        
    action.status = "executed"
    db_session.add(action)
    await db_session.commit()
