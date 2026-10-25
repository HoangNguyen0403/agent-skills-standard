Assumption: `.env` is required and was absent from the execution directory.

Checkout did not fail—the test was not executed. Exit 1 indicates an environment/precondition failure, and no dashboard verdict confirms no run occurred.

Next action: make the expected `.env` available through the existing runtime setup, then rerun `agent-qa 0.2.3 run tests/checkout.yaml --dry-run`; execute checkout only after that succeeds. No configuration change is needed.
