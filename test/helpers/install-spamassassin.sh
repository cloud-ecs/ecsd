#!/bin/sh
set -eu

sudo apt-get update
sudo apt-get install -y spamassassin spamc

# pull down rules so spamd will start (GTUBE detection itself is built in)
sudo sa-update || true

# older releases gate the daemon behind ENABLED=1 in a defaults file
for f in /etc/default/spamd /etc/default/spamassassin; do
    if [ -f "$f" ]; then
        sudo sed -i 's/^ENABLED=.*/ENABLED=1/' "$f"
    fi
done

# the service was renamed spamassassin -> spamd across releases; spamd listens
# on 127.0.0.1:783 by default, which is the port the tests expect
sudo systemctl enable --now spamd 2>/dev/null || sudo systemctl enable --now spamassassin
sudo systemctl restart spamd 2>/dev/null || sudo systemctl restart spamassassin
