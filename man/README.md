# Datasheets / Manuals

Drop hardware / sensor / MCU / actuator datasheets and vendor manuals here (PDF, txt, HTML — whatever the vendor ships).

## Consumed by

- `hardware-engineer` — before touching a bus, flashing firmware, or enabling an actuator interface
- `sensing-engineer` — before configuring driver params, tf, or calibration
- `tuning-engineer` — before applying param values that might fall outside HW / SW / FW limits

## Conventions

- Filename: include vendor + model + revision when possible, e.g. `velodyne_vlp32_r2_user_manual.pdf`
- Subdirectories OK — group by subsystem (`man/lidar/`, `man/imu/`, `man/actuator/`, etc.) if the pile grows.

## Gitignore

Contents of this directory are **gitignored** (see `.gitignore`) because datasheets are large per-user binaries that don't belong in the template. Only this `README.md` is tracked. Template users supply their own.
