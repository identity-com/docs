---
sidebar_position: 1
---

# Solana Basics

[Solana](https://solana.com) is a scalable blockchain built for high speed and throughput. Programs uploaded to Solana allow for trustless code execution.

## How Solana stores its data

Accounts are addressed by publickeys and each stores multiple pieces of data, relevant to us is they store SOL in the form of lamports (billionths of SOL) and program data.

## What a program can do

A Solana program is allowed to execute arbitrary code within limitiaions.

### Broad program limitations

Limitations on a program as a whole.

#### Compute Limit

Programs are limited to a cap of 200k compute units per instruction. This will change to 1.4m per transaction once feature `5ekBxc8itEnPv4NzGJtr8BVVQLNMQuLMNQQj7pHoLNZ9` is activated. This feature is currently active on devnet.

#### Transaction Size

Programs are limited in the size of transaction that can be executed. This will be increased with 1.10 and QUIC.

#### All accounts must be passed in

All accounts a program interacts with (read or write) must be passed in as arguments to the transaction.

### Limitations of what a program can do to an account

An account
