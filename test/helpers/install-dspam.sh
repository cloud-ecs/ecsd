#!/bin/sh

sudo apt-get install -y dspam --force-yes
sudo sed -i.bak 's/ENABLED.*/ENABLED=1/' /etc/default/dspam
sudo invoke-rc.d dspam start
