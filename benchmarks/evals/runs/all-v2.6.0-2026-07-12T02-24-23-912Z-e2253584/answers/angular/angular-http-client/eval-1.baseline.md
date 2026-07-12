# Setting up `HttpClient` in Angular

For a standalone Angular application, register `HttpClient` in the application providers. In `app.config.ts`:

```ts
import { ApplicationConfig } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [provideHttpClient()],
};
```

The application bootstrap must use that configuration:

```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

bootstrapApplication(AppComponent, appConfig)
  .catch(error => console.error(error));
```

Then inject `HttpClient` into a service and use typed methods:

```ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface User {
  id: string;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class UserApi {
  private readonly http = inject(HttpClient);

  getUser(id: string): Observable<User> {
    return this.http.get<User>(`/api/users/${encodeURIComponent(id)}`);
  }
}
```

`HttpClient` returns cold RxJS observables. A request is normally sent when the observable is subscribed to, so a component can consume `userApi.getUser(id)` with the `async` pipe or subscribe in code with an appropriate lifecycle strategy. Avoid subscribing in the service just to return data to the caller.

For an NgModule-based application, import `HttpClientModule` in the root module instead:

```ts
@NgModule({
  imports: [BrowserModule, HttpClientModule],
  bootstrap: [AppComponent],
})
export class AppModule {}
```

Use one registration style appropriate to the application. Add features such as functional interceptors through `provideHttpClient(withInterceptors([...]))` when using the standalone provider API.

