#!/bin/sh

sudo apt-get install -y clamav clamav-base clamav-daemon libclamav7 clamav-freshclam

# freshclam can take 50+ minutes to download databases
sudo /usr/bin/freshclam && sudo service clamav-daemon start
