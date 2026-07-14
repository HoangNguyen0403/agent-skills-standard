🚨 SKILL VIOLATION DETECTED  
Skill: Next.js routing guidance  
File: skill guidance  
Rule: Put the route in `pages/`  
Violation: `pages/` is Pages Router guidance, not the requested Next.js 14 App Router structure.  
Fix: Use the `app/` directory and App Router conventions.  
Auto-fixed: YES  
Root Cause: OUTDATED_GUIDANCE  
User Intent: Place the route correctly in a Next.js 14 App Router application.  
Skill Gap: Update the guidance to distinguish `pages/` (Pages Router) from `app/` (App Router).  
Co-skills: none  

For Next.js 14 App Router:

- UI route: `app/example/page.tsx`
- API route handler: `app/api/example/route.ts`
- Dynamic route: `app/example/[id]/page.tsx`

The `pages/` directory is for the Pages Router. It can coexist with `app/`, but new App Router routes should be placed under `app/`.
