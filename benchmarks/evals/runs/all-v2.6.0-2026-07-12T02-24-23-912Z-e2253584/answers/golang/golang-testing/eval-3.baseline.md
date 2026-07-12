It's usually not ideal.

Using `assert` inside a `for` loop means the test keeps running after a failure, which can produce noisy or misleading results if later checks depend on earlier ones. In table-driven tests, `t.Run(...)` with a separate subtest per case is usually better.

If a failure should stop that case immediately, prefer `require`.

Example:

```go
for _, tc := range tests {
    tc := tc
    t.Run(tc.name, func(t *testing.T) {
        result := doThing(tc.input)
        require.Equal(t, tc.want, result)
    })
}
```

So: `assert` in a loop is not always wrong, but subtests are generally the cleaner Go testing pattern.

