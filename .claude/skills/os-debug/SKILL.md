---
name: os-debug
description: OS-level debugging — logs, resource usage, network stack, package management, dependency hell, processes. Cross-platform (Linux via journalctl/apt/ldd/ss, Windows via PowerShell Event Log/Get-Process/Get-NetTCPConnection/winget). Use when user hits service crashes, OOM kills, port conflicts, library mismatches, or "command not found".
allowed-tools: Bash(journalctl *), Bash(dmesg *), Bash(systemctl *), Bash(systemd-cgtop *), Bash(top *), Bash(htop *), Bash(iotop *), Bash(free *), Bash(vmstat *), Bash(uptime *), Bash(nproc *), Bash(pidstat *), Bash(nethogs *), Bash(ps *), Bash(pgrep *), Bash(ss *), Bash(ip *), Bash(nft *), Bash(ufw *), Bash(iptables *), Bash(resolvectl *), Bash(dig *), Bash(mtr *), Bash(traceroute *), Bash(ping *), Bash(apt *), Bash(apt-cache *), Bash(apt-mark *), Bash(apt-get *), Bash(dpkg *), Bash(ldd *), Bash(ldconfig *), Bash(pkg-config *), Bash(strings *), Bash(lsof *), Bash(strace *), Bash(nsenter *), Bash(df *), Bash(du *), Bash(sudo *), Bash(cat *), Bash(ls *), Bash(grep *), Bash(head *), Bash(tail *), Bash(wc *), Bash(sort *), Bash(env *), Bash(command *), Bash(powershell *), Bash(pwsh *), Bash(wmic *), Bash(tasklist *), Bash(netstat *), Bash(sc *), Bash(winget *), Bash(choco *), Bash(where *)
---

# OS Debug — logs / resources / network / packages / deps / processes

Cross-platform OS-level debugging. **Pick the section that matches the user's OS**: Linux (Ubuntu 22.04+ preferred) or Windows 10/11 (PowerShell 5.1+ or PowerShell 7).

## Detecting the OS

Inside Claude Code, run `node -e "console.log(process.platform)"` — outputs `linux`, `darwin`, or `win32`. Or just check the conversation: if `journalctl` exists → Linux; if `Get-Service` works → Windows.

## In scope

- System logs (Linux journalctl/dmesg · Windows Event Log)
- Resource usage (CPU / memory / I/O / network per-process)
- Network stack at OS level
- Package management (apt/dpkg on Linux · winget/chocolatey on Windows)
- Dependency resolution (ldd/ldconfig on Linux · DLL loader / Dependencies on Windows)
- Process & service inspection

## Out of scope (route elsewhere)

- Application-level debugging — back to the relevant specialist
- Container internals beyond `docker logs` — out of scope
- k8s / cluster orchestration / deep FS tuning — out of scope

---

# Linux (Ubuntu 22.04+, systemd-based)

**Sudo discipline.** Never assume passwordless sudo. Print the command; the user runs it via `! <cmd>` in Claude Code.

## L1. journalctl / system logs

### Kernel / boot
```bash
sudo dmesg -T | tail -50           # human-readable timestamps, last 50 lines
journalctl -k -b                   # kernel log, current boot
journalctl -k -b -1                # previous boot (did the box crash?)
journalctl --list-boots
```

### Service logs
```bash
journalctl -u <service>                       # full history
journalctl -u <service> -f                    # tail live
journalctl -u <service> --since "1 hour ago"
journalctl -u <service> -p err                # priority ≤ err only
journalctl -u <service> -o cat                # strip metadata
```

### OOM-killed processes
```bash
journalctl -k --since "1 day ago" | grep -iE "killed process|out of memory"
```

## L2. Resource usage

```bash
uptime                    # load averages (1 / 5 / 15 min)
free -h                   # memory — "available" matters, not "free"
df -h                     # disk per mountpoint
vmstat 1 5                # 5 samples 1s apart; si/so nonzero = swapping
top                       # interactive; Shift+M sort by mem, P by CPU
htop                      # nicer — F4 filter, F6 sort, F9 kill
ps aux --sort=-%mem | head -10   # top memory consumers
sudo iotop -oPa           # disk I/O per process
sudo nethogs <iface>      # network bandwidth per process
```

## L3. Network stack

