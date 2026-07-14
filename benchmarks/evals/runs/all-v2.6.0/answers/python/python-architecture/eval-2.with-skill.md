Assume a synchronous application. Separate policy, fact gathering, rendering, and notification behind ports.

```text
app/
  domain/
    models.py          # Row/report facts
    policy.py          # Pure policy decisions
  application/
    ports.py           # Repository, renderer, notifier protocols
    report_service.py  # Workflow orchestration
  adapters/
    db_repository.py
    markdown_renderer.py
    telegram_notifier.py
  bootstrap.py          # Runtime dependency composition
```

```python
# application/ports.py
from typing import Protocol
from app.domain.models import ReportFacts


class ReportRepository(Protocol):
    def fetch_facts(self) -> ReportFacts: ...


class ReportRenderer(Protocol):
    def render(self, report: object) -> str: ...


class Notifier(Protocol):
    def send(self, message: str) -> None: ...
```

```python
# domain/policy.py
from app.domain.models import ReportFacts


def compute_policy(facts: ReportFacts) -> object:
    # Pure decisions only: no DB, Telegram, env, or HTTP imports.
    ...
```

```python
# application/report_service.py
from .ports import Notifier, ReportRenderer, ReportRepository
from app.domain.policy import compute_policy


class ReportService:
    def __init__(
        self,
        repository: ReportRepository,
        renderer: ReportRenderer,
        notifier: Notifier,
    ) -> None:
        self.repository = repository
        self.renderer = renderer
        self.notifier = notifier

    def run(self) -> None:
        facts = self.repository.fetch_facts()
        decision = compute_policy(facts)
        markdown = self.renderer.render(decision)
        self.notifier.send(markdown)
```

Keep `db_repository.py` and `telegram_notifier.py` thin: they translate external APIs into the ports. Keep Markdown formatting in `markdown_renderer.py`, separate from fact gathering.

Compose dependencies only at startup:

```python
# bootstrap.py
def build_report_service() -> ReportService:
    repository = PostgresReportRepository(...)
    renderer = MarkdownReportRenderer(...)
    notifier = TelegramNotifier(...)
    return ReportService(
        repository=repository,
        renderer=renderer,
        notifier=notifier,
    )
```

Add focused regression tests for `compute_policy`, renderer output, and `ReportService` orchestration using injected fakes.
