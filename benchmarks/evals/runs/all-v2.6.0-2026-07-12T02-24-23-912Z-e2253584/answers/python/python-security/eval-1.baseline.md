No. Passing user-controlled text to `shell=True` can allow command injection. Pass arguments as a list with `shell=False` and validate the revision or other input before running it.
