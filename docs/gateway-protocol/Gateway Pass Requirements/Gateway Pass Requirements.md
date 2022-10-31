---
sidebar_position: 6
---

# Gateway Pass requirements

## Requirements for dApps using Gateway Passes

A dApp that uses Gateway Passes for KYC is required to:

1. Select the Gateway Network that satisfies their requirements.
1. Integrate the Gateway Library Code associated with the Gateway Network.
1. Use Pass operations tracked by usage data.

## Requirements for Gatekeepers

Gatekeepers are required to meet the following standards:

1. Issue Gateway Passes for user’s that fulfill the requirements (e.g. KYC standards) of the network.
1. Revoke Gateway Passes for bad actors.
1. Fulfill service connectivity requirements for the network.
1. Maintain a sufficient stake of governance tokens for expected throughput.

## Requirements for Guardians

Guardians are responsible for fulfilling the following duties:

1. Regularly audit the Gatekeepers’ off-chain verification and evidence data.
1. Reduce governance token stake of Gatekeepers for poor performance, e.g. not meeting uptime requirements, wrong verifications, intentional malicious behavior, etc.
1. Remove Gatekeepers that continue to fall below requirements, or that act maliciously.
1. Support governance token utilization.
1. Audit Gatekeeper applicants for possible acceptance into the Gatekeeper Networks.
