test: test-unit test-flake8 test-playwright

test-all: test-unit test-flake8 test-playwright test-client

test-unit:
	./bin/gfarm-http-gateway-test.sh

test-unit-verbose test-unit-v:
	./bin/gfarm-http-gateway-test.sh -s
	
test-client:
	../client/test/gfarm-http-test.sh /tmp

test-flake8:
	./venv/bin/flake8 api

test-playwright:
	npm --prefix frontend/app/react-app run e2e:chromium

test-playwright-all:
	npm --prefix frontend/app/react-app run e2e:all

setup setup-freezed:
	GFARM_INSTALL_CHECK=1 INSTALL_SYS_PACKAGES=0 ./setup.sh

setup-with-sys-packages:
	GFARM_INSTALL_CHECK=1 INSTALL_SYS_PACKAGES=1 ./setup.sh

setup-latest:
	GFARM_INSTALL_CHECK=1 INSTALL_SYS_PACKAGES=0 ./setup.sh requirements_dev.txt

setup-latest-with-sys-packages:
	GFARM_INSTALL_CHECK=1 INSTALL_SYS_PACKAGES=1 ./setup.sh requirements_dev.txt

make setup-latest-for-github-actions:
	GFARM_INSTALL_CHECK=0 INSTALL_SYS_PACKAGES=0 ./setup.sh requirements_dev.txt

setup-playwright:
	npx --prefix frontend/app/react-app playwright install --with-deps chromium

setup-playwright-all:
	npx --prefix frontend/app/react-app playwright install --with-deps

freeze:
	./venv/bin/pip3 freeze > requirements.txt

clear-venv:
	rm -rf ./venv
