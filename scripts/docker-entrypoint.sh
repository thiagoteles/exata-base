#!/bin/sh
# Starts the production server. The server migrates the database before it answers, so there is
# no pre-deploy step on the host.
set -eu
exec node server.js
