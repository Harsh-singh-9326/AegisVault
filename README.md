# AegisVault

A focused first milestone for an independently implemented enterprise VM backup platform. The initial runtime is a TypeScript/Node modular monolith, deliberately operating in user space and runnable without a hypervisor.

## Quick start

Requirements: Node.js 20+ and the TypeScript compiler (`tsc`) available on `PATH` (or install TypeScript as a development dependency). No database, libvirt daemon, kernel module, or cloud service is required.

```sh
npm run build
npm test
npm run smoke
```

`smoke` creates `.aegisvault/fixture`, registers a deterministic fixture backup, encrypts its files into a content-addressed repository, writes atomic JSON metadata, lists a recovery point, and verifies checksums after AES-256-GCM decryption. `npm start` runs the management server (default port 8080); set `PORT`, `AEGIS_ROOT`, and `AEGIS_SECRET` as needed.

## Management API

The server has no external dependencies and accepts/returns JSON:

* `GET /health` and `GET /status` — service, registered agents, and filesystem state.
* `POST /agents/register` and `POST /agents/:id/heartbeat` — registration and liveness updates.
* `GET /partitions` — local filesystem capacity/availability from Node `statfs`.
* `GET /logs` — durable structured audit records (`timestamp`, `severity`, `component`, `event`, `details`).
* `GET /recovery-points`, `POST /recovery-points/:id/verify` — inventory and integrity verification.
* `POST /backups` — deterministic fixture backup through `BackupService`.
* `POST /recovery-points/:id/restore` with `{"destination":"..."}` — verified fixture restore only.

Restore destinations must be beneath `.aegisvault/restores` (or the configured data root's `restores` directory), must differ from the fixture source, and files are created without overwriting existing files.

## Deployment and semantics

Run `npm run server` or `npm start`; this is a single-process deployment with atomic JSON state in `control.json` and existing metadata JSON. A filesystem is `online` when `statfs` succeeds; an unavailable path is reported `online: false` with a structured error. Request failures and agent events are audit entries with severity and component. There is no authentication or authorization yet, so bind and protect the process at the deployment boundary.

## Architecture

* `BackupService` owns the bounded workflow: register job → run → recovery point → verify.
* `MetadataRepository` stores jobs and recovery points in one JSON file, using same-directory temporary files and rename for atomic replacement.
* `ContentAddressedRepository` stores encrypted objects under `repository/objects/<sha256>` and naturally deduplicates identical ciphertext.
* `crypto.ts` provides SHA-256 checksums and AES-256-GCM encryption/authentication. The secret is hashed to a 256-bit key for this fixture milestone.
* `jobs.ts` enforces explicit `registered → running → completed|failed` transitions (failed jobs may be retried).
* `LibvirtAdapter` is the integration seam. `NotConfiguredLibvirtAdapter` fails explicitly so fixture behavior cannot be mistaken for live VM behavior.
* `server/management.ts` contains the dependency-free management HTTP surface; `agent/service.ts` reports local filesystems and invokes fixture backup.

The code is intentionally a modular monolith: modules have clear boundaries, while deployment remains one process. Repository abstractions can later be replaced by a hardened metadata store or remote object store without changing the backup workflow.

## Requirements matrix

| Capability | Milestone status | Evidence / boundary |
|---|---|---|
| Register a backup job | Implemented | `BackupService.register` |
| Deterministic local fixture backup | Implemented | `npm run smoke`, node test |
| Durable metadata | Implemented | Atomic JSON repository |
| Content-addressed encrypted objects | Implemented | SHA-256 object IDs + AES-256-GCM |
| Recovery point listing | Implemented | `points()` and REST GET |
| Integrity verification | Implemented | Auth tag + ciphertext/plaintext checksums |
| KVM/libvirt adapter boundary | Explicitly not configured | Interface plus fail-fast implementation |
| Live VM snapshot/backup | Unimplemented | No libvirt connection or snapshot code yet |
| Fixture restore | Implemented with explicit alternate-root restriction | Verified fixture recovery only; no arbitrary overwrite |
| Multi-tenant auth, RBAC, quotas | Unimplemented | Management API is an internal scaffold |
| Encryption key management / rotation | Unimplemented | Secret-derived key is fixture-grade |
| Kernel driver | Not needed | No custom kernel driver is included |

## Claims and limitations

This slice proves durable local fixture capture, integrity verification, and bounded fixture recovery, not live VM partitions or production restore. It does not provide crash consistency with a running guest, incremental chains, compression, remote replication, retention policy, authentication, authorization, key management, metrics, or production deployment hardening. The JSON files are suitable for a single-process scaffold, not concurrent multi-node writers. No kernel driver or unsafe arbitrary shell execution is used.
