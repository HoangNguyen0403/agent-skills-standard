Make the card a function component with a typed interface, a named export, and composition through children or small render slots. Keep data fetching and feature logic in a hook or container; the card should receive the data and callbacks it needs and focus on presentation.

Use React Native primitives such as View and Text, not DOM elements. Define styles with StyleSheet.create, keep the file under about 250 lines, and use stable IDs for any lists. If features need different content, compose children rather than adding a growing set of boolean props or drilling unrelated props through the card.



