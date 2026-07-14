Use FlatList rather than rendering all 1000 rows in a ScrollView. Give each item a stable unique key through keyExtractor; memoize an item component; and keep renderItem, callbacks, and derived props stable where useful.

Tune windowSize to about 5–10 for memory-heavy lists, set initialNumToRender to the first viewport, and limit maxToRenderPerBatch to about 5–10. For fixed-height rows, provide getItemLayout, and enable removeClippedSubviews on Android. Profile before and after to confirm whether the JS or UI thread is the bottleneck.



