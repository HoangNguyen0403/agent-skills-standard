Assuming you use npm:

1. Check outdated packages:

```bash
npm outdated
npm audit
```

2. Apply compatible updates:

```bash
npm update
```

3. For major-version upgrades, update deliberately:

```bash
npm install react@latest react-dom@latest
```

Review breaking changes, peer dependencies, and React compatibility before upgrading.

4. Reinstall cleanly and verify:

```bash
rm -rf node_modules
npm ci
npm test
npm run build
```

5. Review the resulting `package.json` and `package-lock.json`, then commit them. Upgrade in small batches so regressions are easy to identify.
