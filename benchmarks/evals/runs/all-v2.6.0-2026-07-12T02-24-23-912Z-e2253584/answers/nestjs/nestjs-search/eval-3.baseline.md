Run E2E tests against a real Elasticsearch instance started by Testcontainers or a dedicated isolated test service. Pin the Elasticsearch version, apply the same index settings/mappings used in the application, wait for health, and create a unique index per test suite or run.

Index test fixtures, refresh before querying (`refresh: 'wait_for'` or an explicit refresh), assert both results and mapping/query behavior, and delete the index in teardown. Do not make unit tests depend on a live cluster; mock a narrow search port for service logic and reserve real Elasticsearch for adapter/integration/E2E coverage. Test unavailable-cluster and timeout behavior, avoid shared mutable fixtures, and ensure cleanup runs on failures.

