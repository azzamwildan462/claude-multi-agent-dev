---
name: linux-debug
description: OS-level debugging on Ubuntu — journalctl logs, resource usage, network stack (IP/socket), apt packages, dependency hell (ldd/ldconfig/GLIBCXX), process & service inspection. Use when user hits non-AV issues like service crashes, OOM kills, port conflicts, library version mismatches, broken apt, or "GLIBCXX not found" errors.
allowed-tools: Bash(journalctl *), Bash(dmesg *), Bash(systemctl *), Bash(systemd-cgtop *), Bash(top *), Bash(htop *), Bash(iotop *), Bash(free *), Bash(vmstat *), Bash(uptime *), Bash(nproc *), Bash(pidstat *), Bash(nethogs *), Bash(ps *), Bash(pgrep *), Bash(ss *), Bash(ip *), Bash(nft *), Bash(ufw *), Bash(iptables *), Bash(resolvectl *), Bash(dig *), Bash(mtr *), Bash(traceroute *), Bash(ping *), Bash(apt *), Bash(apt-cache *), Bash(apt-mark *), Bash(apt-get *), Bash(dpkg *), Bash(ldd *), Bash(ldconfig *), Bash(pkg-config *), Bash(strings *), Bash(lsof *), Bash(strace *), Bash(nsenter *), Bash(rosdep *), Bash(df *), Bash(du *), Bash(sudo *), Bash(cat *), Bash(ls *), Bash(grep *), Bash(head *), Bash(tail *), Bash(wc *), Bash(sort *), Bash(env *), Bash(command *)
---

# Linux Debug — logs / resources / network / packages / deps / processes

**Requires Linux (Ubuntu 22.04+ preferred, systemd-based).** No Windows / macOS support tested.

## In scope

- System logs (journalctl, dmesg)
- Resource usage (CPU / memory / I/O / network per-process)
- Network stack at OS level (IP, socket, DNS, routing, firewall)
- Package management (apt / dpkg)
- Dependency hell (ldd, ldconfig, pkg-config, GLIBC/GLIBCXX mismatches)
- Process & service inspection (systemctl, strace, lsof, /proc)

## Out of scope (route elsewhere)

- Kernel modules, hardware drivers → `hardware-engineer`
- Wire-level sniffing (tshark, usbmon, UART) → `comms-debug` skill
- ROS2 pipeline health (topic hz, rosbag, ros2 doctor) → `system-evaluator`
- ROS2 discovery / DDS config — currently not covered here
- Container internals beyond basic `docker logs` — out of scope
- k8s, cluster orchestration, security hardening, deep FS tuning — out of scope

## Navigation

