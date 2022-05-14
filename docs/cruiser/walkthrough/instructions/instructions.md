# Instructions

After designing how the data looks in our program we can spec out our instructions. We'll need _ instructions to do what we want to do, outlined here:

- Create Profile: Creates a new player profile.
- Create Game: Creates a new game.
- Join Game: Joins a proposed game.
- Forfeit Game: This will handle if your opponent doesn't respond in time.
- Make Move: This will handle making moves and winning.

I don't claim this is the best instruction design to use, but it should be enough to get you started.

## PDAs

Before we go further we will need to define our PDAs for the game signer that holds the wager. Add the following to `lib.rs`:

```rust
pub mod pda;
```

Then we can create the pda seeders

### `src/pda.rs`

```rust
//! PDAs for the program.

use cruiser::prelude::*;

/// The static seed for [`GameSignerSeeder`].
pub const GAME_SIGNER_SEED: &str = "game_signer";

/// The seeder for the game signer.
/// 
/// We use a seeder to create type safe PDA definitions that can't accidentally be switched around or mis-set.
#[derive(Debug, Clone)]
pub struct GameSignerSeeder {
    /// The game's key.
    pub game: Pubkey,
}
impl PDASeeder for GameSignerSeeder {
    fn seeds<'a>(&'a self) -> Box<dyn Iterator<Item = &'a dyn PDASeed> + 'a> {
        // We need to return a list of seeds. This means you can order your seeds however you want.
        // You can also use anything that implements `PDASeed` directly, even your own types.
        Box::new([&GAME_SIGNER_SEED as &dyn PDASeed, &self.game].into_iter())
    }
}
```

## `instructions` mod

Next we'll add in the `instructions` module. This requires we add the following to the top of `src/lib.rs`:

```rust 
pub mod instructions;
```

### `src/instructions/mod.rs`

Uncomment out the imports as we add the files.

```rust
//! Instructions for the program.

// mod create_profile;
// mod create_game;
// mod join_game;
// mod make_move;
// mod forfeit_game;
// 
// pub use create_profile::*;
// pub use create_game::*;
// pub use join_game::*;
// pub use make_move::*;
// pub use forfeit_game::*;
```

## Creating the instructions

Before we create the instructions we need to go over the anatomy of a cruiser instruction. An instruction is composed of 3 different type, the `Accounts`, `Data`, and `ReturnType`. These types are combined through the `Instruction` trait which is defined as: 

```rust
/// An instruction for a program with it's accounts and data.
pub trait Instruction<AI>: Sized {
    /// The account argument for this instruction.
    type Accounts;
    /// The instruction data minus the instruction discriminant.
    type Data;
    /// The return type of the instruction
    type ReturnType: ReturnValue;
}
```

This is usually implemented for unit structs (ie `struct Foo;`).

### Data

`Data` is the simplest, it's any type that implements `BorshDeserialize` and is the data that comes in from the instruction data of the transaction. 

### Return Type

`ReturnType` is a little more complex than `Data` by also requiring `BorshSerialize`. It's the returned data to the caller in the case of CPI. The data serialization and deserialization is handled by cruiser internally. `Accounts` is the most complicated.

### Accounts

`Accounts` requirement is the implementation of `AccountArgument`, `FromAccounts`, and `ValidateArgument`. The flow is as follows:

1. Instruction discriminant is deserialized (handled by the `InstructionList`).
2. `Instruction::Data` data is deserialized.
3. `InstructionProcessor::data_to_instruction_arg` is called to split the data to from, validate, and the instruction processor.
4. `FromAccounts` is called to build the account argument.
5. `ValidateArgument` is called to validate the account argument. This is a separate step because during `FromAccounts` the later accounts are not constructed and can't be referenced.
6. `InstructionProcessor::process` is called to do the actual action of the instruction.
7. `AccountArgument::write_back` is called to do any necessary cleanup.

## What the traits look like

### `AccountArgument`

`AccountArgument` is a parent trait defined like this:

```rust
/// An argument that can come from [`AccountInfo`](crate::AccountInfo)s and data using [`FromAccounts`].
/// Can be automatically derived.
pub trait AccountArgument: Sized {
    /// The account info type this deals with
    type AccountInfo;

    /// The final step in the instruction lifecycle, performing any cleanup operations or writes back.
    fn write_back(self, program_id: &Pubkey) -> CruiserResult<()>;
    /// Passes all the account keys to a given function.
    fn add_keys(&self, add: impl FnMut(Pubkey) -> CruiserResult<()>) -> CruiserResult<()>;
    /// Collects all the account keys into a [`Vec`].
    fn keys(&self) -> CruiserResult<Vec<Pubkey>> {
        let mut out = Vec::new();
        self.add_keys(|key| {
            out.push(key);
            Ok(())
        })?;
        Ok(out)
    }
}
```

`AccountInfo` is the account info type the argument will deal with. `write_back` handles clean-up at the end and is where any final operations will occur. `add_keys` is a helper function to collect all the keys in the type.

