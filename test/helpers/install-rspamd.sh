#!/bin/sh

wget -O- https://rspamd.com/apt-stable/gpg.key | sudo apt-key add -
echo "deb [arch=amd64] http://rspamd.com/apt-stable/ $(lsb_release -c -s) main" | sudo tee /etc/apt/sources.list.d/rspamd.list
echo "deb-src [arch=amd64] http://rspamd.com/apt-stable/ $(lsb_release -c -s) main" | sudo tee -a /etc/apt/sources.list.d/rspamd.list
sudo apt-get update
sudo apt-get --no-install-recommends install -y rspamd

sudo service rspamd defaults
sudo service rspamd start
