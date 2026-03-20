# React Native Components Reference

Advanced patterns for high-density, reusable mobile components.

## Container / Presentational Split

The most fundamental separation: containers own logic, presentational components own UI.

```tsx
// Container: data fetching + logic
function HomeScreen() {
  const { data, loading } = useFetchPosts();
  return <PostList posts={data} loading={loading} />;
}

// Presentational: pure UI, no side effects
type Props = { posts: Post[]; loading: boolean };
function PostList({ posts, loading }: Props) {
  if (loading) return <ActivityIndicator />;
  return <FlatList data={posts} renderItem={({ item }) => <PostCard post={item} />} />;
}
```

## Higher-Order Components (HOC)

Use HOCs for cross-cutting concerns like authentication or tracking.

```tsx
// withAuth.tsx
export function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function WrappedComponent(props: P) {
    const { isAuthenticated, loading } = useAuth();

    if (loading) return <ActivityIndicator />;
    if (!isAuthenticated) return <LoginRedirect />;

    return <Component {...props} />;
  };
}

// Usage
export const ProfileScreen = withAuth(ProfileContent);
```

## Render Props

Pattern for sharing logic that requires UI flexibility.

```tsx
// KeyboardSpacer.tsx
export function KeyboardSpacer({
  children,
}: {
  children: (keyboardHeight: number) => React.ReactNode;
}) {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidShow', (e) =>
      setHeight(e.endCoordinates.height),
    );
    const unsub = Keyboard.addListener('keyboardDidHide', () => setHeight(0));
    return () => {
      sub.remove();
      unsub.remove();
    };
  }, []);

  return <>{children(height)}</>;
}

// Usage
<KeyboardSpacer>
  {(height) => <View style={{ marginBottom: height }} />}
</KeyboardSpacer>;
```

## Compound Components

Pattern for components with implicit state and shared context.

```tsx
// Accordion.tsx
const AccordionContext = createContext({
  activeIdx: -1,
  toggle: (i: number) => {},
});

export function Accordion({ children }) {
  const [activeIdx, setActiveIdx] = useState(-1);
  const toggle = (i: number) => setActiveIdx((prev) => (prev === i ? -1 : i));
  return (
    <AccordionContext.Provider value={{ activeIdx, toggle }}>
      {children}
    </AccordionContext.Provider>
  );
}

Accordion.Item = function Item({ index, title, children }) {
  const { activeIdx, toggle } = useContext(AccordionContext);
  const isOpen = activeIdx === index;
  return (
    <View>
      <TouchableOpacity onPress={() => toggle(index)}>
        <Text>{title}</Text>
      </TouchableOpacity>
      {isOpen && <View>{children}</View>}
    </View>
  );
};
```

## Slot Pattern

Use for highly customizable layout components.

```tsx
function ScreenHeader({
  title,
  LeftAction,
  RightAction,
}: {
  title: string;
  LeftAction?: React.ReactNode;
  RightAction?: React.ReactNode;
}) {
  return (
    <View style={styles.header}>
      <View>{LeftAction}</View>
      <Text>{title}</Text>
      <View>{RightAction}</View>
    </View>
  );
}
```