### `FromAccounts`

`FromAccounts` is a trait that is used to convert raw account infos into the type. It's defined like this:

```rust
/// Allows an account argument to be made from the account iterator and data `Arg`.
/// `AI` is the [`AccountInfo`](crate::AccountInfo) type.
/// This is the first step in the instruction lifecycle.
pub trait FromAccounts<Arg = ()>: Sized + AccountArgument {
    /// Creates this argument from an `AI` iterator and data `Arg`.
    /// - `program_id` is the current program's id.
    /// - `infos` is the iterator of `AI`s
    /// - `arg` is the data argument
    fn from_accounts(
        program_id: &Pubkey,
        infos: &mut impl AccountInfoIterator<Item = Self::AccountInfo>,
        arg: Arg,
    ) -> CruiserResult<Self>;

    /// A hint as to the number of accounts that this will use when [`FromAccounts::from_accounts`] is called.
    /// Returns `(lower_bound, upper_bound)` where `lower_bound` is the minimum and `upper_bound` is the maximum or [`None`] if there is no maximum.
    ///
    /// Should only be used as an optimization hint, not relied on.
    ///
    /// A default return of `(0, None)` is valid for all although may not be as accurate as possible.
    // TODO: Make this const once const trait functions are stabilized
    // TODO: Figure out how to make this derivable
    #[must_use]
    fn accounts_usage_hint(arg: &Arg) -> (usize, Option<usize>);
}

/// A globing trait for an account info iterator
pub trait AccountInfoIterator: Iterator + DoubleEndedIterator + FusedIterator {}
impl<T> AccountInfoIterator for T where T: Iterator + DoubleEndedIterator + FusedIterator {}
```

`FromAccounts` takes an `Arg` type parameter that defines what extra data is needed to help build the argument. This can also be implemented multiple times for the same type with different arg types. This allows a single type to perform many roles such as being able to init itself or run checks only on certain data.

### `ValidateArgument`

`ValidateArgument` is a trait that is used to validate the type while being able to reference all the other arguments in the struct because it happens after everything is built. It's defined like this:

```rust

/// Validates this argument using data `Arg`. The seconds step in the instruction lifecycle.
pub trait ValidateArgument<Arg = ()>: Sized + AccountArgument {
    /// Runs validation on this account with data `Arg`.
    ///
    /// Ordering for wrapping should be to call `validate` on the wrapped type first.
    fn validate(&mut self, program_id: &Pubkey, arg: Arg) -> CruiserResult<()>;
}
```

This has the same arg parameter as `FromAccounts` with the same advantages.

## Derivations

All these traits can be manually implemented without lost functionality but they are designed to be easy to automatically derive. In order to do this we can use the `AccountArgument` derive macro:

```rust
#[derive(AccountArgument)]
#[account_argument(account_info = AI, generics = [where AI: AccountInfo])]
pub struct MyArgument<AI>(pub AI);
```

This is the simplest form of derivation so let's break it down.

- `#[derive(AccountArgument)]`: This is the call to the derive macro.
- `#[account_argument()]`: This is a set of additional arguments for the macro.
- `account_info = AI`: This is how we tell the macro what AccountInfo type to use. If we wanted to don't have to use a generic and can instead select a specific account info type, but this limits us when building clients and integrating with other frameworks.
- `generics = [where AI: AccountInfo]`: This section allows us to add additional generic requirements to the derivation of `AccountArgument` and all sub-traits. The reason it's wrapped in brackets is to help with token differentiation. If we want to add additional generics (such as for `ToSolanaAccountInfo`) we can do so like this: `generics = [<'a> where AI: ToSolanaAccountInfo<'a>]`.

By default the derive macro will pass in the unit type `()` as the `Arg` type for both `FromAccounts` and `ValidateArgument`. Later we'll see how we can set this ourselves.

We can also use the `AccountArgument` derive macro on more complex types:

```rust
#[derive(AccountArgument)]
#[account_argument(account_info = AI, generics = [where AI: AccountInfo])]
pub struct MyArgumentComplex<AI>{
    account1: AI,
    account2: AI,
    optional_account3: Option<AI>,
    rest_of_accounts: Rest<AI>,
}
```

This uses the common `Option` type as well as the cruiser `Rest` type. The exact details of these can be found in their respective reference sections but here's a quick overview:

- `Option<T>`
  - `FromAccounts<()> where T: FromAccounts<()>`: The option will be filled if there is an account available, otherwise will be `None`.
  - `FromAccounts<bool> where T: FromAccounts<()>`: The option will take an account if the argument is `true`, otherwise it will be `None`.
  - `FromAccounts<(Arg,)> where T: FromAccounts<Arg>`: The option will do the same thing as `FromAccounts<()>` but will pass the arg to the inner type.
  - `FromAccounts<Option<Arg>> where T: FromAccounts<Arg>`: The option will be filled if the argument is `Some(Arg)` using the arg on the inner type, otherwise it will be `None`.
  - `ValidateArgument` is cloned from the inner type and only run if the option is filled.
