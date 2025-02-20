#!/bin/bash

DIR=$(realpath $(dirname $0))
source "${DIR}/gfarm-http-common.sh"

export GFARM_HTTP_SESSION_SECRET="qU70WDyIpXdSOT9/7l0hICy0597EPRs/aPb5Mj5Xniw="
export GFARM_HTTP_OIDC_CLIENT_ID=TEST_CLIENT
export GFARM_HTTP_OIDC_BASE_URL=http://keycloak.test/
#export GFARM_HTTP_ALLOW_ANONYMOUS=yes
export GFARM_HTTP_DEBUG=yes
export PYTHONPATH="$API_DIR"

#$PYTEST "$@" "${API_DIR}/test/test_gfarm_http.py"
$PYTEST "$@"
