Assumption: React Native.

```tsx
import React, { useEffect, useRef } from "react";
import { Animated, Text } from "react-native";

export default function Welcome() {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [opacity]);

  return (
    <Animated.View style={{ opacity }}>
      <Text>Welcome!</Text>
    </Animated.View>
  );
}
```

This fades the view in over 300 ms when the screen loads. Use `useNativeDriver: true` for smoother opacity and transform animations.
