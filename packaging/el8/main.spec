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
make OS_PACKAGE_RELEASE=el8

%install
make DESTDIR=%{buildroot} install

%files
/usr/share/cockpit/identities/*

%changelog
* Thu May 11 2023 Joshua Boudreau <jboudreau@45drives.com> 0.1.12-1
- remove all regex lookbehinds
* Thu May 11 2023 Joshua Boudreau <jboudreau@45drives.com> 0.1.11-1
- Fix parsing regex for Safari
* Wed Jul 06 2022 Joshua Boudreau <jboudreau@45drives.com> 0.1.10-1
- Clear password modal inputs on reopen
- Fix accidental bold font in datepicker in user activity table
- Bump dependency versions
* Fri Jun 24 2022 Joshua Boudreau <jboudreau@45drives.com> 0.1.9-1
- Clean up table styling
* Fri Jun 24 2022 Joshua Boudreau <jboudreau@45drives.com> 0.1.8-1
- Fix z-height of modal popups
* Fri Jun 24 2022 Joshua Boudreau <jboudreau@45drives.com> 0.1.7-1
- Download login history CSV directly in browser instead of through fsread1 channel
  payload
* Fri Jun 03 2022 Joshua Boudreau <jboudreau@45drives.com> 0.1.6-1
- Use new components and update styling
* Thu May 19 2022 Joshua Boudreau <jboudreau@45drives.com> 0.1.5-2
- Add package dependencies
* Thu May 19 2022 Joshua Boudreau <jboudreau@45drives.com> 0.1.5-1
- store dark mode in cockpit.localStorage so it is synchronized across plugins
* Fri May 06 2022 Joshua Boudreau <jboudreau@45drives.com> 0.1.4-1
- fix info button position
- add more information to exported user activity CSV
* Thu May 05 2022 Joshua Boudreau <jboudreau@45drives.com> 0.1.3-1
- Add plugin info button
- Handle user password case where locked and not set
- Remove gap under activity table on dashboard
- Add exporting user activity as CSV download
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