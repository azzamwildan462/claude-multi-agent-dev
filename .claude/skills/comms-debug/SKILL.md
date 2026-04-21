---
name: comms-debug
description: Debug communication channels — Ethernet via tshark, USB-serial via usbmon+tshark, and UART via minicom/tio/screen. Use when user says "tshark", "wireshark", "sniff packet", "packet capture", "usbmon", "serial debug", "uart debug", "minicom", "tio", "sniff ethernet", or asks to inspect bytes on any wire.
allowed-tools: Bash(tshark *), Bash(tcpdump *), Bash(sudo *), Bash(modprobe *), Bash(ip *), Bash(lsusb *), Bash(minicom *), Bash(tio *), Bash(screen *), Bash(stty *), Bash(ls *), Bash(cat *), Bash(command *)
---

# Comms Debug — tshark, usbmon, UART

Unified guide for three transports:

| Channel | Tool |
|---|---|
| Ethernet (UDP/TCP/IP) | `tshark` (Wireshark CLI) |
| USB-serial (CDC / FTDI / CP210x) | `usbmon` kernel module + `tshark -i usbmonN` |
| UART direct (`/dev/ttyUSB*`, `/dev/ttyACM*`) | `minicom`, `tio`, or `screen` |

## Prereq check

```bash
command -v tshark >/dev/null 2>&1 && tshark --version | head -1 || echo "tshark MISSING"
command -v tio >/dev/null 2>&1 && tio --version | head -1 || echo "tio MISSING (optional)"
command -v minicom >/dev/null 2>&1 && minicom --version | head -1 || echo "minicom MISSING (optional)"
ls /sys/module/usbmon 2>/dev/null && echo "usbmon loaded" || echo "usbmon NOT loaded"
```

Install hints:
```
sudo apt install tshark tio minicom
```

**Never assume passwordless sudo.** All commands below that need `sudo` must be printed for the user to run in their own terminal — suggest `! <cmd>` in Claude Code.

---

## 1. Ethernet (tshark)

### List interfaces

```bash
tshark -D
```

Pick the iface number (e.g. `1. enp0s31f6`).

### Live UDP capture by port (common for lidar / EtherCAT streams)

```bash
sudo tshark -i <iface> -f 'udp port 2368' -c 1000 -w /tmp/cap.pcap
```

