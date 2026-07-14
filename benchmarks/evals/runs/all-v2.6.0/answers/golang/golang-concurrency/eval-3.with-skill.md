Use:

```bash
go test -race ./...
```

For a specific package:

```bash
go test -race ./path/to/package
```

For a single test:

```bash
go test -race ./path/to/package -run TestName
```

The `-race` flag enables Go’s race detector to catch data races during the test run.

