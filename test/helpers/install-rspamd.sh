#!/bin/sh

CODENAME=$(lsb_release -c -s)
wget -O- https://rspamd.com/apt-stable/gpg.key | apt-key add -
echo "deb [arch=amd64] http://rspamd.com/apt-stable/ $CODENAME main" > /etc/apt/sources.list.d/rspamd.list
echo "deb-src [arch=amd64] http://rspamd.com/apt-stable/ $CODENAME main" >> /etc/apt/sources.list.d/rspamd.list
apt-get update
apt-get --no-install-recommends install -y rspamd

sudo invoke-rc.d rspamd defaults
sudo invoke-rc.d rspamd start
