No. A Python domain rule should not import `psycopg2` directly; that couples domain policy to the database adapter.

Define a repository port in the domain/application layer, inject it into the rule or service, and implement it with a thin `psycopg2` adapter at the edge. Compose the dependency in startup/wiring code.

```python
from typing import Protocol

class TaskRepository(Protocol):
    def get_task(self, task_id: str) -> "Task": ...

class StatusRule:
    def __init__(self, tasks: TaskRepository):
        self.tasks = tasks  # injected dependency

    def decide(self, task_id: str) -> str:
        task = self.tasks.get_task(task_id)
        return "done" if task.completed else "pending"
```

Keep DB imports out of domain policy, place workflow orchestration in a service, and add focused tests using an in-memory or mock repository.
