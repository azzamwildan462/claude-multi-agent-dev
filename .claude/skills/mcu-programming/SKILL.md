---
name: mcu-programming
description: Build, flash, and monitor microcontrollers — ESP32 via arduino-cli, STM32 via STM32CubeMX + Make. Use when user says "flash esp32", "upload firmware", "compile mcu", "stm32 build", "st-flash", "arduino-cli", or mentions a microcontroller + compile/upload/monitor action.
allowed-tools: Bash(arduino-cli *), Bash(make *), Bash(cmake *), Bash(st-flash *), Bash(st-info *), Bash(openocd *), Bash(arm-none-eabi-* *), Bash(ls *), Bash(cat *), Bash(command *)
---

# MCU Programming — ESP32 (arduino-cli) & STM32 (CubeMX + Make)

**Requires Linux (Ubuntu 22.04+).** Paths (`/dev/ttyUSB*`, `/dev/ttyACM*`), `udev` rules for stlink, and the toolchain install hints are Linux-only. No Windows / macOS support tested. Both flows assume the target board is physically connected via USB.

## Prereq check (run first)

```bash
command -v arduino-cli >/dev/null 2>&1 && arduino-cli version || echo "arduino-cli MISSING"
command -v arm-none-eabi-gcc >/dev/null 2>&1 && arm-none-eabi-gcc --version | head -1 || echo "arm-none-eabi-gcc MISSING"
command -v st-flash >/dev/null 2>&1 && st-flash --version || echo "st-flash MISSING"
command -v openocd >/dev/null 2>&1 && openocd --version 2>&1 | head -1 || echo "openocd MISSING"
ls /dev/ttyUSB* /dev/ttyACM* 2>/dev/null || echo "no serial devices detected"
```

Install hints when missing (don't run unasked):
```
sudo apt install gcc-arm-none-eabi stlink-tools openocd
# arduino-cli: curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | sh
```

Serial device permission: if `/dev/ttyUSB*` exists but upload fails with permission denied, tell user:
```
sudo usermod -aG dialout $USER && newgrp dialout
```

---

## ESP32 via arduino-cli

### One-time: install ESP32 core

```bash
arduino-cli core update-index
arduino-cli core install esp32:esp32
arduino-cli board listall esp32:esp32 | head -20   # see available FQBNs
```

Common FQBNs:
- `esp32:esp32:esp32` — generic ESP32 devkit
- `esp32:esp32:esp32s3` — ESP32-S3
- `esp32:esp32:esp32c3` — ESP32-C3

### Identify the board & port

```bash
arduino-cli board list
```

Returns something like `/dev/ttyUSB0  serial  esp32:esp32:esp32`.

### Compile + upload

```bash
# Compile
arduino-cli compile -b esp32:esp32:esp32 <sketch-dir>

# Upload (combine with compile via --upload)
arduino-cli compile --upload -b esp32:esp32:esp32 -p /dev/ttyUSB0 <sketch-dir>
```

If upload stalls on ESP32 boards without auto-reset, user must hold BOOT button during the "Connecting..." phase.

### Monitor serial

```bash
arduino-cli monitor -p /dev/ttyUSB0 -c baudrate=115200
```

Exit with Ctrl-C.

---

## STM32 via STM32CubeMX + Make

Assumes user generated a Makefile project from STM32CubeMX (**Project Manager → Toolchain/IDE: `Makefile`**). The skill does not create CubeMX projects; that's a GUI step.

### Build

```bash
cd <project-root>
make -j"$(nproc)"
```

Artifacts in `build/`:
- `<project>.elf` — debug symbols, use with OpenOCD / gdb
- `<project>.bin` — raw binary, flash to address
- `<project>.hex` — Intel HEX

### Identify target chip

```bash
st-info --probe
```

Note the `chipid` / `descr` — that tells you which OpenOCD config to use (e.g. `target/stm32f4x.cfg`, `target/stm32g0x.cfg`).

### Flash with st-flash (fastest)

```bash
st-flash --reset write build/<project>.bin 0x8000000
```

`0x8000000` is the standard STM32 flash origin. **Confirm with user before writing** — wrong address bricks the bootloader region.

### Flash with OpenOCD (fallback when st-flash fails or for multi-target boards)

```bash
openocd -f interface/stlink.cfg -f target/stm32f4x.cfg \
  -c "program build/<project>.elf verify reset exit"
```

Swap `stm32f4x.cfg` for the actual chip family (`stm32g0x.cfg`, `stm32l4x.cfg`, etc.).

### Monitor (STM32 typically uses USB-CDC or UART breakout)

Use the `comms-debug` skill — UART section — with `/dev/ttyACM0` or `/dev/ttyUSB0` at the project's baud rate (usually 115200).

---

## Pitfalls

- **ESP32-S3 / C3 not recognized**: install the right core target (`esp32:esp32:esp32s3`), not the generic `esp32`.
- **STM32 wrong target cfg**: families are not interchangeable. `st-info --probe` first.
- **Write to `0x0`**: NEVER flash `.bin` to address 0. Always use `0x8000000` for STM32 internal flash (or what CubeMX set in the linker script for your chip).
- **Board reset after upload**: st-flash `--reset` argument matters; without it the board stays halted.
- **Serial monitor locking the port**: only one program can own `/dev/ttyUSB0` at a time — close monitor before flashing, then reopen.

---

## Execution strategy

1. Ask the user: **which board** (ESP32 variant / STM32 chip family) and **which /dev/tty**? Don't guess.
2. Run prereq check + `arduino-cli board list` / `st-info --probe` to confirm detection.
3. For flash commands that write to low addresses (0x8000000 for STM32, boot partition for ESP32), **echo the exact command and wait for user confirmation** before executing.
4. Keep build output unless user asks to clean (`rm -rf build/` for STM32, `arduino-cli cache clean` for Arduino).

---

## Reporting

After build: binary size (`ls -la build/*.bin` or compile output `RAM/FLASH` summary).
After flash: verify status, flash time, chip ID.
On failure: tell the user exactly which step failed and paste the last 20 lines of the tool's stderr. Suggest the next diagnostic (re-probe, reset loop, check boot pin).

---

## Trouble

- **`libusb: error -3`** (st-flash) — user needs udev rules for ST-Link: `/etc/udev/rules.d/49-stlink.rules` from stlink-tools package
- **arduino-cli `esptool.py: timed out waiting for packet header`** — hold BOOT button, or try `--upload-speed 115200`
- **OpenOCD `Error: couldn't bind to socket`** — another gdbserver is already bound; `pkill openocd`
- **`make` fails with `arm-none-eabi-gcc: command not found`** after install — PATH issue, verify `/usr/bin/arm-none-eabi-gcc` exists
