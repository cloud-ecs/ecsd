#!/bin/sh
set -eu

sudo apt-get update
sudo apt-get install -y clamav clamav-daemon

# clamd refuses to start without a signature database; freshclam fetches it.
# Its own service holds the update lock, so stop that before running by hand.
sudo systemctl stop clamav-freshclam || true
sudo freshclam

# the tests reach clamd over TCP 3310 in addition to the unix socket
if ! grep -q '^TCPSocket' /etc/clamav/clamd.conf; then
    printf 'TCPSocket 3310\nTCPAddr 127.0.0.1\n' | sudo tee -a /etc/clamav/clamd.conf
fi

sudo systemctl restart clamav-daemon

# expose the daemon socket where lib/detect-socket looks (/tmp or /var/run)
i=0
while [ ! -S /run/clamav/clamd.ctl ] && [ "$i" -lt 30 ]; do
    i=$((i + 1))
    sleep 2
done
sudo ln -sf /run/clamav/clamd.ctl /run/clamd.socket
