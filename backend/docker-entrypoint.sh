#!/bin/sh
set -e

# Found the hard way: nothing was running migrations against the
# container's database, so every schema change added after the image
# was first built silently never applied until someone happened to run
# `docker compose exec app node ace migration:run` by hand.
node ace migration:run --force

exec node bin/server.js
