---
sidebar_position: 1
---

# Create Profile

First we will make the `create_profile` instruction. The purpose of this instruction is simply to make a `PlayerProfile` account.

We'll create and edit the `src/instructions/create_profile.rs` file. Don't forget to uncomment the import in `src/instructions/mod.rs`.

## Definition

We'll add the definition to the file. Here's the definition:

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

## Add to InstuctiionList

Next we need to register our instruction with our instruction list. To do this we'll add the following to the list in `src/lib.rs`:

```rust
#[derive(Debug, InstructionList, Copy, Clone)]
#[instruction_list(
    account_list = TutorialAccounts,
    account_info = [<'a, AI> AI where AI: ToSolanaAccountInfo<'a>],
)]
pub enum TutorialInstructions {
    /// Creates a new player profile.
    #[instruction(instruction_type = instructions::CreateProfile)]
    CreateProfile,
}
```

Now we can also talk about instruction discriminants. By default `cruiser` instructions are discriminated by a `u64` corresponding to the enum variant. If you want a different discriminant type you can add the `discriminant_type` argument to the `instruction_list` attribute. The type must implement `CompressedNumber<u64>` (`u8`, `u16`, and `u32` are all valid, but you can make your own if you want to do it differently). In addition, if you want the value to be different than the default discriminant you can change it with the standard rust discriminant syntax.

```rust
#[derive(Debug, InstructionList, Copy, Clone)]
#[instruction_list(
    account_list = TutorialAccounts,
    account_info = [<'a, AI> AI where AI: ToSolanaAccountInfo<'a>],
    discriminant_type = u8,
)]
pub enum TutorialInstructions {
    /// Creates a new player profile.
    #[instruction(instruction_type = instructions::CreateProfile)]
    CreateProfile = 100,
}
```

## Create CPI Helper Functions

Next we'll add functions to help with CPI calls to this instruction. Even if your function isn't designed with CPI in mind it's helpful to have this as it makes client code easier. We'll add the following to the instruction file:

```rust
/// CPI types for [`CreateProfile`]
#[cfg(feature = "cpi")] // We don't need this code when compiling our program for deployment
pub mod cpi {
    use super::*;
    use crate::TutorialInstructions;

    /// Creates a new player profile.
    /// If the instruction could be called multiple ways we would 
    /// create more of these types or add functions to this one.
    #[derive(Debug)]
    pub struct CreateProfileCPI<'a, AI> {
        // The `MaybeOwned` type allows for refs or owned values to be passed in.
        accounts: [MaybeOwned<'a, AI>; 4],
        // The data has to be `Vec`ed anyway for CPI so we do that here.
        data: Vec<u8>, 
    }
    impl<'a, AI> CreateProfileCPI<'a, AI> {
        /// Creates a new player profile.
        pub fn new(
            // By taking this impl type we don't have to make our users pass 
            // in `MaybeOwned` types, just refs or owned values.
            authority: impl Into<MaybeOwned<'a, AI>>,
            profile: impl Into<MaybeOwned<'a, AI>>,
            funder: impl Into<MaybeOwned<'a, AI>>,
            system_program: impl Into<MaybeOwned<'a, AI>>,
        ) -> CruiserResult<Self> {
            let mut data = Vec::new();
            <TutorialInstructions as InstructionListItem<CreateProfile>>::discriminant_compressed()
                .serialize(&mut data)?;
            // This will do nothing but throw an error if we update this to include more data.
            CreateProfileData {}.serialize(&mut data)?; 
            Ok(Self {
                accounts: [
                    authority.into(),
                    profile.into(),
                    funder.into(),
                    system_program.into(),
                ],
                data,
            })
        }
    }

    // This trait allows us to use `CruiserProgramAccount`s to easily invoke the CPI.
    impl<'a, AI> CPIClientStatic<'a, 5> for CreateProfileCPI<'a, AI>
    where
        AI: ToSolanaAccountMeta,
    {
        type InstructionList = TutorialInstructions;
        type Instruction = CreateProfile;
        type AccountInfo = AI;

        // Here we need to return both the instruction and the account infos for the CPI.
        fn instruction(
            self,
            program_account: impl Into<MaybeOwned<'a, Self::AccountInfo>>,
        ) -> InstructionAndAccounts<[MaybeOwned<'a, Self::AccountInfo>; 5]> {
            let program_account = program_account.into();
            let instruction = SolanaInstruction {
                program_id: *program_account.meta_key(),
                accounts: self
                    .accounts
                    .iter()
                    .map(MaybeOwned::as_ref)
                    .map(AI::to_solana_account_meta)
                    .collect(),
                data: self.data,
            };
            // This could be better but requires rust const generics to concatenate two arrays.
            // Instead we pull out the items with the `into_iter` method.
            let mut accounts = self.accounts.into_iter();
            InstructionAndAccounts {
                instruction,
                accounts: [
                    accounts.next().unwrap(),
                    accounts.next().unwrap(),
                    accounts.next().unwrap(),
                    accounts.next().unwrap(),
                    program_account.into(),
                ],
            }
        }
    }
}
```

