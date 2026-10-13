# Native Twenty application

Pinned Twenty SDK/client 2.46.0. The actual SDK build passes with Node 24.18.0 and produces the five custom objects, fourteen relations, default role, sidebar entries and native read-only overview. The app is retained alongside the Next.js product.

```bash
pnpm twenty:build
```

Install separately in each local native workspace using the SDK remote/app commands. Inspect the generated plan before applying. API access is server-side and workspace-specific; our application never writes directly into Twenty's database. Runtime install, CRUD and workspace isolation remain in the active verification checklist until recorded as passed in [status](../docs/STATUS.md).

The Python prototype is preserved as reference; the NestJS product owns current workflow policy. No upstream CRM source is forked.
