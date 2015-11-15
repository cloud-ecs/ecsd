#!/bin/sh

sudo apt-get install -y clamav clamav-base libclamav6 clamav-freshclam clamav-daemon

# freshclam takes 50+ minutes to download databases
#sudo /usr/bin/freshclam

#sudo /etc/init.d/clamav-daemon start
sudo invoke-rc.d clamav-daemon start
