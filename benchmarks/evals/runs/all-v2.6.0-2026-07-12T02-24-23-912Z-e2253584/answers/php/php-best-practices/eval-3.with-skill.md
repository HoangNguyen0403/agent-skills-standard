Split the God class by responsibility: put validation in a validator, persistence behind a repository interface, notifications behind a notifier interface, and orchestration in a small application service. Inject those interfaces through the constructor. Keep each class focused, use typed methods, and let the orchestrator coordinate collaborators rather than owning every implementation detail.

