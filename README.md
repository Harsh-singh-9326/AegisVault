# AegisVault

A focused first milestone for an independently implemented enterprise VM backup platform. The initial runtime is a TypeScript/Node modular monolith, deliberately operating in user space and runnable without a hypervisor.

## Quick start

Requirements: Node.js 20+ and the TypeScript compiler (`tsc`) available on `PATH` (or install TypeScript as a development dependency). No database, libvirt daemon, kernel module, or cloud service is required.

```sh
npm run build
npm test
npm run smoke
```

`smoke` creates `.aegisvault/fixture`, registers a deterministic fixture backup, encrypts its files into a content-addressed repository, writes atomic JSON metadata, lists a recovery point, and verifies checksums after AES-256-GCM decryption. Set `AEGIS_ROOT` and `AEGIS_SECRET` for a different data root and key derivation secret.

## Architecture

* `BackupService` owns the bounded workflow: register job → run → recovery point → verify.
* `MetadataRepository` stores jobs and recovery points in one JSON file, using same-directory temporary files and rename for atomic replacement.
* `ContentAddressedRepository` stores encrypted objects under `repository/objects/<sha256>` and naturally deduplicates identical ciphertext.
* `crypto.ts` provides SHA-256 checksums and AES-256-GCM encryption/authentication. The secret is hashed to a 256-bit key for this fixture milestone.
* `jobs.ts` enforces explicit `registered → running → completed|failed` transitions (failed jobs may be retried).
* `LibvirtAdapter` is the integration seam. `NotConfiguredLibvirtAdapter` fails explicitly so fixture behavior cannot be mistaken for live VM behavior.
* `api.ts` contains a small HTTP surface (`GET /recovery-points`, `POST /recovery-points/:id/verify`) for embedding in a management process.

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
| Restore orchestration | Unimplemented | Verification only; no restore claim |
| Multi-tenant auth, RBAC, quotas | Unimplemented | Management API is an internal scaffold |
| Encryption key management / rotation | Unimplemented | Secret-derived key is fixture-grade |
| Kernel driver | Not needed | No custom kernel driver is included |

## Claims and limitations

This slice proves durable local fixture capture and integrity verification, not live VM backup or restore. It does not provide crash consistency with a running guest, incremental chains, compression, remote replication, retention policy, authentication, authorization, key management, metrics, or production deployment hardening. The JSON metadata file is suitable for a single-process scaffold, not concurrent multi-node writers. The REST helper is intentionally small and is not started by the CLI yet.
