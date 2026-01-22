# Mocking Strategies

## Hand-Written Mocks

Simple and no external tools required.

```go
type MockUserRepo struct {
    GetByIDFunc func(id string) (*User, error)
}

func (m *MockUserRepo) GetByID(ctx context.Context, id string) (*User, error) {
    return m.GetByIDFunc(id)
}
```

## Testify Mocks

```go
type MockUserRepo struct {
    mock.Mock
}

func (m *MockUserRepo) GetByID(ctx context.Context, id string) (*User, error) {
    args := m.Called(ctx, id)
    return args.Get(0).(*User), args.Error(1)
}

// Usage
mockRepo := new(MockUserRepo)
mockRepo.On("GetByID", mock.Anything, "123").Return(&User{ID: "123"}, nil)
```

## Interface definition

**Always** define the interface at the consumer package (dependency inversion). This makes mocking easier.

```go
// service/user_service.go
type UserRepository interface { ... } // Define here!
```
