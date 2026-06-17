#!/usr/bin/env bash
set -euo pipefail

# Block until each scanner service is accepting connections, so `npm test`
# doesn't race service startup and skip the live engines.
wait_port () {
    local name=$1 port=$2 i
    for ((i = 0; i < 30; i++)); do
        if (exec 3<>"/dev/tcp/127.0.0.1/${port}") 2>/dev/null; then
            echo "✓ ${name} listening on ${port}"
            return 0
        fi
        sleep 2
    done
    echo "✗ ${name} never came up on ${port}" >&2
    return 1
}

wait_port clamd  3310
wait_port spamd  783
wait_port rspamd 11333

echo "all scanner services are up"
