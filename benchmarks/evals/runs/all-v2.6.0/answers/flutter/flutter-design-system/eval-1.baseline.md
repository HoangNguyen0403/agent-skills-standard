Assuming a React Native checkout screen:

```tsx
<Button
  title="Confirm"
  color="#FF0000"
  onPress={handleConfirm}
/>
```

For exact styling:

```tsx
<TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
  <Text style={styles.confirmText}>Confirm</Text>
</TouchableOpacity>

const styles = StyleSheet.create({
  confirmButton: {
    backgroundColor: 'red',
  },
  confirmText: {
    color: 'white',
    fontSize: 16,
  },
});
```
