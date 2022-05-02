Name: ::package_name::
Version: ::package_version::
Release: ::package_build_version::%{?dist}
Summary: ::package_description_short::
License: ::package_licence::
URL: ::package_url::
Source0: %{name}-%{version}.tar.gz
BuildArch: ::package_architecture_el::
Requires: ::package_dependencies_el_generic::

BuildRoot: %{_tmppath}/%{name}-%{version}-%{release}-root

%description
::package_title::
::package_description_long::

%prep
%setup -q

%build
make

%install
make DESTDIR=%{buildroot} install

%files
/usr/share/cockpit/identities/*

%changelog
* Mon May 02 2022 Joshua Boudreau <jboudreau@45drives.com> 0.1.2-1
- Fix race condition where notifications is undefined
- Handle case for password expiry = 99999 (default case)
- Properly determine user primary group from command, not just equal to user login name
* Tue Apr 26 2022 Joshua Boudreau <jboudreau@45drives.com> 0.1.1-1
- When no password is set, cancel button now says 'No Password'
- Fixed position of dropdown menu to add user to groups
- Implemented password expiry period
- Added ability to terminate user session
* Mon Apr 25 2022 Joshua Boudreau <jboudreau@45drives.com> 0.1.0-1
- first build
