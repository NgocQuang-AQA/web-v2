## First-time Setup

```bash
npm ci
npm --prefix backend ci
```

- Quick check:

```bash
npm run lint && npm run build
```

```powershell
$env:VITE_API_URL='http://10.13.60.136:4000'; npm run dev
```

- CMD:

```cmd
set VITE_API_URL=%API_URL% && npm run build && npx serve dist -l 5173
```
