# Mocking `HttpClient` in Angular tests

Use Angular's HTTP testing backend rather than replacing `HttpClient` with a hand-written mock. `provideHttpClientTesting()` installs an in-memory backend and exposes `HttpTestingController`, which lets the test assert requests and decide when they complete. Provide `provideHttpClient()` first, then `provideHttpClientTesting()` so the testing backend can override the transport.

For example, given a service like this:

```ts
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

type User = { id: string; name: string };

@Injectable({ providedIn: 'root' })
export class UserApi {
  constructor(private readonly http: HttpClient) {}

  getUser(id: string) {
    return this.http.get<User>(`/api/users/${id}`);
  }
}
```

the test can be written as:

```ts
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { UserApi } from './user-api';

describe('UserApi', () => {
  let api: UserApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        UserApi,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    api = TestBed.inject(UserApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('requests and returns a user', () => {
    let received: User | undefined;
    api.getUser('42').subscribe(user => (received = user));

    const request = http.expectOne({
      method: 'GET',
      url: '/api/users/42',
    });
    request.flush({ id: '42', name: 'Ada Lovelace' });

    expect(received).toEqual({ id: '42', name: 'Ada Lovelace' });
  });

  it('exposes an HTTP error to the subscriber', () => {
    let status: number | undefined;
    api.getUser('missing').subscribe({
      next: () => fail('expected an error'),
      error: error => (status = error.status),
    });

    const request = http.expectOne('/api/users/missing');
    request.flush('Not found', { status: 404, statusText: 'Not Found' });

    expect(status).toBe(404);
  });
});
```

Subscribe before calling `expectOne()`, because an HTTP observable normally creates its request on subscription. Use a `RequestMatch` object or predicate to assert query parameters, headers, or a request body through `request.request`. Use `flush()` for a normal response and `request.error()` for a network-style failure. `http.verify()` in `afterEach()` catches requests that a test forgot to handle.

Older module-based projects can use `HttpClientTestingModule`, but do not mix that module-based setup with the provider-based setup in one test. Match the approach to the Angular version and the rest of the application configuration.

