---
sidebar_position: 1
---

# Create Profile

First we will make the `create_profile` instruction. The purpose of this instruction is simply to make a `PlayerProfile` account.

## Definition

Here's the definition:

```rust
use crate::{PlayerProfile, TutorialAccounts};
use cruiser::prelude::*;

/// Creates a new player profile.
#[derive(Debug)]
pub enum CreateProfile {}

impl<AI> Instruction<AI> for CreateProfile {
    type Accounts = CreateProfileAccounts<AI>;
    type Data = CreateProfileData;
    type ReturnType = ();
}

/// Accounts for [`CreateProfile`]
#[derive(AccountArgument, Debug)]
#[account_argument(account_info = AI, generics = [where AI: AccountInfo])]
#[validate(generics = [<'a> where AI: ToSolanaAccountInfo<'a>])]
pub struct CreateProfileAccounts<AI> {
    /// The authority for the new profile.
    #[validate(signer)]
    pub authority: AI,
    /// The new profile to create
    #[from(data = PlayerProfile::new(authority.key()))] // This is where we set the initial value
    #[validate(data = InitArgs{
        system_program: &self.system_program,
        space: InitStaticSized,
        funder: &self.funder,
        funder_seeds: None,
        account_seeds: None,
        rent: None,
        cpi: CPIChecked,
    })]
    pub profile: InitAccount<AI, TutorialAccounts, PlayerProfile>,
    /// The funder for the new account. Needed if the account is not zeroed.
    #[validate(signer, writable)]
    pub funder: AI,
    /// The system program. Needed if the account is not zeroed.
    pub system_program: SystemProgram<AI>,
}

/// Data for [`CreateProfile`]
#[derive(Clone, Debug, BorshSerialize, BorshDeserialize)]
pub struct CreateProfileData {}
```

Let's break this down.

```rust
/// Creates a new player profile.
#[derive(Debug)]
pub enum CreateProfile {}
```

Here we create a type to represent the instruction. Instructions in cruiser are a bunch of static functions so we use an un-buildable enum. It would also be valid to use any other type as `self` is never referenced for the instruction. Unit structs (`pub struct CreateProfile;`) are also common.

```rust
/// Accounts for [`CreateProfile`]
#[derive(AccountArgument, Debug)]
#[account_argument(account_info = AI, generics = [where AI: AccountInfo])]
#[validate(generics = [<'a> where AI: ToSolanaAccountInfo<'a>])] // <- Validate generic usage
pub struct CreateProfileAccounts<AI> {
```

Here we see a usage of generics in our validation logic. The `ToSolanaAccountInfo` trait is used to convert an account info into the solana version for CPI calling. We don't need it for the rest of the instruction so we minimize our requirements by putting it in the `validate` attribute. It would also be valid to put it on the `account_argument` attribute because it's a parent to `validate` but would bubble up to other places.

```rust
/// The authority for the new profile.
#[validate(signer)]
authority: AI,
```

We require the authority for the profile to sign the creation.

```rust
/// The new profile to create
#[from(data = PlayerProfile::new(authority.key()))] // This is where we set the initial value
#[validate(data = InitArgs{
    system_program: &self.system_program,
    space: InitStaticSized,
    funder: &self.funder,
    funder_seeds: None,
    account_seeds: None,
    rent: None,
    cpi: CPIChecked,
})]
pub profile: InitAccount<AI, TutorialAccounts, PlayerProfile>,
```

Here is most of the logic for this instruction. The first thing to look at is the type `InitAccount`. This is an account that initializes a new account from a system (empty) account. 

Next we look at the `from` attribute. Here we see that the data is the initial data for the new account. `FromAccounts<()>` is also implemented for this type where the data has a `Default` implementation.

Then we look at the `validate` attribute. Here we see that the data used is a struct called `InitArgs`. In reallity there are many generics on this struct but those are hidden because of struct initialization. Here are the values:

