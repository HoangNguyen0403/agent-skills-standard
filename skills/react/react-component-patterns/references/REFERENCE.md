# React Component Patterns Reference

Advanced component patterns and composition techniques.

## References

- [**HOC Pattern**](hoc-pattern.md) - Higher-Order Components.
- [**Render Props**](render-props.md) - Render prop pattern.
- [**Compound Components**](compound-components.md) - Complex component composition.

## Higher-Order Component (HOC)

```jsx
// withAuth.jsx
export function withAuth(Component) {
  return function AuthenticatedComponent(props) {
    const { user, loading } = useAuth();

    if (loading) return <Loading />;
    if (!user) return <Redirect to="/login" />;

    return <Component {...props} user={user} />;
  };
}

// Usage
const ProtectedPage = withAuth(Dashboard);
```

## Render Props Pattern

```jsx
// Mouse tracking example
export function MouseTracker({ render }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (event) => {
    setPosition({ x: event.clientX, y: event.clientY });
  };

  return (
    <div onMouseMove={handleMouseMove}>
      {render(position)}
    </div>
  );
}

// Usage
<MouseTracker
  render={({ x, y }) => (
    <p>Mouse position: {x}, {y}</p>
  )}
/>
```

## Compound Components

```jsx
// Accordion component
const AccordionContext = createContext();

export function Accordion({ children }) {
  const [activeIndex, setActiveIndex] = useState(null);

  return (
    <AccordionContext.Provider value={{ activeIndex, setActiveIndex }}>
      <div className="accordion">{children}</div>
    </AccordionContext.Provider>
  );
}

Accordion.Item = function AccordionItem({ index, children }) {
  return <div className="accordion-item">{children}</div>;
};

Accordion.Header = function AccordionHeader({ index, children }) {
  const { activeIndex, setActiveIndex } = useContext(AccordionContext);
  
  return (
    <button onClick={() => setActiveIndex(index === activeIndex ? null : index)}>
      {children}
    </button>
  );
};

Accordion.Body = function AccordionBody({ index, children }) {
  const { activeIndex } = useContext(AccordionContext);
  
  return activeIndex === index ? <div>{children}</div> : null;
};

// Usage
<Accordion>
  <Accordion.Item index={0}>
    <Accordion.Header index={0}>Section 1</Accordion.Header>
    <Accordion.Body index={0}>Content 1</Accordion.Body>
  </Accordion.Item>
</Accordion>
```

## Controlled vs Uncontrolled

```jsx
// Controlled input
function ControlledInput() {
  const [value, setValue] = useState('');
  
  return (
    <input
      value={value}
      onChange={e => setValue(e.target.value)}
    />
  );
}

// Uncontrolled input
function UncontrolledInput() {
  const inputRef = useRef();
  
  const handleSubmit = () => {
    console.log(inputRef.current.value);
  };
  
  return <input ref={inputRef} />;
}
```
