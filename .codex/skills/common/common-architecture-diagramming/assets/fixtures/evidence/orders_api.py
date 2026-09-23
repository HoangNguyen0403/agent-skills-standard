"""Synthetic source record for the component fixture."""

from orders_retry import retry_action


def plan_order_attempt(operation_id, outcome):
    """Synthetic routing example only: does not charge or persist an order."""
    if not operation_id:
        raise ValueError("A stable business-operation ID is required")
    return {"operation_id": operation_id, "action": retry_action(outcome)}
