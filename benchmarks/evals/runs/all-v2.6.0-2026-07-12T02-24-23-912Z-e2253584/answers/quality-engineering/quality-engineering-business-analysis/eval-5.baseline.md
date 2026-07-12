The story is not ready for test design. “User” and “price changes” do not identify the actor, trigger, comparison value, or expected outcome. “Price is highlighted” needs an observable style rule, and “Translation follows user preference — to discuss” is unresolved rather than acceptance criteria. The `[MOBILE ONLY]` scope should also identify the supported mobile platform(s).

A clearer draft is:

“As a [role], on the mobile offer page, I want the changed price to be visually distinguished from the previous price so that I can recognize the change.”

Add acceptance criteria that define when a price is considered changed, which value is shown as current/previous, the exact visual treatment or design reference, behavior for increases/decreases/no change, loading and error states, and localization behavior for each supported user-language preference. Resolve the translation decision and confirm platform, market, permissions, and accessibility requirements before creating tests.
