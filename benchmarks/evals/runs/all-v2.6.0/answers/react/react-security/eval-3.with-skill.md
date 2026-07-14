Assuming you use npm:

1. Check current issues:

```bash
npm audit
npm outdated
```

2. Review available updates with `npm-check-updates`:

```bash
npx npm-check-updates
npx npm-check-updates -u
npm install
```

3. Update carefully—handle major-version changes individually, review changelogs, and run your tests/build:

```bash
npm test
npm run build
```

4. Run the audit again and address remaining vulnerabilities:

```bash
npm audit
npm audit fix
```

5. Pin specific dependency versions in `package.json`, commit the updated `package-lock.json`, and avoid automatically accepting unreviewed major upgrades. If you use pnpm instead, use:

```bash
pnpm audit
```
