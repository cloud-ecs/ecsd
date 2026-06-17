#!/bin/sh
set -eu

. /etc/os-release

# the distro package lags badly; use the upstream stable repo
sudo mkdir -p /etc/apt/keyrings
sudo wget -qO /etc/apt/keyrings/rspamd.asc https://rspamd.com/apt-stable/gpg.key
echo "deb [signed-by=/etc/apt/keyrings/rspamd.asc] http://rspamd.com/apt-stable/ ${VERSION_CODENAME} main" \
    | sudo tee /etc/apt/sources.list.d/rspamd.list
sudo apt-get update
sudo apt-get install -y rspamd

# the normal worker listens on 11333, the port the tests use
sudo systemctl enable --now rspamd
sudo systemctl restart rspamd
