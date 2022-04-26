PLUGIN_SRC=identities
PLUGIN_DIST=identities/dist
PLUGIN_DEST=identities
REMOTE_TEST_HOST=osd1
REMOTE_TEST_USER=root
REMOTE_TEST_HOME:=$(shell ssh $(REMOTE_TEST_USER)@$(REMOTE_TEST_HOST) 'echo $HOME')

default:
	yarn --cwd $(PLUGIN_SRC) install
	yarn --cwd $(PLUGIN_SRC) build

all: default

# system install, requires `systemctl restart cockpit.socket`
install: default
	mkdir -p $(DESTDIR)/usr/share/cockpit/$(PLUGIN_DEST)
	cp -rpf $(PLUGIN_DIST)/* $(DESTDIR)/usr/share/cockpit/$(PLUGIN_DEST)

# install to ~/.local, can test plugin without restarting cockpit
install-local: default
	mkdir -p $(HOME)/.local/share/cockpit/$(PLUGIN_DEST)-test
	cp -rpf $(PLUGIN_DIST)/* $(HOME)/.local/share/cockpit/$(PLUGIN_DEST)-test

install-remote: default
	ssh $(REMOTE_TEST_USER)@$(REMOTE_TEST_HOST) 'mkdir -p $(REMOTE_TEST_HOME)/.local/share/cockpit/$(PLUGIN_DEST)-test'
	rsync -avh $(PLUGIN_DIST)/* $(REMOTE_TEST_USER)@$(REMOTE_TEST_HOST):$(REMOTE_TEST_HOME)/.local/share/cockpit/$(PLUGIN_DEST)-test
	# ssh root@osd1 systemctl stop cockpit.socket
	# ssh root@osd1 systemctl start cockpit.socket
