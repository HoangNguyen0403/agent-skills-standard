Use `pathlib.Path` and the `/` operator for path composition:

```python
from pathlib import Path

settings_path = Path(base_dir) / "config" / "settings.json"
```

`Path` also provides operations such as `exists()`, `read_text()`, and `mkdir()`, and accepts path-like values without manual separator handling. Convert to `str` only at an API boundary that specifically requires a string; `os.path` remains useful for legacy or low-level interfaces.
