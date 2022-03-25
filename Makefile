PLUGIN=users

default:
	npm install --prefix $(PLUGIN)
	npm run --prefix $(PLUGIN) build

all: default

# system install, requires `systemctl restart cockpit.socket`
install: default
	mkdir -p $(DESTDIR)/usr/share/cockpit/$(PLUGIN)
	cp -rpf $(PLUGIN)/dist/* $(DESTDIR)/usr/share/cockpit/$(PLUGIN)

# install to ~/.local, can test plugin without restarting cockpit
install-local: default
	mkdir -p $(HOME)/.local/share/cockpit/$(PLUGIN)-test
	cp -rpf $(PLUGIN)/dist/* $(HOME)/.local/share/cockpit/$(PLUGIN)-test

install-remote: default
	ssh root@osd1 mkdir -p /root/.local/share/cockpit/$(PLUGIN)-test
	rsync -avh $(PLUGIN)/dist/* root@osd1:/root/.local/share/cockpit/$(PLUGIN)-test
	# ssh root@osd1 systemctl stop cockpit.socket
	# ssh root@osd1 systemctl start cockpit.socket
