#!/bin/sh

sudo apt-get install -y spamassassin
sudo sed -i.bak -e 's/ENABLED.*/ENABLED=1/' /etc/default/spamassassin
sudo sa-update && sudo service spamassassin start
