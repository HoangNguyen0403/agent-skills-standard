# Mocking `HttpClient` in Angular tests

Use Angular's HTTP testing backend. It intercepts requests made by `HttpClient`, lets the test assert their method and URL, and gives the test control over when and with what data the request completes. No real network request is made.

With the provider-based setup used by standalone applications:

```ts
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

describe('UserApi', () => {
  let api: UserApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        UserApi,
        provideHttpClient(),
        // Keep this after provideHttpClient so the testing backend replaces it.
        provideHttpClientTesting(),
      ],
    });

    api = TestBed.inject(UserApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('gets a user', () => {
    api.getUser('42').subscribe(user => {
      expect(user).toEqual({ id: '42', name: 'Ada' });
    });

    const request = http.expectOne({
      method: 'GET',
      url: '/api/users/42',
    });

    request.flush({ id: '42', name: 'Ada' });
  });

  it('handles a server error', () => {
    let errorStatus: number | undefined;

    api.getUser('missing').subscribe({
      next: () => fail('expected the request to fail'),
      error: error => (errorStatus = error.status),
    });

    const request = http.expectOne('/api/users/missing');
    request.flush('Not found', { status: 404, statusText: 'Not Found' });

    expect(errorStatus).toBe(404);
  });
});
```

The service under test could be:

```ts
@Injectable({ providedIn: 'root' })
export class UserApi {
  constructor(private readonly http: HttpClient) {}

  getUser(id: string) {
    return this.http.get<User>(`/api/users/${id}`);
  }
}
```

Call `expectOne` after subscribing, because an observable HTTP request is normally created when subscribed. Use a predicate or a `RequestMatch` object when you need to assert query parameters, headers, or the request body; inspect `request.request` for those details. Complete the request with `flush`, or use `request.error(...)` for a network-style error. `http.verify()` in `afterEach` catches requests that the test forgot to handle.

In older module-based Angular tests, the equivalent is importing `HttpClientTestingModule` and injecting `HttpTestingController`. Do not provide both approaches in the same test; use the setup style that matches the application's Angular version.