```bash
ip -c a                              # interfaces + IPs
ip -c r                              # routing table
sudo ss -tulnp                       # TCP+UDP listeners with process
sudo lsof -i :<port>                 # which proc holds this port
resolvectl status                    # DNS resolver state
dig +short <host>                    # direct DNS query
sudo nft list ruleset                # nftables firewall
ping -c 4 <host>
mtr -n <host>                        # continuous traceroute + loss%
```

Ubuntu 22.04 pitfalls:
- `/etc/resolv.conf` is a systemd symlink — edits don't persist. Use `resolvectl` or `/etc/systemd/resolved.conf`.
- Persistent interface config = `netplan apply`.

## L4. Package management (apt/dpkg)

```bash
apt list --installed 2>/dev/null | grep <pkg>
apt-cache policy <pkg>               # candidate + available versions
dpkg -l <pkg>                        # detailed install state
dpkg -L <pkg>                        # files owned by pkg
dpkg -S <path>                       # which pkg owns this file?

sudo apt update
sudo apt install <pkg>
sudo apt --fix-broken install        # fix half-configured state
sudo dpkg --configure -a
```

## L5. Dependency hell

### `GLIBCXX_3.4.XX not found`
```bash
strings /usr/lib/x86_64-linux-gnu/libstdc++.so.6 | grep '^GLIBCXX_' | sort -u
ldd /path/to/bin | grep libstdc++
echo "$LD_LIBRARY_PATH" | tr ':' '\n'
```

Fix order: unset shadowing `LD_LIBRARY_PATH` → install newer `libstdc++6` → rebuild against target's GLIBC.

### Shared-library resolution
```bash
ldd <binary>
LD_DEBUG=libs <binary> 2>&1 | head -50   # verbose loader trace
ldconfig -p | grep <libname>
sudo ldconfig                        # refresh cache
pkg-config --cflags --libs <name>
```

## L6. Process & service debug

```bash
systemctl status <service>             # current state + recent log
systemctl cat <service>                # the unit as systemd sees it
sudo systemctl restart <service>
sudo systemctl daemon-reload           # after editing a unit file

sudo lsof -p <pid>                     # open files/sockets/libs
sudo strace -p <pid> -f -e trace=network,file 2>&1 | head -50
cat /proc/<pid>/cgroup                 # which cgroup owns this proc
```

---

# Windows 10/11 (PowerShell 5.1+ or PowerShell 7)

**Admin discipline.** Some commands need an elevated PowerShell. Don't assume — print the command and tell the user "open PowerShell as Administrator" when needed.

## W1. Event Log / system logs

### System & application events
```powershell
# Recent system errors (last hour)
Get-WinEvent -LogName System -MaxEvents 50 | Where-Object Level -le 3

# Application errors
Get-WinEvent -LogName Application -MaxEvents 50 | Where-Object Level -le 3

# Filter by source/provider
Get-WinEvent -FilterHashtable @{LogName='System'; ProviderName='Service Control Manager'; StartTime=(Get-Date).AddHours(-1)}

# By event ID
Get-WinEvent -FilterHashtable @{LogName='Application'; ID=1000} -MaxEvents 20
```

### Service-specific log
```powershell
Get-WinEvent -ProviderName "<ServiceName>" -MaxEvents 50
```

### BSOD / crash logs
```powershell
Get-WinEvent -LogName System | Where-Object {$_.Id -eq 41} | Select-Object -First 5
# Memory dumps: C:\Windows\Minidump\*.dmp
```

## W2. Resource usage

```powershell
# CPU & memory by process
Get-Process | Sort-Object CPU -Descending | Select-Object -First 10
Get-Process | Sort-Object WorkingSet64 -Descending | Select-Object -First 10 ProcessName, @{N='MemMB';E={[math]::Round($_.WorkingSet64/1MB,1)}}

# System-wide
Get-Counter '\Memory\Available MBytes'
Get-Counter '\Processor(_Total)\% Processor Time'
Get-Counter '\PhysicalDisk(_Total)\% Disk Time'

# Disk space
Get-PSDrive -PSProvider FileSystem | Select-Object Name, Used, Free, @{N='Total';E={$_.Used+$_.Free}}

# Live interactive: Ctrl+Shift+Esc opens Task Manager
```

## W3. Network stack

