#!/bin/sh
set -u

# Block until the named scanner services are listening, so `npm test` doesn't
# race startup and skip the live engines. Pass the services to wait for, e.g.
#   wait-for-scanners.sh spamd rspamd
# spamd and rspamd come up reliably and gate the job; clamd is slow/flaky to
# load its whole signature DB on hosted runners, so it's best-effort — its
# tests skip cleanly when it isn't ready.
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

gate=0
failed=0

for svc in "$@"; do
    case "$svc" in
        clamd)
            wait_listen clamd 3310 90 || {
                failed=1
                echo "WARN: clamd not ready; its tests will skip (non-gating)" >&2
            }
            ;;
        spamd)
            wait_listen spamd 783 30 || { failed=1; gate=1; }
            ;;
        rspamd)
            wait_listen rspamd 11333 30 || { failed=1; gate=1; }
            ;;
        *)
            echo "unknown scanner: ${svc}" >&2
            exit 2
            ;;
    esac
done

if [ "$failed" -ne 0 ]; then
    echo "=== listening sockets ==="
    sudo ss -lntp || true
    for unit in clamav-daemon spamd rspamd; do
        echo "=== ${unit} ==="
        systemctl is-active "$unit" 2>/dev/null || true
        sudo journalctl -u "$unit" --no-pager -n 40 2>/dev/null || true
    done
fi

exit "$gate"
