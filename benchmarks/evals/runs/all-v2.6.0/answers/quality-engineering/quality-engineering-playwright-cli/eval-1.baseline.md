I need the application URL, the SG market-selection mechanism, and stable selectors to execute this verification. Without those, I can only define the run:

1. Open the site with `playwright-cli` and capture a snapshot.
2. Select SG or set the market context, then verify the selected market is displayed.
3. Enter a known search term and submit it.
4. Wait for the results request/UI state to settle and capture a snapshot.
5. Assert that the result cards match the expected SG data, that no result belongs to another market, and that loading, empty, and error states behave as specified.
6. Save the command output, snapshot, URL, search term, and evidence for the run.

Do not treat the presence of result cards alone as success; verify market context and the expected result contents.