## Client

Now we're going to add the client functions to the instruction. These are meant to be called by a rust client through RPC calls in either tests, stand-alone applications, or WASM in a website. We add the following to the bottom of the instruction file: 

```rust
/// Client functions for [`CreateProfile`]
#[cfg(feature = "client")] // We don't want any of the client code in program code.
pub mod client {
    use super::*;

    /// Creates a new player profile.
    pub fn create_profile<'a>(
        program_id: Pubkey,
        // Signers are `impl Into<HashedSigner<'a>>`. Non-signers are `Pubkey`.
        authority: impl Into<HashedSigner<'a>>,
        profile: impl Into<HashedSigner<'a>>,
        funder: impl Into<HashedSigner<'a>>,
        // We don't take the system program as a parameter because we know its key.
    ) -> InstructionSet<'a> {
        let authority = authority.into();
        let profile = profile.into();
        let funder = funder.into();
        InstructionSet {
            instructions: vec![
                // We use the cpi function to reduce the amount of code we need to write.
                cpi::CreateProfileCPI::new(
                    SolanaAccountMeta::new_readonly(authority.pubkey(), true),
                    SolanaAccountMeta::new(profile.pubkey(), true),
                    SolanaAccountMeta::new(funder.pubkey(), true),
                    SolanaAccountMeta::new_readonly(SystemProgram::<()>::KEY, false),
                )
                    .unwrap()
                    .instruction(SolanaAccountMeta::new_readonly(program_id, false))
                    .instruction,
            ],
            signers: [authority, profile, funder].into_iter().collect(),
        }
    }
}
```

## Tests

Now we can test our function. To do this we need to add a file at `tests/all_tests.rs`:

```rust
mod instructions;
```

Then we'll add the following lines to `Cargo.toml`:

```toml
[[test]]
name = "all_tests"
required-features = ["client"]
```

This makes sure our tests only run with the client feature enabled.

### `tests/instruction/mod.rs`

Next we'll add the tests directory in with its module at `tests/instruction/mod.rs`:

```rust
mod create_profile;
```

The reason we have to have them in a folder is because rust runs all top level test files sequentially but we want to run a single local validator for all of our tests.

To this file we'll add some helpful validator setup code:

```rust

use cruiser::prelude::*;
use futures::executor::block_on;
use reqwest::Client;
use std::cell::UnsafeCell;
use std::path::Path;
use std::sync::atomic::{AtomicIsize, Ordering};
use std::time::Duration;
use tokio::process::{Child, Command};
use tokio::task::{spawn_blocking, yield_now};
use tokio::time::sleep;

static SETUP: Setup = Setup::new();

/// All tests that need validator access should call this function
/// and call [`TestGuard::drop_self`] when done with the validator.
pub async fn setup_validator() -> TestGuard {
    SETUP.setup().await
}

