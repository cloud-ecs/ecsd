#!/bin/sh
set -eu

sudo apt-get update
sudo apt-get install -y opendmarc
# sudo systemctl disable --now opendmarc 2>/dev/null || true
