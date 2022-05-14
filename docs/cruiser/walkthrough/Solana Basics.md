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

An account has the following rules, even the system program follows these:

* Lamports may not be created or destroyed on instruction check (before CPI or end of instruction)
* Lamports may only be subtracted from accounts owned by the program
* Data size may only be changed by the system program (by the owning program once feature `75m6ysz33AfLA5DDEzWM1obBrnPQRSsdVQ2nRmc8Vuu1` is activated, active on devnet)
* Data size cannot be changed once set except by account wipe if no rent (disabled with feature `75m6ysz33AfLA5DDEzWM1obBrnPQRSsdVQ2nRmc8Vuu1`, active on devnet)
* Data can only be changed by owner program
* Data can be wiped by giving the account `0` rent (end of transaction, not instruction)
* Owner can only be changed by owner program
* All data must be zeroed to have owner changed
