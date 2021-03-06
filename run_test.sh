#!/bin/sh

if [ -f ".env.test.local" ]; then
    export `cat .env.test.local`
fi

if [ -z "${AIDBOX_LICENSE_KEY_TESTS}" ]; then
    echo "AIDBOX_LICENSE_KEY_TESTS is required to run tests"
    exit 1
fi

if [ -z "${AIDBOX_LICENSE_ID_TESTS}" ]; then
    echo "AIDBOX_LICENSE_ID_TESTS is required to run tests"
    exit 1
fi

M1=`uname -a | grep -o arm64`
if [ -z "${M1}" ]; then
    COMPOSE_FILES="-f docker-compose.tests.yaml -f docker-compose.tests.local.yaml"
else
    COMPOSE_FILES="-f docker-compose.tests.yaml -f docker-compose.tests.local.yaml -f docker-compose.tests.m1.yaml"
fi

docker-compose $COMPOSE_FILES pull
docker-compose $COMPOSE_FILES up -d
curl -u root:secret 'http://localhost:8181/$load'  -H 'content-type: application/json' --request POST --data '{"source":"https://sdc.beda.software/demo-data.ndjson.gz"}'

if [ -z "$CI" ]; then
    yarn test $@ --runInBand --passWithNoTests
else
    docker-compose -f docker-compose.tests.yaml -f docker-compose.ci.yaml up --exit-code-from frontend frontend
fi
exit $?
