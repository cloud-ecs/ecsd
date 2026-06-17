#!/bin/sh
set -eu

sudo apt-get update
sudo apt-get install -y clamav clamav-daemon

# clamd refuses to start without a signature database; freshclam fetches it.
# Its own service holds the update lock, so stop that before running by hand.
sudo systemctl stop clamav-freshclam || true
sudo freshclam

# clamd's AppArmor profile denies reading files outside its allowlist (the CI
# workspace included), so SCAN-by-path over the cli + unix socket fails with
# "Permission denied". Unload the profile so clamd can read the test fixtures.
if [ -e /etc/apparmor.d/usr.sbin.clamd ]; then
    sudo apparmor_parser -R /etc/apparmor.d/usr.sbin.clamd 2>/dev/null || true
    sudo ln -sf /etc/apparmor.d/usr.sbin.clamd /etc/apparmor.d/disable/
fi

# 24.04 socket-activates clamd and it ignores the TCPSocket directive in
# clamd.conf in that mode. Add the TCP listener to the *socket* unit instead so
# systemd hands clamd the extra fd. clamd is slow to load the full DB before it
# starts serving, so readiness is best-effort (see wait-for-scanners.sh).
sudo mkdir -p /etc/systemd/system/clamav-daemon.socket.d
printf '[Socket]\nListenStream=127.0.0.1:3310\n' \
    | sudo tee /etc/systemd/system/clamav-daemon.socket.d/tcp.conf
sudo systemctl daemon-reload
sudo systemctl restart clamav-daemon.socket
sudo systemctl restart clamav-daemon.service || true

# expose the daemon socket where lib/detect-socket looks (/tmp or /var/run)
i=0
while [ ! -S /run/clamav/clamd.ctl ] && [ "$i" -lt 30 ]; do
    i=$((i + 1))
    sleep 2
done
sudo ln -sf /run/clamav/clamd.ctl /run/clamd.socket