| field            | type                                                 | description                                                                                        |
|------------------|------------------------------------------------------|----------------------------------------------------------------------------------------------------|
| `system_program` | `&SystemProgram<AI>`                                 | The system program                                                                                 |
| `space`          | `usize` or `InitStaticSized` or `InitSizeWithArg<A>` | The space to give the new account. `usize` lets you set it yourself while the others calculate it. |
| `funder`         | `&AI`                                                | The account that will supply the funds for the rent of the new account                             |
| `funder_seeds`   | `Option<&PDASeedSet>`                                | The seeds for the funder account. Should only be set if the funder is a PDA.                       |
| `account_seeds`  | `Option<&PDASeedSet>`                                | The seeds for the new account. Should only be set if the new account is a PDA.                     |
| `rent`           | `Option<Rent>`                                       | The object to calculate the rent for the new account. If `None` will use `Rent::get` syscall       |
| `cpi`            | `impl CPIMethod`                                     | The `CPIMethod` to use for the `create_account` CPI                                                |

The `CPIMethod` allows you to pick whether to do checked CPI or unchecked CPI. Unchecked CPI is faster but does not guarantee all the accounts aren't borrowed when they could be changed.

```rust
/// The funder for the new account. Needed if the account is not zeroed.
#[validate(signer, writable)]
pub funder: AI,
```

This is the funder, the `signer` and `writable` checks are technically redundant because they are checked by the CPI call but they help latter us know what the requirements are.

```rust
/// The system program. Needed if the account is not zeroed.
pub system_program: SystemProgram<AI>,
```

This is the system program that we will CPI into. The `SystemProgram` type makes sure the account is the correct key.

```rust
/// Data for [`CreateProfile`]
#[derive(Clone, Debug, BorshSerialize, BorshDeserialize)]
pub struct CreateProfileData {}
```

Finally, we have the data. in this case we don't need any so we use an empty struct. It would be just as valid to use the unit type `()` as the data type instead.

## Processor

Next we'll add the instruction processing code. It's very simple in this case but there's some good parts to explain. This will be added to the end of the same file:

```rust
#[cfg(feature = "processor")] // Disables compiling this code for integrators that just want to CPI.
mod processor {
    use super::*;

    impl<'a, AI> InstructionProcessor<AI, CreateProfile> for CreateProfile
    where
        AI: ToSolanaAccountInfo<'a>,
    {
        type FromAccountsData = ();
        type ValidateData = ();
        type InstructionData = ();

        fn data_to_instruction_arg(
            _data: <CreateProfile as Instruction<AI>>::Data,
        ) -> CruiserResult<(
            Self::FromAccountsData,
            Self::ValidateData,
            Self::InstructionData,
        )> {
            // This converts the data into the 3 types that are needed for the instruction.
            Ok(((), (), ()))
        }

        fn process(
            _program_id: &Pubkey,
            _data: Self::InstructionData,
            _accounts: &mut <CreateProfile as Instruction<AI>>::Accounts,
        ) -> CruiserResult<<CreateProfile as Instruction<AI>>::ReturnType> {
            // We don't need any processing here, all initialization is handled in the accounts.
            // You could do some data setting here but we handled that with the profile init.
            Ok(())
        }
    }
}
```

Most of this is explained in comments so we will only go over the trait itself.

```rust
impl<'a, AI> InstructionProcessor<AI, CreateProfile> for CreateProfile
```

We can implement `InstructionProcessor` for arbitrary types. This allows others to use the same instruction and implement their own processor. It also allows publishing of the instruction definitions separately from the processing. By convention we implement `InstructionProcessor` for the instruction type itself.

```rust
type FromAccountsData = ();
type ValidateData = ();
type InstructionData = ();

fn data_to_instruction_arg(
    _data: <CreateProfile as Instruction<AI>>::Data,
) -> CruiserResult<(
    Self::FromAccountsData,
    Self::ValidateData,
    Self::InstructionData,
)> {
    Ok(((), (), ()))
}
```

This is where we split the instruction data that comes in. `FromAccountsData` is passed to the `FromAccounts` implementation, `ValidateData` is passed to the `ValidateArgument` implementation, and `InstructionData` is passed to the `process` function. Since we don't have any data theses are all `()`.
