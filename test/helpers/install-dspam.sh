#!/bin/sh

sudo apt-get install -y dspam
sudo sed -i.bak 's/ENABLED.*/ENABLED=1/' /etc/default/dspam
sudo invoke-rc.d dspam start
