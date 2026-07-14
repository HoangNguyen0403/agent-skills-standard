Use a platform-by-role matrix and keep each case to one condition:

| Platform | Actor | Case focus |
|---|---|---|
| Web | Sales Rep | Verify the Sales Rep data on the feature screen |
| Web | Customer | Verify the Customer data on the feature screen |
| Mobile | Sales Rep | Verify the Sales Rep data on the feature screen |
| Mobile | Customer | Verify the Customer data on the feature screen |

Each test should state the actor and platform in its name, use deterministic role-specific data, navigate to the feature, and assert only that actor’s expected data. Add separate cases for permission denial, missing data, loading/error behavior, and any market or feature-toggle combinations. Do not combine the two actors or two platforms in one case, because a failure would not identify which contract broke. Link every case to the relevant acceptance criterion and story.
