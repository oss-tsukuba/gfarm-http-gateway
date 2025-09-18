#!/bin/bash
set -eu

mkdir -p config

# ==== Download gfarm2.conf ==== 
wget https://www.hpci-office.jp/info/download/attachments/69471402/get_gfarm2conf.sh
sh ./get_gfarm2conf.sh -f config/gfarm2.conf
chmod 644 config/gfarm2.conf
if ! grep "enable sasl" config/gfarm2.conf 2>&1 /dev/null; then
    echo 'auth enable sasl *' >>config/gfarm2.conf
fi

# ==== Download certificate ==== 
mkdir -p config/certs
wget -P config/certs https://www.hpci-office.jp/info/download/attachments/425328655/21d9c8b3.0 
