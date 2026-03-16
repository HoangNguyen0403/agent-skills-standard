# JUnit 5 Test Template

## Standard Test Class

```java
package com.example.domain;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
@DisplayName("UserService Unit Tests")
class UserServiceTest {

    @Mock
    private UserRepository repository;

    @InjectMocks
    private UserService service;

    @Test
    @DisplayName("Should return active user when ID exists")
    void shouldReturnActiveUser() {
        // Arrange
        var userId = "123";
        var expectedUser = new User(userId, "Active");
        given(repository.findById(userId)).willReturn(Optional.of(expectedUser));

        // Act
        var result = service.getUser(userId);

        // Assert
        assertThat(result)
            .isPresent()
            .get()
            .extracting(User::status)
            .isEqualTo("Active");
    }

    @Test
    @DisplayName("Should throw exception when user not found")
    void shouldThrowWhenNotFound() {
        // Arrange
        var userId = "999";
        given(repository.findById(userId)).willReturn(Optional.empty());

        // Act & Assert
        assertThatThrownBy(() -> service.getUser(userId))
            .isInstanceOf(UserNotFoundException.class)
            .hasMessageContaining(userId);
    }
}
```