1. [journalctl / system logs](#1-journalctl--system-logs)
2. [Resource usage](#2-resource-usage)
3. [Network stack (OS-level)](#3-network-stack-os-level)
4. [Package management (apt / dpkg)](#4-package-management-apt--dpkg)
5. [Dependency hell](#5-dependency-hell)
6. [Process & service debug](#6-process--service-debug)

## Prereq check

```bash
command -v journalctl >/dev/null 2>&1 && echo "journalctl OK" || echo "NOT systemd-based"
command -v systemctl >/dev/null 2>&1 && systemctl --version | head -1 || echo "systemctl MISSING"
command -v ss >/dev/null 2>&1 && echo "ss OK" || echo "ss MISSING (install iproute2)"
```

**Never assume passwordless sudo.** Commands needing `sudo` should be printed and the user runs via `! <cmd>` in Claude Code.

---

## 1. journalctl / system logs

### Kernel / boot
```bash
sudo dmesg -T | tail -50           # human-readable timestamps, last 50 lines
journalctl -k -b                   # kernel log, current boot
journalctl -k -b -1                # previous boot (did the box crash?)
journalctl --list-boots            # all recorded boots
```

### Service logs
```bash
journalctl -u <service>                       # full history
journalctl -u <service> -f                    # tail live
journalctl -u <service> --since "1 hour ago"
journalctl -u <service> -p err                # priority ≤ err only
journalctl -u <service> -o cat                # strip metadata, raw stdout/stderr
```

Priority levels: `emerg`, `alert`, `crit`, `err`, `warning`, `notice`, `info`, `debug` (0–7).

### OOM-killed processes
```bash
journalctl -k --since "1 day ago" | grep -iE "killed process|out of memory"
```

### Match crash to boot
```bash
journalctl --list-boots
journalctl -b <boot-id> -u <service>
```

---

## 2. Resource usage

### Quick snapshot
```bash
uptime                    # load averages (1 / 5 / 15 min)
free -h                   # memory — "available" column matters, not "free"
df -h                     # disk per mountpoint
vmstat 1 5                # 5 samples 1s apart; si/so nonzero = swapping
nproc                     # CPU count, for interpreting load avg
```

### CPU / memory by process
```bash
top                       # interactive; Shift+M sort by mem, P by CPU
htop                      # nicer — F4 filter, F6 sort, F9 kill
ps fauxww | head -30      # all procs, full args, tree view
pgrep -af <pattern>       # procs matching pattern (with args)
ps aux --sort=-%mem | head -10   # top memory consumers right now
```

### I/O
```bash
sudo iotop -oPa           # -o only active, -P per process, -a accumulated
pidstat -d 1              # disk I/O per process, 1s samples
```

### Per-process network bandwidth
```bash
sudo nethogs <iface>      # bytes/sec per process; q to quit
```

### Cgroup memory (systemd services)
```bash
systemd-cgtop -m          # live memory per cgroup
```

### Load-average interpretation
- Sustained `1-min load > nproc * 1.0` → oversubscribed.
- Spiky load OK if 15-min avg is normal.

---

## 3. Network stack (OS-level)

### Interfaces, routing, ARP
```bash
ip -c a                   # interfaces + IPs
ip -c r                   # routing table
ip -c n                   # ARP / neighbor table
```

### Listening sockets — who has that port?
```bash
sudo ss -tulnp                       # TCP+UDP listeners, numeric, with process
sudo ss -tp state established        # active TCP connections with pids
sudo lsof -i :<port>                 # which proc holds this port
```

### DNS
```bash
resolvectl status                    # resolver state + DNS servers
resolvectl query <host>              # resolve via system resolver
dig +short <host>                    # direct DNS query, bypass /etc/hosts
cat /etc/hosts                       # manual overrides
```

### Firewall
```bash
sudo nft list ruleset                # nftables (modern default)
sudo ufw status verbose              # if ufw is in use
sudo iptables -L -n -v               # legacy iptables (on Ubuntu, mapped to nft)
```

### Reachability
```bash
ping -c 4 <host>
traceroute <host>                    # one-shot path
mtr -n <host>                        # continuous traceroute + loss %
```

### Ubuntu 22.04 pitfalls
- `/etc/resolv.conf` is a systemd symlink — edits don't persist. Use `resolvectl` or `/etc/systemd/resolved.conf`.
- Persistent interface config = `netplan apply`, not manual `ip` (which doesn't survive reboot).

---

## 4. Package management (apt / dpkg)

### Inspect
```bash
apt list --installed 2>/dev/null | grep <pkg>
apt-cache policy <pkg>               # candidate + available versions
dpkg -l <pkg>                        # detailed install state
dpkg -L <pkg>                        # files owned by pkg
dpkg -S <path>                       # which pkg owns this file?
```

### Install / upgrade / remove
```bash
sudo apt update
sudo apt install <pkg>
sudo apt upgrade <pkg>               # just that pkg
sudo apt full-upgrade                # may remove to satisfy deps
sudo apt remove <pkg>                # keep configs
sudo apt purge <pkg>                 # remove configs too
```

### Fix broken state
```bash
sudo apt --fix-broken install
sudo dpkg --configure -a             # re-run postinst for half-configured pkgs
sudo apt-get clean                   # clear /var/cache/apt/archives
```

### Pin / hold versions
```bash
apt-mark showhold
sudo apt-mark hold <pkg>
sudo apt-mark unhold <pkg>
```

### Ubuntu + ROS2 Humble pain points
- Check `/etc/apt/sources.list.d/ros2.list` exists and `apt-cache policy ros-humble-desktop` has a candidate from `packages.ros.org`.
- Never mix ROS2 distros (`ros-humble-*` + `ros-rolling-*`) in the same system — deps will break.

---

## 5. Dependency hell

### `GLIBCXX_3.4.XX not found` — the classic

```bash
# Which GLIBCXX versions does the lib expose?
strings /usr/lib/x86_64-linux-gnu/libstdc++.so.6 | grep '^GLIBCXX_' | sort -u

# Which libstdc++ is the binary actually picking up?
ldd /path/to/bin | grep libstdc++

# Is LD_LIBRARY_PATH pointing to an old shadow copy? (often from anaconda)
echo "$LD_LIBRARY_PATH" | tr ':' '\n'
```

Fix order of preference:
1. Unset the shadowing `LD_LIBRARY_PATH` entry.
2. Install newer `libstdc++6` (apt or toolchain PPA).
3. Rebuild the consumer against the target's GLIBC, not the dev box's.

### Shared-library resolution
```bash
ldd <binary>                         # resolved SOs + missing ones
LD_DEBUG=libs <binary> 2>&1 | head -50   # verbose loader trace
ldconfig -p | grep <libname>         # linker cache lookup
sudo ldconfig                        # refresh cache after installing libs
```

### `pkg-config` for build-time deps
```bash
pkg-config --list-all | grep <name>
pkg-config --cflags --libs <name>
pkg-config --modversion <name>
```

If `pkg-config <pkg>` fails → `.pc` file missing, usually `sudo apt install lib<pkg>-dev`.

### ROS2 missing rosdeps
```bash
rosdep update
rosdep install --from-paths src --ignore-src --simulate       # dry run
rosdep install --from-paths src --ignore-src -r -y            # install for real
```

`-r` continues past individual failures; only use after reviewing dry run.

### Environment sanity
```bash
env | grep -E '^(LD_|PKG_|PATH|ROS_)'      # the usual suspects
env -i bash                                # clean shell — isolate which var is biting
```

---

## 6. Process & service debug

### Service state
```bash
systemctl status <service>             # current state + recent log
systemctl cat <service>                # the unit as systemd sees it
systemctl show <service> -p <prop>     # specific property (e.g. MemoryMax)
sudo systemctl restart <service>
sudo systemctl daemon-reload           # after editing a unit file
```

### Process inspection
```bash
sudo lsof -p <pid>                     # open files / sockets / libs
sudo cat /proc/<pid>/status | grep -E "State|Name|Vm"
sudo cat /proc/<pid>/wchan             # kernel wait channel (what it's blocked on)

# Live syscall trace (attach to running proc)
sudo strace -p <pid> -f -e trace=network,file 2>&1 | head -50
```

`strace` tips: `-f` follows forks, `-e trace=<cat>` filters, `-c` prints syscall summary on detach.

### Namespace / cgroup
```bash
cat /proc/<pid>/cgroup                 # which cgroup owns this proc
sudo nsenter -t <pid> -n ss -tulnp     # inspect a container's netns from host
```

### Service-won't-start debug loop
1. `sudo systemctl restart <svc> && sudo systemctl status <svc>` — read the error
2. `journalctl -u <svc> --since "5 min ago" -o cat` — full stderr
3. After editing a unit file, always `sudo systemctl daemon-reload` before retry
4. If `ExecStart` is a script, run it by hand as the unit's `User=` to see real errors

---

## Execution strategy

1. **Localize first.** Ask: symptom, onset, what changed? Read logs (section 1) before running top-level tools.
2. **One section per task.** Don't sweep across all 6 — pick the relevant one.
3. **Bound live commands.** `top` / `htop` / `iotop` are interactive; for automation use `ps` / `ss` / `pidstat` snapshots.
4. **sudo discipline.** Never assume passwordless — print the command, user runs.
5. **Evidence over guesswork.** Copy the exact error string; don't paraphrase.

---

## Reporting

- 1-line summary (or "no smoking gun yet")
- Key log lines / output excerpts (trim to relevant)
- Which section diagnosed it
- Suggested fix; flag workaround vs root-cause
- Next step if not fully resolved

---

## Trouble

- **Permission denied on `/proc/<pid>/*`** — need `sudo` or own the process
- **`journalctl: No journal files were found`** — `systemd-journald` not running or `/var/log/journal/` missing
- **`ss: command not found`** — install `iproute2` (rare, happens in minimal containers)
- **`strace: ... PTRACE_SEIZE ... Operation not permitted`** — `kernel.yama.ptrace_scope=1`; either `sudo` or temporarily `sysctl kernel.yama.ptrace_scope=0`
- **apt locks held** — another apt process running, or stale lock in `/var/lib/dpkg/lock-frontend`; check `sudo fuser /var/lib/dpkg/lock-frontend`
