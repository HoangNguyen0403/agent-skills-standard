`gofmt` only formats Go code.  
`goimports` does that too, and also adds/removes/sorts imports automatically.

So in practice:

- Use `goimports` for everyday editing and before commit.
- Use `gofmt` only if you specifically want formatting without touching imports.

If you already use `goimports`, you usually do not need to run `gofmt` separately.

