#!/bin/sh

sudo apt-get install -y spamassassin
sudo sed -i.bak 's/ENABLED.*/ENABLED=1/' /etc/default/spamassassin
sudo invoke-rc.d spamassassin start
