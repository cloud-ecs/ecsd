#!/bin/sh
set -eu

sudo apt-get update
sudo apt-get install -y opendkim opendkim-tools

# the opendkim test invokes the binary directly (opendkim -t) to verify signed
# messages — no daemon required, so don't fail if the milters can't start
# unconfigured.
sudo systemctl disable --now opendkim 2>/dev/null || true
