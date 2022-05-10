# Sample Escrow Program

In this example of Cruiser's functionality we will walk through an example escrow program.

All the code for this project can be found here: [Cruiser -> Escrow](https://github.com/identity-com/cruiser/tree/master/escrow_example)

## What is an Escrow program?

Escrow is used in a variety of situations, but most commonly in financial transactions where the two parties performing the transaction want a trusted third party to hold the agreed-upon money until the terms of the transaction are fulfilled. This is to prevent one party from cheating the other out of either money, goods, or services.

```rust
// The list of account types the program uses
use cruiser::account_list::AccountList;
// Handles Serialization and Deserialization
use cruiser::borsh::{BorshDeserialize, BorshSerialize};
// The list of instruction that the program has
use cruiser::instruction_list::InstructionList;
// A helper trait that tells you the size of the account data on-chain
use cruiser::on_chain_size::{OnChainSize, OnChainStaticSize};
// Handles the type-safe pda seeding
use cruiser::pda_seeds::{PDASeed, PDASeeder};
use cruiser::{borsh, Pubkey};
```

```rust
#[derive(InstructionList, Copy, Clone)]
#[instruction_list(account_list = EscrowAccounts, account_info = [<'a, AI> AI where AI: cruiser::ToSolanaAccountInfo<'a>])]
```

```rust
// This is the list of escrow instructions

pub enum EscrowInstructions {
    #[instruction(instruction_type = instructions::init_escrow::InitEscrow)]
    InitEscrow,
    #[instruction(instruction_type = instructions::exchange::Exchange)]
    Exchange,
}
```

```rust
// The list of escrow accounts

#[derive(AccountList)] // Runs implements standard arguments for AccountList (from Cruiser) 
pub enum EscrowAccounts {
    EscrowAccount(EscrowAccount),
}
```

```rust
// This is the format of an escrow account

#[derive(BorshSerialize, BorshDeserialize, Default)] // BorshSerialize and BorshDeserialize are from Cruiser and handle serialization and deserialization of data for you
pub struct EscrowAccount {
    pub initializer: Pubkey,
    pub temp_token_account: Pubkey,
    pub initializer_token_to_receive: Pubkey,
    pub expected_amount: u64,
}
```

```rust
// Implementing OnChainSize for EscrowAccount

impl OnChainSize<()> for EscrowAccount {
    fn on_chain_max_size(_arg: ()) -> usize {
        Pubkey::on_chain_static_size() * 3 + u64::on_chain_static_size()
    }
}
```

```rust
// Implementing the PDASeeder for EscrowPDASeeder

#[derive(Debug)]
struct EscrowPDASeeder;
impl PDASeeder for EscrowPDASeeder {
    fn seeds<'a>(&'a self) -> Box<dyn Iterator<Item = &'a dyn PDASeed> + 'a> {
        Box::new([&"escrow" as &dyn PDASeed].into_iter())
    }
}
```
