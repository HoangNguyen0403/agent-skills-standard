Structure it as a small orchestration function with separate, testable stages:

```python
from dataclasses import dataclass
from typing import Iterable, Protocol


@dataclass(frozen=True)
class Row:
    name: str
    value: int


@dataclass(frozen=True)
class PolicyResult:
    name: str
    allowed: bool
    reason: str


class Repository(Protocol):
    def fetch_rows(self) -> Iterable[Row]: ...


class TelegramClient(Protocol):
    def send_message(self, chat_id: str, text: str) -> None: ...


def evaluate_policy(rows: Iterable[Row]) -> list[PolicyResult]:
    results = []

    for row in rows:
        allowed = row.value >= 10  # Assumption: this is the policy threshold.
        results.append(
            PolicyResult(
                name=row.name,
                allowed=allowed,
                reason="meets threshold" if allowed else "below threshold",
            )
        )

    return results


def render_markdown(results: Iterable[PolicyResult]) -> str:
    lines = ["*Policy report*", ""]

    for result in results:
        status = "✅" if result.allowed else "❌"
        lines.append(f"{status} `{result.name}` — {result.reason}")

    return "\n".join(lines)


def send_report(
    repository: Repository,
    telegram: TelegramClient,
    chat_id: str,
) -> None:
    rows = list(repository.fetch_rows())
    results = evaluate_policy(rows)
    message = render_markdown(results)

    telegram.send_message(chat_id=chat_id, text=message)
```

Keep the responsibilities separated:

- `Repository` handles database access only.
- `evaluate_policy()` contains pure business logic and no I/O.
- `render_markdown()` formats results and escapes dynamic Markdown content.
- `send_report()` coordinates the workflow and Telegram delivery.

For production use, also handle empty results, database/API failures, Telegram’s message-size limit, retries, and logging. Test `evaluate_policy()` and `render_markdown()` independently, while mocking `Repository` and `TelegramClient` for orchestration tests.
