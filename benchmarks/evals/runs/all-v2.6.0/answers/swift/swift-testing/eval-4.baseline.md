Make collaborators replaceable with protocols, inject them into the type under test, and provide a deterministic fake or mock in the test target.

```swift
protocol WeatherClient {
    func current() async throws -> Weather
}

struct FakeWeatherClient: WeatherClient {
    var result: Result<Weather, Error>
    func current() async throws -> Weather { try result.get() }
}

let sut = WeatherViewModel(client: FakeWeatherClient(result: .success(sampleWeather)))
```

A spy can record calls and arguments for interaction assertions. Prefer simple fakes for state and results, avoid mocking implementation details, and keep each test explicit about the dependency behavior it needs.