```powershell
# Interfaces + IPs
Get-NetIPConfiguration
ipconfig /all

# Listening sockets — who has that port?
Get-NetTCPConnection -State Listen | Select-Object LocalAddress, LocalPort, OwningProcess, @{N='Process';E={(Get-Process -Id $_.OwningProcess).ProcessName}}

# Active connections
Get-NetTCPConnection -State Established

# DNS
Resolve-DnsName <host>
ipconfig /displaydns
ipconfig /flushdns

# Routing
Get-NetRoute
route print

# Firewall
Get-NetFirewallProfile
Get-NetFirewallRule -Enabled True | Select-Object DisplayName, Direction, Action

# Reachability
Test-NetConnection <host> -Port <port>
ping <host>
tracert <host>
```

## W4. Package management (winget / chocolatey)

```powershell
# winget (built-in on Windows 11; install "App Installer" on Windows 10)
winget list                          # installed packages
winget list <name>
winget install <Id>                  # e.g. winget install Python.Python.3.12
winget upgrade --all
winget uninstall <Id>
winget show <Id>                     # available versions

# Chocolatey (community-driven; install separately)
choco list --local-only
choco install <pkg>
choco upgrade all
choco uninstall <pkg>
```

## W5. Dependency resolution (DLLs)

### "The program can't start because XXX.dll is missing"
```powershell
# Find the DLL anywhere on disk
Get-ChildItem -Path C:\ -Filter "msvcp140.dll" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 5

# Check current PATH
$env:PATH -split ';'

# Where does Windows look for a command?
where.exe <command>
Get-Command <command> | Select-Object Source

# Common fix: install Visual C++ Redistributables
winget install Microsoft.VCRedist.2015+.x64
```

### Dependency Walker alternative
Use [Dependencies](https://github.com/lucasg/Dependencies) (modern replacement for depends.exe) to inspect what a binary needs.

### Python module not found
```powershell
python -c "import sys; print(sys.path)"
pip list
pip show <pkg>
```

## W6. Process & service debug

### Service state
```powershell
Get-Service                          # all services
Get-Service <name>
Get-Service | Where-Object Status -eq 'Stopped' | Where-Object StartType -eq 'Automatic'   # auto-start services that aren't running

# Service config (binary path, account)
Get-CimInstance Win32_Service -Filter "Name='<name>'" | Select-Object Name, PathName, StartName, State

# Restart
Restart-Service <name>
Start-Service <name>
Stop-Service <name>
```

### Process inspection
```powershell
Get-Process <name>
Get-Process -Id <pid> | Select-Object *
(Get-Process -Id <pid>).Modules                # loaded DLLs
Stop-Process -Id <pid> -Force

# Command line of a process
Get-CimInstance Win32_Process -Filter "ProcessId=<pid>" | Select-Object CommandLine

# Open files / handles — needs Handle.exe from Sysinternals
handle.exe -p <pid>
```

### Service-won't-start loop
1. `Get-Service <svc> | Select-Object Status, StartType` — current state
2. `Get-WinEvent -LogName System -MaxEvents 50 | Where-Object {$_.ProviderName -eq 'Service Control Manager'}` — recent service events
3. `Get-CimInstance Win32_Service -Filter "Name='<svc>'" | Select-Object PathName` — verify the binary path exists
4. Try starting in foreground: invoke `PathName` directly to see real errors

---

## Execution strategy

1. **Detect platform first.** `process.platform` or `uname -s` — don't blindly pick a section.
2. **Localize before sweeping.** Ask: symptom, onset, what changed? Read logs (L1 or W1) before running top-level tools.
3. **One section per task.** Pick the relevant one, don't grep across all six.
4. **Bound live commands.** Don't leave `top`, `htop`, Task Manager, or `Get-WinEvent -f` running in the agent loop.
5. **Privilege discipline.** Never assume root/Administrator — print the command, user runs.

## Reporting

- 1-line summary (or "no smoking gun yet")
- Key log lines / output excerpts (trim to relevant)
- Which section diagnosed it
- Suggested fix; flag workaround vs root-cause
- Next step if not fully resolved

## Common traps

**Linux**
- Permission denied on `/proc/<pid>/*` — need `sudo` or own the process
- `journalctl: No journal files were found` — `systemd-journald` not running
- apt locks held — another apt process running, or stale lock in `/var/lib/dpkg/lock-frontend`

**Windows**
- `Get-WinEvent ... Access denied` — open PowerShell as Administrator
- `winget: command not found` on Windows 10 — install "App Installer" from Microsoft Store
- Long-path issues — enable `LongPathsEnabled` in registry or use `\\?\` prefix
- PowerShell execution policy blocks scripts — `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`
