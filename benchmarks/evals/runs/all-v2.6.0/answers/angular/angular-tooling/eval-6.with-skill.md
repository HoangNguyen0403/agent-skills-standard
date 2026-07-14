Run the Angular tests once with coverage enabled and watch mode disabled:

```bash
ng test --code-coverage --watch=false
```

For a workspace with multiple projects, specify the project name, for example:

```bash
ng test my-app --code-coverage --watch=false
```

The command produces the coverage report under the `coverage/` directory. `--watch=false` is important for CI or a one-shot local run because the process exits after the tests complete instead of waiting for file changes.

