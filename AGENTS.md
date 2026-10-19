Local verification: parallel app stacks must set `WORKER_PORT=0` (or a unique port); the default `4101` collides and leaves queued jobs and scheduled reviews unprocessed.

Full backend verification must use a different `QUEUE_NAME` from any running app worker; queue-reconstruction tests remove their own jobs and fail if an app worker holds one.

Blind UI test authors must name permitted document paths in searches (`docs/prd`, `docs/design`, or a specified public research file); never search parent `docs`, because `docs/handovers` contains implementation notes.
