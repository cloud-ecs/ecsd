#!/bin/sh
set -u

# Block until the scanner services are listening, so `npm test` doesn't race
# startup and skip the live engines. spamd and rspamd come up reliably and gate
# the job; clamd is slow/flaky to load its whole signature DB on hosted runners,
# so it's best-effort — its tests skip cleanly when it isn't ready.
wait_listen () {
    name=$1
    port=$2
    tries=$3
    i=0
    while [ "$i" -lt "$tries" ]; do
        if ss -ltn 2>/dev/null | grep -qE ":${port}([[:space:]]|\$)"; then
            echo "ok   - ${name} listening on ${port}"
            return 0
        fi
        i=$((i + 1))
        sleep 2
    done
    echo "FAIL - ${name} never listened on ${port}" >&2
    return 1
}

clamd_down=0
gate=0
wait_listen clamd  3310  90 || clamd_down=1
wait_listen spamd  783   30 || gate=1
wait_listen rspamd 11333 30 || gate=1

[ "$clamd_down" -eq 0 ] || echo "WARN: clamd not ready; its tests will skip (non-gating)" >&2

if [ "$clamd_down" -ne 0 ] || [ "$gate" -ne 0 ]; then
    echo "=== listening sockets ==="
    sudo ss -lntp || true
    for svc in clamav-daemon spamd rspamd; do
        echo "=== ${svc} ==="
        systemctl is-active "$svc" 2>/dev/null || true
        sudo journalctl -u "$svc" --no-pager -n 40 2>/dev/null || true
    done
fi

exit "$gate"