struct Setup {
    test_count: AtomicIsize,
    program_id: UnsafeCell<Option<Pubkey>>,
    validator: UnsafeCell<Option<Child>>,
}
impl Setup {
    const fn new() -> Self {
        Self {
            test_count: AtomicIsize::new(0),
            program_id: UnsafeCell::new(None),
            validator: UnsafeCell::new(None),
        }
    }

    async fn setup(&'static self) -> TestGuard {
        let mut count = self.test_count.load(Ordering::SeqCst);
        let should_start = loop {
            let should_start = match count {
                -2 => panic!("Validator could not be started"),
                -1 => {
                    // Validator is being killed
                    sleep(Duration::from_millis(100)).await;
                    continue;
                }
                0 => true,
                count if count > 0 => false,
                count => panic!("Bad value for count: {}", count),
            };
            assert!(count >= 0);
            match self.test_count.compare_exchange_weak(
                count,
                count + 1,
                Ordering::SeqCst,
                Ordering::SeqCst,
            ) {
                Ok(_) => break should_start,
                Err(new_count) => {
                    count = new_count;
                    yield_now().await;
                }
            }
        };
        if should_start {
            match start_validator().await {
                Ok((program_id, validator)) => unsafe {
                    *self.program_id.get() = Some(program_id);
                    *self.validator.get() = Some(validator);
                },
                Err(e) => {
                    self.test_count.store(-2, Ordering::SeqCst);
                    panic!("Validator could not be started! Error: {}", e);
                }
            }
        }
        let out = TestGuard::new(self);
        let client = Client::new();
        loop {
            if self.test_count.load(Ordering::SeqCst) == -2 {
                panic!("Validator could not be started");
            }
            if client
                .get("http://localhost:8899/health")
                .send()
                .await
                .map_or(false, |res| res.status().is_success())
            {
                break;
            }
            sleep(Duration::from_millis(500)).await;
        }
        out
    }
}
unsafe impl Sync for Setup {}

async fn start_validator() -> Result<(Pubkey, Child), Box<dyn std::error::Error>> {
    let deploy_dir = Path::new(env!("CARGO_TARGET_TMPDIR"))
        .parent()
        .unwrap()
        .join("deploy");
    let build = Command::new("cargo")
        .env("RUSTFLAGS", "-D warnings")
        .arg("build-bpf")
        .arg("--workspace")
        .spawn()?
        .wait()
        .await?;
    if !build.success() {
        return Err(build.to_string().into());
    }
    let program_id = Keypair::new().pubkey();
    println!("Program ID: `{}`", program_id);

    let mut local_validator = Command::new("solana-test-validator");
    local_validator
        .arg("-r")
        .arg("--bpf-program")
        .arg(program_id.to_string())
        .arg(deploy_dir.join(format!("{}.so", env!("CARGO_PKG_NAME"))))
        .arg("--deactivate-feature")
        .arg("5ekBxc8itEnPv4NzGJtr8BVVQLNMQuLMNQQj7pHoLNZ9") // transaction wide compute cap
        .arg("--deactivate-feature")
        .arg("75m6ysz33AfLA5DDEzWM1obBrnPQRSsdVQ2nRmc8Vuu1") // support account data reallocation
        .arg("--ledger")
        .arg(Path::new(env!("CARGO_TARGET_TMPDIR")).join("test_ledger"));

    Ok((program_id, local_validator.spawn()?))
}

#[must_use]
pub struct TestGuard {
    setup: &'static Setup,
    client: RpcClient,
}
impl TestGuard {
    fn new(setup: &'static Setup) -> Self {
        Self {
            setup,
            client: RpcClient::new("https://localhost:8899"),
        }
    }

    pub fn program_id(&self) -> Pubkey {
        unsafe { (*self.setup.program_id.get()).unwrap() }
    }

    pub fn client(&self) -> &RpcClient {
        &self.client
    }

