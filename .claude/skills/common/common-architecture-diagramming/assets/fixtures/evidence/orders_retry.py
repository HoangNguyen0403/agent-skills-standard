"""Synthetic retry-policy source record for the component fixture."""

def retry_action(outcome):
    """Unknown provider outcomes must be reconciled, never blindly retried."""
    if outcome == "unknown":
        return "reconcile"
    if outcome == "succeeded":
        return "return_stored_result"
    if outcome == "failed_without_effect":
        return "retry_same_operation"
    raise ValueError("Unsupported outcome")
