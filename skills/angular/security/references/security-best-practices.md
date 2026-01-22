# Security Best Practices

## Sanitization

Angular automatically sanitizes binding values.

```html
<!-- Safe -->
<div>{{ maliciousContent }}</div>

<!-- Potentially Unsafe (Angular sanitizes known threats) -->
<div [innerHTML]="htmlContent"></div>
```

If you MUST bypass (e.g., embedding Youtube):

```typescript
// Create a pipe for this
@Pipe({ name: 'safeUrl', standalone: true })
export class SafeUrlPipe implements PipeTransform {
  sanitizer = inject(DomSanitizer);
  transform(url: string) {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }
}
```

```html
<iframe [src]="videoUrl | safeUrl"></iframe>
```