    pub async fn drop_self(self) {
        spawn_blocking(move || {
            drop(self);
        })
            .await
            .unwrap();
    }
}
impl Drop for TestGuard {
    fn drop(&mut self) {
        block_on(async {
            let mut count = self.setup.test_count.load(Ordering::SeqCst);
            let should_kill = loop {
                let (replace, should_kill) = match count {
                    count if count < 1 => panic!("`TestGuard` dropped when count less than 1"),
                    1 => (-1, true),
                    count => (count - 1, false),
                };
                match self.setup.test_count.compare_exchange_weak(
                    count,
                    replace,
                    Ordering::SeqCst,
                    Ordering::SeqCst,
                ) {
                    Ok(_) => break should_kill,
                    Err(new_count) => {
                        count = new_count;
                        yield_now().await;
                    }
                }
            };
            if should_kill {
                let mut local = unsafe { (&mut *self.setup.validator.get()).take().unwrap() };
                local.start_kill().unwrap();
                local.wait().await.unwrap();
                assert_eq!(self.setup.test_count.fetch_add(1, Ordering::SeqCst), -1);
                println!("Validator cleaned up properly");
            }
        });
    }
}
```

This is some code that will setup the local validator for all the tests. Notice the comment on `setup_validator`.

### `tests/instructions/create_profile.rs`

Now we can create our actual test file:

```rust
use crate::instructions::setup_validator;
use cruiser::prelude::*;
use std::error::Error;
use std::time::Duration;
use tutorial_program::accounts::PlayerProfile;
use tutorial_program::instructions::client::create_profile;
use tutorial_program::TutorialAccounts;

#[tokio::test]
async fn create_profile_test() -> Result<(), Box<dyn Error>> {
    let guard = setup_validator().await;

    let rpc = guard.rpc();
    let funder = Keypair::new();

    // Airdrop SOL to the funder
    let blockhash = rpc.get_latest_blockhash().await?;
    let sig = rpc
        .request_airdrop_with_blockhash(&funder.pubkey(), LAMPORTS_PER_SOL * 10, &blockhash)
        .await?;
    rpc.confirm_transaction_with_spinner(&sig, &blockhash, CommitmentConfig::confirmed())
        .await?;

    // Create random authority and profile
    let authority = Keypair::new();
    let profile = Keypair::new();

    // Send transaction
    let (sig, result) = TransactionBuilder::new(&funder)
        .signed_instructions(create_profile(
            guard.program_id(),
            &authority,
            &profile,
            &funder,
        ))
        .send_and_confirm_transaction(
            rpc,
            RpcSendTransactionConfig {
                skip_preflight: false,
                preflight_commitment: Some(CommitmentLevel::Confirmed),
                encoding: None,
                max_retries: None,
            },
            CommitmentConfig::confirmed(),
            Duration::from_millis(500),
        )
        .await?;

    // Check result
    match result {
        ConfirmationResult::Success => {}
        ConfirmationResult::Failure(error) => return Err(error.into()),
        ConfirmationResult::Dropped => return Err("Transaction dropped".into()),
    }

    // Print logs for debugging
    println!(
        "Logs: {:#?}",
        rpc.get_transaction_with_config(
            &sig,
            RpcTransactionConfig {
                encoding: None,
                commitment: Some(CommitmentConfig::confirmed()),
                max_supported_transaction_version: None
            }
        )
            .await?
            .transaction
            .meta
            .unwrap()
            .log_messages
    );

    // Check account data is what we expect
    let account = rpc
        .get_account_with_commitment(&profile.pubkey(), CommitmentConfig::confirmed())
        .await?
        .value
        .unwrap_or_else(|| {
            panic!("Account not found");
        });
    let mut data = account.data.as_slice();
    let discriminant =
        <TutorialAccounts as AccountList>::DiscriminantCompressed::deserialize(&mut data)?;
    assert_eq!(
        discriminant,
        <TutorialAccounts as AccountListItem<PlayerProfile>>::compressed_discriminant()
    );
    let profile = PlayerProfile::deserialize(&mut data)?;
    assert_eq!(profile, PlayerProfile::new(&authority.pubkey()));

    guard.drop_self().await;
    Ok(())
}
```
