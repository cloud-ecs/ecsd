#!/bin/sh

sudo apt-get install -y clamav clamav-base clamav-daemon libclamav7 clamav-freshclam

# freshclam takes 50+ minutes to download databases
#sudo /usr/bin/freshclam

#
#sudo touch /var/run/clamav/clamd.ctl
#sudo chown clamav:clamav /var/run/clamav/clamd.ctl

#sudo /etc/init.d/clamav-daemon start
#sudo invoke-rc.d clamav-daemon start
sudo service clamav-daemon start