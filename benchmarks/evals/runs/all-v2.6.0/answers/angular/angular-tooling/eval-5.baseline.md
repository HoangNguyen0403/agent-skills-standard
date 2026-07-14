# Useful `ng generate` flags

`ng generate` (or `ng g`) accepts options common to the command plus options specific to each schematic. Always check the installed version with `ng generate <schematic> --help`.

Commonly useful flags include:

- `--dry-run`: show what would be created or changed without writing files.
- `--project=<name>`: select a project in a multi-project workspace.
- `--path=<path>`: choose the destination path.
- `--flat`: place files directly in the destination instead of creating a folder.
- `--skip-tests`: do not generate a spec/test file.
- `--skip-import`: do not add the generated declaration or provider to an NgModule where that schematic supports imports.
- `--standalone` and `--export`: control standalone generation or exporting where supported.
- `--help`: print the schematic’s options.

Component generation has additional options such as `--style=css|scss|less`, `--inline-style`, `--inline-template`, `--selector`, `--prefix`, `--change-detection=Default|OnPush`, `--display-block`, and `--type` for the generated file suffix. For example:

```bash
ng g c shared/status-badge \
  --style=scss \
  --change-detection=OnPush \
  --selector=app-status-badge \
  --skip-tests
```

Flags are schematic-specific: a flag accepted by `component` may not apply to `service`, `directive`, `pipe`, `guard`, or `module`. Prefer the local CLI executable and verify the help output for the exact Angular CLI version instead of relying on a flag from another version.

