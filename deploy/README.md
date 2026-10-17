# AegisVault deployment

This Docker image runs the current single-process management server and its local fixture agent. It persists control metadata, encrypted repository objects, and recovery data in `/var/lib/aegisvault`.

Build and run from the repository root:

```sh
docker build -f deploy/Dockerfile -t aegisvault:dev .
docker run --rm -p 8080:8080 -v aegisvault-data:/var/lib/aegisvault aegisvault:dev
```

The image does **not** provide live KVM/libvirt access, privileged host partition access, authentication, or production key management. Do not mount host disks or expose the management port publicly until those controls are implemented. Use `/health`, `/status`, and `/logs` for the current operational smoke checks.
