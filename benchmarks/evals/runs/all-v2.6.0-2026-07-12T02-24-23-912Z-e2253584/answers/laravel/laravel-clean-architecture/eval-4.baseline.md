Organize by domain when multiple features share concepts and lifecycle, keeping each domain's application, domain, infrastructure, and delivery code together:

```text
app/Modules/Billing/{Domain,Application,Infrastructure,Presentation}
app/Modules/Orders/{Domain,Application,Infrastructure,Presentation}
```

Use a consistent dependency direction: presentation calls application, application calls domain ports, and infrastructure implements those ports. Shared code should be small and genuinely cross-domain. Register module service providers and route/resource loading explicitly. Start with conventional Laravel directories if the application is small; domain organization should reduce coupling rather than create navigation overhead.

