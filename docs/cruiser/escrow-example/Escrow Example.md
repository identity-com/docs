# Sample Escrow Program

In this example of Cruiser's functionality we will walk through an example escrow program. This is a recreation of the [PaulX escrow tutorial](https://paulx.dev/blog/2021/01/14/programming-on-solana-an-introduction/) and all the code for this project can be found here: [Cruiser -> Escrow](https://github.com/identity-com/cruiser/tree/master/escrow_example)

## What is an Escrow program?

Escrow is used in a variety of situations, but most commonly in financial transactions where the two parties performing the transaction want a trusted third party to hold the agreed-upon money until the terms of the transaction are fulfilled. This is to prevent one party from cheating the other out of either money, goods, or services.

Let's look at an example of this put together with the Cruiser framework.

```rust
// This is the list of escrow instructions

#[derive(InstructionList, Copy, Clone)]
#[instruction_list(account_list = EscrowAccounts, account_info = [<'a, AI> AI where AI: cruiser::ToSolanaAccountInfo<'a>])]

pub enum EscrowInstructions {
    #[instruction(instruction_type = instructions::init_escrow::InitEscrow)]
    InitEscrow,
    #[instruction(instruction_type = instructions::exchange::Exchange)]
    Exchange,
}
```

```rust
// The list of escrow accounts

#[derive(AccountList)]
pub enum EscrowAccounts {
    EscrowAccount(EscrowAccount),
}
```

```rust
// This is what an escrow account looks like using standard Borsh serialization

#[derive(BorshSerialize, BorshDeserialize, Default)]
pub struct EscrowAccount {
    pub initializer: Pubkey,
    pub temp_token_account: Pubkey,
    pub initializer_token_to_receive: Pubkey,
    pub expected_amount: u64,
}
```

```rust
// A helpful trait that keeps track of account size on chain

impl const OnChainSize for EscrowAccount {
    const ON_CHAIN_SIZE: usize = Pubkey::ON_CHAIN_SIZE * 3 + u64::ON_CHAIN_SIZE;
}
```

```rust
// This is type-safe PDA seeding that prevents you from mixing up seeds for PDAs

#[derive(Debug)]
struct EscrowPDASeeder;

impl PDASeeder for EscrowPDASeeder {
    fn seeds<'a>(&'a self) -> Box<dyn Iterator<Item = &'a dyn PDASeed> + 'a> {
        Box::new([&"escrow" as &dyn PDASeed].into_iter())
    }
}
```
