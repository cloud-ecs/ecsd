#!/bin/sh
set -eu

sudo apt-get update
sudo apt-get install -y opendkim opendkim-tools opendmarc

# the opendkim test invokes the binary directly (opendkim -t) to verify signed
# messages — no daemon required, so don't fail if the milters can't start
# unconfigured. opendmarc has no scanner module yet; installed for parity.
sudo systemctl disable --now opendkim opendmarc 2>/dev/null || true