- `Rest<T>`: Will pull all the rest of the accounts from the list as a vector of accounts.

`MyArgumentComplex` will pull the first 2 accounts as `account1` and `account2`. Then if there is a third account it will be put in `optional_account3`. Any remaining accounts will be put in `rest_of_accounts`. Let's say we want `optional_account3`'s fullness to be determined by instruction data rather than account presence. Looking at the list of impls on `Option<T>` we can see that we can use the `FromAccounts<bool>` trait to do this. Here's how we do it:

```rust
#[derive(AccountArgument)]
#[account_argument(account_info = AI, generics = [where AI: AccountInfo])]
#[from(data = (fill_optional_account3: bool))]
pub struct MyArgumentComplex<AI>{
    account1: AI,
    account2: AI,
    #[from(data = fill_optional_account3)]
    optional_account3: Option<AI>,
    rest_of_accounts: Rest<AI>,
}
```

There is some new syntax here so let's go over it:

- `#[from(data = fill_optional_account3)]`: This sets the arg for the `FromAccounts` impl. The data field is a tuple of the form `($(<field_name>: <field_type>),*)`. The `field_name` is the name to bind the argument to and the `field_type` is the type that it will come in as.
- `#[from(data = fill_optional_account3)]`: This sets the argument we pass to `optional_account3`'s `FromAccounts` impl.

We can also use similar syntax for the `ValidateArgument` trait:

```rust
#[derive(AccountArgument)]
#[account_argument(account_info = AI, generics = [where AI: AccountInfo])]
#[from(data = (fill_optional_account3: bool))]
#[validate(data = (validate1: Arg), generics = [<Arg> where CustomValidation<AI>: ValidateArgument<Arg>])]
pub struct MyArgumentComplex<AI> {
    #[validate(data = validate1)]
    account1: CustomValidation<AI>,
    #[validate(signer)]
    account2: AI,
    #[from(data = fill_optional_account3)]
    optional_account3: Option<AI>,
    rest_of_accounts: Rest<AI>,
}
```

As you can see the syntax is nearly the same, I just threw some more stuff in that I'll explain now:

- `generics = [<Arg> where CustomValidation: ValidateArgument<Arg>]`: This allows us to use generics in the argument positions, very helpful!
- `#[validate(signer)]`: `validate` has a few special functions that can be used:
  - `signer`: This verifies the account is a signer.
    - naked `signer` requires the argument impl `MultiIndexable<()>`.
    - `signer(<arg>)` requires the argument impl `MultiIndexable<typeof arg>`.
  - `writable`: This verifies the account is writable.
    - naked `writable` requires the argument impl `MultiIndexable<()>`.
    - `writable(<arg>)` requires the argument impl `MultiIndexable<typeof arg>`.
  - `owner = <pubkey>`: This verifies the account is the owner of the argument.
    - naked `owner = <pubkey>` requires the argument impl `MultiIndexable<()>`.
    - `owner(<arg>) = <pubkey>` requires the argument impl `MultiIndexable<typeof arg>`.
  - `key = <pubkey>`: This verifies the account is the key given.
    - naked `key = <pubkey>` requires the argument impl `SingleIndexable<()>`.
    - `key(<arg>) = <pubkey>` requires the argument impl `SingleIndexable<typeof arg>`.

Since multiple impls of `FromAccounts` and `ValidateArgument` are possible the derive macro allows implementing them multiple times. This is done through the `id` argument.

```rust
#[derive(AccountArgument)]
#[account_argument(account_info = AI, generics = [where AI: AccountInfo])]
#[from(id = if_present, data = ())]
#[from(data = (fill_optional_account3: bool))]
#[validate(data = (validate1: Arg), generics = [<Arg> where CustomValidation<AI>: ValidateArgument<Arg>])]
pub struct MyArgumentComplex<AI> {
    #[validate(data = validate1)]
    account1: CustomValidation<AI>,
    #[validate(signer)]
    account2: AI,
    #[from(id = if_present)]
    #[from(data = fill_optional_account3)]
    optional_account3: Option<AI>,
    rest_of_accounts: Rest<AI>,
}
```

By default, the unit type version is not implemented if another type is added but as can be seen above the `id` can be used to still implement this. The attribute `#[from(id = if_present)]` is not strictly necessary because by default the unit type is passed.

Should you wish to not implement any `FromAccounts` or `ValidateArgument` traits (usually because you want to do it manually) you can do so by adding `no_from` and/or `no_validate` to the `account_argument` attribute:

```rust
#[derive(AccountArgument)]
#[account_argument(account_info = AI, generics = [where AI: AccountInfo], no_from, no_validate)]
pub struct MyArgumentComplex<AI> {
    account1: CustomValidation<AI>,
    account2: AI,
    optional_account3: Option<AI>,
    rest_of_accounts: Rest<AI>,
}
```

## Next Steps

Next we will create each instruction and explain further principles with each.
