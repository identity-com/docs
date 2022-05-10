---
sidebar_position: 2
---

# Project Setup

## Prerequisites

First we need to ensure we have the needed prerequisites installed.

### Rust

[Install Rust](https://www.rust-lang.org/tools/install).

### Solana

[Install Solana](https://docs.solana.com/cli/install-solana-cli-tools). Cruiser currently only supports rust `1.59` which exists on solana versions `>=1.9.17`.

## Project Initialization

Now we'll set up our first cruiser project. We'll start by running `cargo init cruiser_tutorial --lib` to create and init a new folder for our project. 
This comes with a few default files, some of which we'll overwrite. Eventually our project structure will look like this. The `*` marks files that we end up with after this step.

```
cruiser_tutorial
*|- src
 | |- accounts           // Accounts used by your program and their impls
 | | |- mod.rs
 | | |- account1.rs
 | | |- account2.rs
 | | |- ...
 | |- arguments          // `AccountArgument`s used by your program
 | | |- mod.rs
 | | |- argument1.rs
 | | |- argument2.rs
 | | |- ...
 | |- instructions       // `Instruction`s used by your program
 | | |- mod.rs
 | | |- instruction1.rs
 | | |- instruction2.rs
 | | |- ...
*| |- lib.rs             // Your program's main file
 | |- pda.rs             // Your program's PDAs
 |- tests
 | |- all_tests.rs       // Tests for your program
 | |- instructions
 | | |- mod.rs
 | | |- test_instruction1.rs
 | | |- test_instruction2.rs
 | | |- ...
*|- Cargo.toml
*|- Cargo.lock
*|- rust-toolchain.toml
```

### `rust-toolchain.toml`

We need to add `rust-toolchain.toml`, as it will keep Rust relatively in-line with the current solana version.

```toml
[toolchain]
channel = "nightly-2022-03-22"
components = ["rustfmt", "clippy"]
profile = "minimal"
```

### `Cargo.toml`

The `Cargo.toml` file will add features and the `cruiser` dependency.

```toml
[package]
name = "tutorial_program"
version = "0.0.0"
edition = "2021"

# This makes solana realize this is a program
[lib]
crate-type = ["cdylib", "lib"]

[features]
# The default is building the program for deployment, you can change this if you want
default = ["entrypoint"]
# This gates the entrypoint macro
entrypoint = ["processor"]
# This gates the processor functions on the program
processor = []
# This gates CPI helper functions
cpi = []
# This gates client functions
client = ["cruiser/client", "cpi"]

[dependencies]
# This tutorial targets the unrealeased version 0.3.0 of cruiser. This will eventually be released.
cruiser = { git = "https://github.com/identity-com/cruiser.git", branch = "release/0.3.0" }

[dev-dependencies]
cruiser = { git = "https://github.com/identity-com/cruiser.git", branch = "release/0.3.0", features = ["client"] }
reqwest = "0.11.10"
futures = "0.3.21"
tokio = { version = "1.17.0", features = ["full"] }
```

#### Optional cruiser features

These features can be added if you need further functionality.

- `spl-token`: Enables spl token support
- `small_vec`: Adds small vectors (smaller than 32 bit length)
- `in_place`: `>=0.3.0`, Adds support for in-place data

### `src/lib.rs`

Our initial file. This is the barest definition of a cruiser program, no instructions or accounts.

```rust
// Modules will be added here when we add those files

use cruiser::prelude::*;

// This uses your instruction list as the entrypoint to the program. 
#[cfg(feature = "entrypoint")]
entrypoint_list!(TutorialInstructions, TutorialInstructions);

/// This is the list of instructions for your program, we will add more later.
/// 
/// The [`InstructionList`] trait defines a list of program instructions. 
/// It takes an additional attribute to define which list of accounts 
/// corresponds to this list and what type of account info it will use. 
/// In this case we use a generic account info to support many cases. 
/// This derive also implements [`InstructionListItem`] for each item 
/// in the list and [`InstructionListProcessor`]. 
/// All these traits can be manually implemented if you need custom logic.
#[derive(Debug, InstructionList, Copy, Clone)] 
#[instruction_list(
    account_list = TutorialAccounts,
    account_info = [<'a, AI> AI where AI: ToSolanaAccountInfo<'a>],
)]
pub enum TutorialInstructions {}

/// This is the list of accounts used by your program, we will add them later.
///
/// The [`AccountList`] trait defines a list of accounts for use by a program. 
/// It is used to make sure no two accounts have the same discriminants.
/// This derive also implements [`AccountListItem`]. 
/// Both these traits can be manually implemented if you need custom logic.
#[derive(Debug, AccountList)]
pub enum TutorialAccounts {}
```

## Suggested Lints

These are lints that are suggested to be added at the top of `src/lib.rs`. They are not required, but help make readable and better code.

```rust
#![warn(
    unused_import_braces,           // This will be caught by rustfmt as well

    missing_docs,                   // Ensures all public items are documented

    missing_debug_implementations,  // Makes sure all public items have a debug implementation

    unused_qualifications,          // This cleans up your code when there are unnecessary qualifiers

    clippy::pedantic                // This can be aggressive but catches a lot of common mistakes. 
                                    // A bunch don't matter or aren't applicable so can be disabled 
                                    // either on a case-by-case basis or by disabling the lint with 
                                    // an allow
)]
```

## Next Steps

Next up we'll set up an account for the program to use.
