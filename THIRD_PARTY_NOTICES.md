# Third-party software

Our original application code is Apache-2.0. Dependencies retain their upstream licences and notices; no licence is assigned to private meeting materials.

| Component | Boundary | Upstream licence |
| --- | --- | --- |
| Twenty CRM | Unmodified internal service accessed through published APIs/SDK | AGPL-3.0 with Twenty Application Exception; Enterprise files excluded |
| Twenty UI | Published React library | MIT |
| Twenty SDK/client SDK | Published application tooling | MIT |
| OpenDesign | Unmodified pinned service, separately supplied product templates | Apache-2.0; bundled third-party assets retain notices |
| Next.js, NestJS, Better Auth, BullMQ | Application dependencies | MIT |
| Prisma | Database client/tooling | Apache-2.0 |
| PostgreSQL | Internal database service | PostgreSQL licence |
| Redis | Internal queue service, pinned 7.2 release | BSD-3-Clause |

Do not copy Twenty core or Enterprise code into our application. Preserve distributed package notices. Upstream source is downloaded into ignored `.local/upstream/`, not vendored into our public repository.
