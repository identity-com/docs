---
sidebar_position: 2
---

# Project Setup

## Prerequisites

[Rust](https://www.rust-lang.org/tools/install) version 1.59.0 or newer

[Solana](https://docs.solana.com/cli/install-solana-cli-tools)

The following file needs to be in your project's top-level directory, as it will keep Rust up to date with the most recent version.

rust-toolchain.toml:

```toml
[toolchain]
channel = "nightly-2022-03-22"
components = ["rustfmt", "clippy"]
profile = "minimal"
```

## Integrating Cruiser

Add [Cruiser](https://crates.io/crates/cruiser) to your Solana project by adding the following to your Cargo.toml file:

```toml
[features]
default = ["entrypoint"]
entrypoint = ["processor"]
processor = []
cpi = []
client = ["cruiser/client", "cpi"]

[dependencies]
cruiser = "0.2.0"
```

### Optional cruiser features

- `spl-token`: Enables spl token support
- `small_vec`: Adds small vectors (smaller than 32 bit length)
- `in_place`: `>=0.3.0`, Adds support for in-place data

`src/lib.rs`:

```rust
use cruiser::prelude::*;

/// This is the list of instructions for your program, we will add more later.
/// 
/// The [`InstructionList`] trait defines a list of program instructons. It takes an additional attribute to define which list of accounts corisponds to this list and what type of account info it will use. In this case we use a generic account info to support many cases. This derive also implements [`InstructionListItem`] for each item in the list and [`InstructionListProcessor`]. All these trait can be manually implemented if you need custom logic.
#[derive(InstructionList, Copy, Clone)] 
#[instruction_list(
    account_list = TutorialAccounts,
    account_info = [<'a, AI> AI where AI: ToSolanaAccountInfo<'a>],
)]
pub enum TutorialInstructions {}

/// This is the list of accounts used by your program, we will add them later.
///
/// The [`AccountList`] trait defines a list of accounts for use by a program. It is used to make sure no two accounts have the same discriminants.
#[derive(AccountList)]
pub enum TutorialAccounts{}
```