- `-f` — BPF capture filter (narrow at kernel level, cheap)
- `-c N` — stop after N packets (always bound captures)
- `-w` — save pcap (don't dump decoded text for large runs)

### Filter by host + port

```bash
sudo tshark -i <iface> -f 'host 192.168.1.10 and tcp port 2368' -c 500
```

### Realtime verbose (small debug only)

```bash
sudo tshark -i <iface> -f 'udp port 2368' -V -c 20
```

### Grant capture permission without full sudo (one-time)

```bash
sudo setcap cap_net_raw,cap_net_admin=eip "$(command -v tshark)"
```

After this, tshark can capture as the regular user.

### Post-mortem analysis on a saved pcap

```bash
# Packet summary
tshark -r /tmp/cap.pcap -q -z io,stat,1

# Just src/dst/port tuples
tshark -r /tmp/cap.pcap -Y 'udp.dstport==2368' \
  -T fields -e frame.time_epoch -e ip.src -e ip.dst -e udp.srcport -e udp.dstport -e udp.length
```

Use `-Y` (display filter, Wireshark syntax) on the read side. `-f` does not work on `-r`.

---

## 2. USB-serial (usbmon + tshark)

For sniffing USB-CDC (Arduino / ESP32 / STM32 VCP), FTDI FT232, CP210x. Useful when a driver-side bug is suspected or when you want to compare bytes sent vs received.

### Enable usbmon

```bash
sudo modprobe usbmon
ls /sys/kernel/debug/usb/usbmon/
# You should see 0u, 1u, 2u, ... — numbers match USB bus numbers.
```

If `/sys/kernel/debug/` isn't mounted: `sudo mount -t debugfs none /sys/kernel/debug`.

### Identify the target device

```bash
lsusb
# Bus 001 Device 004: ID 10c4:ea60 Silicon Labs CP210x UART Bridge
#     ^^^ bus=001 — capture on usbmon1
```

### Capture

```bash
sudo tshark -i usbmon1 -c 500 -w /tmp/usb.pcap
```

### Filter to a single device on the bus

```bash
sudo tshark -i usbmon1 -Y "usb.device_address==4" -c 500
```

`device_address` is the second number from `lsusb` (`Device 004` → `==4`). It changes on replug — re-check.

### Extract payload bytes

```bash
tshark -r /tmp/usb.pcap -Y 'usb.transfer_type==0x03' \
  -T fields -e frame.time_relative -e usb.capdata
```

`transfer_type==0x03` is BULK — typical for USB-CDC data endpoints. For interrupt endpoints (some CDC control), use `0x01`.

---

## 3. UART direct monitoring

Pick one of `tio` / `minicom` / `screen`. `tio` is the most pleasant modern option.

### tio (recommended)

```bash
tio /dev/ttyUSB0 -b 115200
```

- Log to file: `tio -l -L /tmp/uart.log /dev/ttyUSB0`
- Timestamps: add `-t`
- Ctrl-T q to quit, Ctrl-T ? for help

### minicom (classic, menu-driven)

```bash
minicom -D /dev/ttyUSB0 -b 115200
```

- Ctrl-A Z for menu
- Ctrl-A X to exit (confirm)

### screen (no frills, raw)

```bash
screen /dev/ttyUSB0 115200
```

Quit: Ctrl-A `\`.

### Verify port settings

```bash
stty -F /dev/ttyUSB0 -a
```

Look for baud (`speed 115200 baud`), parity, stop bits, flow control.

### Fix permission denied on `/dev/ttyUSB*`

```bash
sudo usermod -aG dialout $USER && newgrp dialout
```

User must log out / back in for the group to apply to new shells.

---

## Pitfalls

- **Only one process per serial device.** Close monitor before flashing; close tshark session before opening minicom on the same USB device.
- **usbmon captures ALL traffic on the bus.** Narrow with `device_address` filter; otherwise you'll drown in keyboard/mouse packets.
- **BPF filter (`-f`) syntax** is pcap-style, different from Wireshark display filter (`-Y`). Don't mix.
- **tshark on high-rate streams** (lidar at 100+ Mbps) loses packets without `-w` direct-to-disk; don't use `-V` for these.
- **`-c 0`** is NOT "unbounded" — it's the same as omitting; you get default behavior. Use `-a duration:60` for a time-bounded capture.

---

## Execution strategy

1. Ask the user what they want to inspect: **which transport**, **which device / interface**, **which protocol** (port, baud). Do not guess.
2. Run prereq check first if any tool might be missing.
3. **Always bound the capture** — `-c <N>` or `-a duration:N`. Never unbounded.
4. Save pcaps to `/tmp/` for speed. Suggest the user move them elsewhere if they matter.
5. If a command needs `sudo`, print it for the user to paste into their own terminal (`! <cmd>` in Claude Code) — don't assume passwordless.

---

## Reporting

After a capture:
- Packet count, file path, duration
- 1-line summary of what was seen (protocol breakdown, top talkers, or "looks like what user expected")
- Suggested next command if the user wants to drill down

After UART monitor: file path of the log (if `-l` used), and the last few lines of interesting output.

---

## Trouble

- **`tshark: Permission denied`** — either run with `sudo` OR `setcap` per the Ethernet section
- **`modprobe: FATAL: Module usbmon not found`** — kernel without USB debugging support; nothing to do but use a different capture method (FTDI-level sniffer, logic analyzer)
- **`/dev/usbmonN` missing after modprobe** — `debugfs` not mounted (see section 2)
- **Garbled UART output** — wrong baud or hardware flow control mismatch; re-check with `stty -F`
- **tio / minicom shows nothing** — TX/RX swapped on the wire, or the device is waiting for a handshake / DTR toggle
