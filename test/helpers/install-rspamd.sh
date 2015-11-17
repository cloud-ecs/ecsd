#!/bin/sh

sudo apt-get install -y rspamd
sudo invoke-rc.d rspamd defaults
sudo service start rspamd
