Do not keep a 15-line inline code block in a workflow file unless every line is essential to the procedure. Large inline examples make the document harder to scan and increase maintenance cost.

Better options:

1. Replace the long inline block with a short representative snippet
   - Show only the fields the reader must understand immediately.

2. Move the full example to a referenced file or appendix
   - Link to `examples/`, `templates/`, or another dedicated artifact if the full configuration is still useful.

3. Convert the workflow step into instruction plus constraints
   - Example: “Copy the standard config template and update `name`, `version`, and `permissions`.”

Good inline example:

```json
{
  "name": "example-plugin",
  "version": "1.0.0",
  "permissions": ["read"]
}
```

Then add a short note such as:

- Use the shared template for the complete configuration shape.

This keeps the workflow lightweight while preserving usability. The workflow should emphasize actions and decision rules; large static examples belong in reusable reference material.

