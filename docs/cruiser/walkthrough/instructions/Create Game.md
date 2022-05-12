---
sidebar_position: 2
---

# Create Game

Our next instruction will be `create_game`. This instruction is similar to the last but has a few more requirements:

1. The game must be created for a profile, meaning we need to take a profile as an argument.
2. The game must take the player's wager, requiring a cpi transfer.
3. There's some data that the user selects for the game, profiles have a default data they all start with.
4. The game can optionally take another player's profile as the opponent.

We will also add some more functionality than we did with `create_profile`, namely allowing zeroed accounts to be inited. Zeroed accounts are owned by our program but are filled with zeroed data. The reason this is helpful is that `InitAccount` has a limit to the size of account it can create (~10k) but we can create larger accounts by creating them in a separate dedicated instruction. For this instruction we will allow either method of creating accounts. We can do this easily in cruiser with `InitOrZeroedAccount`.

## Definition

Lets define our instruction.

```rust
use crate::accounts::Player;
use crate::pda::GameSignerSeeder;
use crate::{GameBoard, PlayerProfile, TutorialAccounts};
use cruiser::prelude::*;

/// Creates a new game.
#[derive(Debug)]
pub enum CreateGame {}

impl<AI> Instruction<AI> for CreateGame {
    type Accounts = CreateGameAccounts<AI>;
    type Data = CreateGameData;
    type ReturnType = ();
}

/// Accounts for [`CreateGame`]
#[derive(AccountArgument, Debug)]
#[account_argument(account_info = AI, generics = [where AI: AccountInfo])]
#[from(data = (create_data: CreateGameData))]
#[validate(generics = [<'a> where AI: ToSolanaAccountInfo<'a>])]
pub struct CreateGameAccounts<AI> {
    /// The authority for the creator's profile.
    #[validate(signer)]
    pub authority: AI,
    /// The creator's profile.
    #[validate(custom = &self.player_profile.authority == self.authority.key())]
    pub player_profile: ReadOnlyDataAccount<AI, TutorialAccounts, PlayerProfile>,
    /// The game to be created.
    #[from(data = GameBoard::new(
        player_profile.info().key(), 
        create_data.creator_player, 
        create_data.signer_bump, 
        create_data.wager, 
        create_data.turn_length,
    ))]
    #[validate(data = InitArgs{
        system_program: Some(&self.system_program),
        space: InitStaticSized,
        funder: self.funder.as_ref(),
        funder_seeds: None,
        account_seeds: None,
        rent: None,
        cpi: CPIChecked,
    })]
    pub game: InitOrZeroedAccount<AI, TutorialAccounts, GameBoard>,
    /// The game signer that will hold the wager.
    #[validate(writable, data = (GameSignerSeeder{ game: *self.game.info().key() }, self.game.signer_bump))]
    pub game_signer: Seeds<AI, GameSignerSeeder>,
    /// The funder that will put the creator's wager into the game.
    #[validate(signer, writable)]
    pub wager_funder: AI,
    /// The system program for transferring the wager and initializing the game if needed.
    pub system_program: SystemProgram<AI>,
    /// The funder for the game's rent. Only needed if not zeroed.
    #[from(data = game.is_init())]
    #[validate(signer(IfSome), writable(IfSome))]
    pub funder: Option<AI>,
    /// If [`Some`] locks other player to a given profile.
    pub other_player_profile: Option<ReadOnlyDataAccount<AI, TutorialAccounts, PlayerProfile>>,
}

/// Data for [`CreateGame`]
#[derive(Clone, Debug, BorshSerialize, BorshDeserialize)]
pub struct CreateGameData {
    /// Which position the creator wants to play in.
    pub creator_player: Player,
    /// The bump for the game signer.
    pub signer_bump: u8,
    /// The wager each player will place. Winner gets double this amount.
    pub wager: u64,
    /// The length of time each player gets to play their turn. Starts once other player joins.
    pub turn_length: UnixTimestamp,
}
```
This instruction is a bit more complicated than the last so let's take it one step at a time, focusing on the differences.

### `ReadOnlyDataAccount`

To start lets look at one of the new account types:

```rust
/// The creator's profile.
#[validate(custom = &self.player_profile.authority == self.authority.key())]
pub player_profile: ReadOnlyDataAccount<AI, TutorialAccounts, PlayerProfile>,
```

This type allows us to access data from an account in a read-only manner. In this case we only need to see the authority of the profile and confirm that it's the same as the authority passed in. You may also notice that this gives us access to all the data despite not needing anything but the authority, this can be solved by the `in_place` feature seen in [the Further Exploration page](../../further-exploration/In-Place-Data.md).

### `InitOrZeroedAccount`

Next we'll look at the new initializer type:

```rust
/// Accounts for [`CreateGame`]
#[derive(AccountArgument, Debug)]
#[account_argument(account_info = AI, generics = [where AI: AccountInfo])]
#[from(
    data = (create_data: CreateGameData),                   // <-- Difference
    custom = create_data.wager.checked_mul(2).is_some(),    // <-- Difference
)] 
#[validate(generics = [<'a> where AI: ToSolanaAccountInfo<'a>])]
pub struct CreateGameAccounts<AI> {
```

Here we come to our first major difference. We are adding `from` data to this struct and using a custom validation on it. This will help us initialize the game here:

```rust 
/// The game to be created.
#[from(data = GameBoard::new(
    player_profile.info().key(), 
    create_data.creator_player, 
    create_data.signer_bump, 
    create_data.wager, 
    create_data.turn_length,
))]
#[validate(data = InitArgs{
    system_program: Some(&self.system_program), // <- Optional now
    space: InitStaticSized,
    funder: self.funder.as_ref(), // <- Optional now
    funder_seeds: None,
    account_seeds: None,
    rent: None,
    cpi: CPIChecked,
})]
pub game: InitOrZeroedAccount<AI, TutorialAccounts, GameBoard>,
```

We see that the `from` data is used to build the starting value for the `GameBoard`. We can also see the `InitOrZeroedAccount` type is very similar to `InitAccount` with a few key differences. The `InitOrZeroedAccount` type is actually an enum of `InitAccount` and another type: `ZeroedAccount`. It is determined at runtime which to use based on the account's owner. `ZeroedAccount` does not need initialize arguments so to bring the most compatibility `InitOrZeroedAccount` uses the same `InitArgs` validate argument but with each non-trivial field optional. **Be aware the zeroed path does not guarantee the account size out of the box!** In our case the size just needs to be big enough and writing will fail if it's not. This all means that we can take the account funder optionally: 

```rust
/// The funder for the game's rent. Only needed if not zeroed.
#[from(data = game.is_init())]
#[validate(signer(IfSome), writable(IfSome))]
pub funder: Option<AI>,
```

The funder field is only set if the `game.is_init()` is true, meaning the account needs to be initialized. The `system_program` is also optional for initialization now but we need it for wager transfer, so it is still required:

```rust
/// The system program for transferring the wager and initializing the game if needed.
pub system_program: SystemProgram<AI>,
```

### `other_player_profile`

Lastly we have the other player's profile:

```rust
/// If [`Some`] locks other player to a given profile.
pub other_player_profile: Option<ReadOnlyDataAccount<AI, TutorialAccounts, PlayerProfile>>,
```

This lets us fulfill the requirement of allowing the other player to be set to a specific profile. By using `Option`'s `FromAccounts<()>` implementation we determine if we decode this account by its presence in the list of accounts.

## Processor

Next we'll add the instruction processing code. This is going to need to handle a few more things than in `create_profile`: data routing, wager transfer, and other player profile locking.

```rust
/// Data for [`CreateGame`]
#[derive(Clone, Debug, BorshSerialize, BorshDeserialize)]
pub struct CreateGameData {
/// Which position the creator wants to play in.
pub creator_player: Player,
/// The bump for the game signer.
pub signer_bump: u8,
/// The wager each player will place. Winner gets double this amount.
pub wager: u64,
/// The length of time each player gets to play their turn. Starts once other player joins.
pub turn_length: UnixTimestamp,
}

#[cfg(feature = "processor")]
mod processor {
use super::*;
use std::iter::empty;

    impl<'a, AI> InstructionProcessor<AI, CreateGame> for CreateGame
    where
        AI: ToSolanaAccountInfo<'a>,
    {
        type FromAccountsData = CreateGameData;
        type ValidateData = ();
        type InstructionData = CreateGameData;

        fn data_to_instruction_arg(
            data: <CreateGame as Instruction<AI>>::Data,
        ) -> CruiserResult<(
            Self::FromAccountsData,
            Self::ValidateData,
            Self::InstructionData,
        )> {
            assert!(data.wager.checked_mul(2).is_some(), "wager too large");
            Ok((data.clone(), (), data))
        }

        fn process(
            _program_id: &Pubkey,
            data: Self::InstructionData,
            accounts: &mut <CreateGame as Instruction<AI>>::Accounts,
        ) -> CruiserResult<<CreateGame as Instruction<AI>>::ReturnType> {
            // Transfer the wager from the wager_funder to the game signer.
            accounts.system_program.transfer(
                CPIChecked,
                &accounts.wager_funder,
                accounts.game_signer.info(),
                data.wager,
                empty(),
            )?;

            // Set the other player's profile if locked game.
            if let Some(other_player_profile) = &accounts.other_player_profile {
                *match data.creator_player {
                    Player::One => &mut accounts.game.player2,
                    Player::Two => &mut accounts.game.player1,
                } = *other_player_profile.info().key()
            }

            Ok(())
        }
    }
}
```

Data routing is handled in the `data_to_instruction_arg` method. This method takes the data from the instruction and turns it into a tuple of three values: the data that will be used to create the instruction, the data that will be used to validate the instruction, and the data that will be used to process the instruction. In our case the data will be passed to both the `ValidateArgument` implementation and `process` method so we clone it and send it both ways.

In our processing we see how easy CPI calls can be. In this case we just call `transfer` directly on the system program account with the proper arguments. We use `empty` as the seeds because none of the required signers are PDAs. Then we see normal rust code to set the other player's profile if it was passed in.

## Add to InstructionList

Next we need to register our instruction with our instruction list. To do this we'll add the following to the list in `src/lib.rs`:

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
    CreateProfile,
    /// Create a new game.
    #[instruction(instruction_type = instructions::CreateGame)]
    CreateGame,
}
```

## CPI

Next we'll add in the cpi functions for this instruction. We need to handle four different cases: init and zeroed for both locked other player and not. For this we will create new methods for each but there are smarter ways to do this. We also use static size account lists which are faster than dynamic:

```rust
#[cfg(feature = "cpi")]
pub use cpi::*;
/// CPI for [`CreateGame`]
#[cfg(feature = "cpi")]
mod cpi {
    use super::*;
    use crate::TutorialInstructions;

    /// Creates a new game.
    #[derive(Debug)]
    pub struct CreateGameCPI<'a, AI, const N: usize> {
        accounts: [MaybeOwned<'a, AI>; N],
        data: Vec<u8>,
    }
    impl<'a, AI> CreateGameCPI<'a, AI, 6> {
        /// Creates a new game from a zeroed account.
        pub fn new_zeroed(
            authority: impl Into<MaybeOwned<'a, AI>>,
            player_profile: impl Into<MaybeOwned<'a, AI>>,
            game: impl Into<MaybeOwned<'a, AI>>,
            game_signer: impl Into<MaybeOwned<'a, AI>>,
            wager_funder: impl Into<MaybeOwned<'a, AI>>,
            system_program: impl Into<MaybeOwned<'a, AI>>,
            create_game_data: &CreateGameData,
        ) -> CruiserResult<Self> {
            let mut data = Vec::new();
            <TutorialInstructions as InstructionListItem<CreateGame>>::discriminant_compressed()
                .serialize(&mut data)?;
            create_game_data.serialize(&mut data)?;
            Ok(Self {
                accounts: [
                    authority.into(),
                    player_profile.into(),
                    game.into(),
                    game_signer.into(),
                    wager_funder.into(),
                    system_program.into(),
                ],
                data,
            })
        }
    }
    impl<'a, AI> CreateGameCPI<'a, AI, 7> {
        /// Creates a new game
        #[allow(clippy::too_many_arguments)]
        pub fn new(
            authority: impl Into<MaybeOwned<'a, AI>>,
            player_profile: impl Into<MaybeOwned<'a, AI>>,
            game: impl Into<MaybeOwned<'a, AI>>,
            game_signer: impl Into<MaybeOwned<'a, AI>>,
            wager_funder: impl Into<MaybeOwned<'a, AI>>,
            system_program: impl Into<MaybeOwned<'a, AI>>,
            funder: impl Into<MaybeOwned<'a, AI>>,
            create_game_data: &CreateGameData,
        ) -> CruiserResult<Self> {
            let mut data = Vec::new();
            <TutorialInstructions as InstructionListItem<CreateGame>>::discriminant_compressed()
                .serialize(&mut data)?;
            create_game_data.serialize(&mut data)?;
            Ok(Self {
                accounts: [
                    authority.into(),
                    player_profile.into(),
                    game.into(),
                    game_signer.into(),
                    wager_funder.into(),
                    system_program.into(),
                    funder.into(),
                ],
                data,
            })
        }

        /// Creates a new game from a zeroed account and locked other player.
        #[allow(clippy::too_many_arguments)]
        pub fn new_zeroed_with_locked_player(
            authority: impl Into<MaybeOwned<'a, AI>>,
            player_profile: impl Into<MaybeOwned<'a, AI>>,
            game: impl Into<MaybeOwned<'a, AI>>,
            game_signer: impl Into<MaybeOwned<'a, AI>>,
            wager_funder: impl Into<MaybeOwned<'a, AI>>,
            system_program: impl Into<MaybeOwned<'a, AI>>,
            other_player_profile: impl Into<MaybeOwned<'a, AI>>,
            create_game_data: &CreateGameData,
        ) -> CruiserResult<Self> {
            let mut data = Vec::new();
            <TutorialInstructions as InstructionListItem<CreateGame>>::discriminant_compressed()
                .serialize(&mut data)?;
            create_game_data.serialize(&mut data)?;
            Ok(Self {
                accounts: [
                    authority.into(),
                    player_profile.into(),
                    game.into(),
                    game_signer.into(),
                    wager_funder.into(),
                    system_program.into(),
                    other_player_profile.into(),
                ],
                data,
            })
        }
    }
    impl<'a, AI> CreateGameCPI<'a, AI, 8> {
        /// Creates a new game with a locked other player.
        #[allow(clippy::too_many_arguments)]
        pub fn new_with_locked_player(
            authority: impl Into<MaybeOwned<'a, AI>>,
            player_profile: impl Into<MaybeOwned<'a, AI>>,
            game: impl Into<MaybeOwned<'a, AI>>,
            game_signer: impl Into<MaybeOwned<'a, AI>>,
            wager_funder: impl Into<MaybeOwned<'a, AI>>,
            system_program: impl Into<MaybeOwned<'a, AI>>,
            funder: impl Into<MaybeOwned<'a, AI>>,
            other_player_profile: impl Into<MaybeOwned<'a, AI>>,
            create_game_data: &CreateGameData,
        ) -> CruiserResult<Self> {
            let mut data = Vec::new();
            <TutorialInstructions as InstructionListItem<CreateGame>>::discriminant_compressed()
                .serialize(&mut data)?;
            create_game_data.serialize(&mut data)?;
            Ok(Self {
                accounts: [
                    authority.into(),
                    player_profile.into(),
                    game.into(),
                    game_signer.into(),
                    wager_funder.into(),
                    system_program.into(),
                    funder.into(),
                    other_player_profile.into(),
                ],
                data,
            })
        }
    }

    impl<'a, AI> CPIClientStatic<'a, 7> for CreateGameCPI<'a, AI, 6>
    where
        AI: ToSolanaAccountMeta,
    {
        type InstructionList = TutorialInstructions;
        type Instruction = CreateGame;
        type AccountInfo = AI;

        fn instruction(
            self,
            program_account: impl Into<MaybeOwned<'a, Self::AccountInfo>>,
        ) -> InstructionAndAccounts<[MaybeOwned<'a, Self::AccountInfo>; 7]> {
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
            let mut accounts = self.accounts.into_iter();
            InstructionAndAccounts {
                instruction,
                accounts: [
                    accounts.next().unwrap(),
                    accounts.next().unwrap(),
                    accounts.next().unwrap(),
                    accounts.next().unwrap(),
                    accounts.next().unwrap(),
                    accounts.next().unwrap(),
                    program_account,
                ],
            }
        }
    }
    impl<'a, AI> CPIClientStatic<'a, 8> for CreateGameCPI<'a, AI, 7>
    where
        AI: ToSolanaAccountMeta,
    {
        type InstructionList = TutorialInstructions;
        type Instruction = CreateGame;
        type AccountInfo = AI;

        fn instruction(
            self,
            program_account: impl Into<MaybeOwned<'a, Self::AccountInfo>>,
        ) -> InstructionAndAccounts<[MaybeOwned<'a, Self::AccountInfo>; 8]> {
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
            let mut accounts = self.accounts.into_iter();
            InstructionAndAccounts {
                instruction,
                accounts: [
                    accounts.next().unwrap(),
                    accounts.next().unwrap(),
                    accounts.next().unwrap(),
                    accounts.next().unwrap(),
                    accounts.next().unwrap(),
                    accounts.next().unwrap(),
                    accounts.next().unwrap(),
                    program_account,
                ],
            }
        }
    }
    impl<'a, AI> CPIClientStatic<'a, 9> for CreateGameCPI<'a, AI, 8>
    where
        AI: ToSolanaAccountMeta,
    {
        type InstructionList = TutorialInstructions;
        type Instruction = CreateGame;
        type AccountInfo = AI;

        fn instruction(
            self,
            program_account: impl Into<MaybeOwned<'a, Self::AccountInfo>>,
        ) -> InstructionAndAccounts<[MaybeOwned<'a, Self::AccountInfo>; 9]> {
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
            let mut accounts = self.accounts.into_iter();
            InstructionAndAccounts {
                instruction,
                accounts: [
                    accounts.next().unwrap(),
                    accounts.next().unwrap(),
                    accounts.next().unwrap(),
                    accounts.next().unwrap(),
                    accounts.next().unwrap(),
                    accounts.next().unwrap(),
                    accounts.next().unwrap(),
                    accounts.next().unwrap(),
                    program_account,
                ],
            }
        }
    }
}
```

## Client

For the client we will collapse the four methods into 2, where each handles both options for locked other player. We could collapse this further by adding an argument to determine if we should use a zeroed account. We can't dynamically check the chain for this because our instruction may be coming after another that creates the zeroed account.

```rust
#[cfg(feature = "client")]
pub use client::*;
/// Client for [`CreateGame`]
#[cfg(feature = "client")]
mod client {
    use super::*;
    use std::future::Future;

    /// Data for [`create_game`]
    #[derive(Clone, Debug)]
    pub struct CreateGameClientData {
        /// Which position the creator wants to play in.
        pub creator_player: Player,
        /// The wager each player will place. Winner gets double this amount.
        pub wager: u64,
        /// The length of time each player gets to play their turn. Starts once other player joins.
        pub turn_length: UnixTimestamp,
    }
    impl CreateGameClientData {
        /// Turns this into [`CreateGameData`]
        pub fn into_data(self, signer_bump: u8) -> CreateGameData {
            CreateGameData {
                creator_player: self.creator_player,
                wager: self.wager,
                turn_length: self.turn_length,
                signer_bump,
            }
        }
    }

    /// Creates a new game.
    #[allow(clippy::too_many_arguments)]
    pub fn create_game<'a>(
        program_id: Pubkey,
        authority: impl Into<HashedSigner<'a>>,
        player_profile: Pubkey,
        game: impl Into<HashedSigner<'a>>,
        wager_funder: impl Into<HashedSigner<'a>>,
        funder: impl Into<HashedSigner<'a>>,
        other_player_profile: Option<Pubkey>,
        data: CreateGameClientData,
    ) -> InstructionSet<'a> {
        let authority = authority.into();
        let game = game.into();
        let wager_funder = wager_funder.into();
        let funder = funder.into();

        let (game_signer, signer_bump) = GameSignerSeeder {
            game: game.pubkey(),
        }
        .find_address(&program_id);

        match other_player_profile {
            Some(other_player_profile) => InstructionSet {
                instructions: vec![
                    cpi::CreateGameCPI::new_with_locked_player(
                        SolanaAccountMeta::new_readonly(authority.pubkey(), true),
                        SolanaAccountMeta::new(player_profile, false),
                        SolanaAccountMeta::new(game.pubkey(), true),
                        SolanaAccountMeta::new(game_signer, false),
                        SolanaAccountMeta::new(wager_funder.pubkey(), true),
                        SolanaAccountMeta::new_readonly(SystemProgram::<()>::KEY, false),
                        SolanaAccountMeta::new(funder.pubkey(), true),
                        SolanaAccountMeta::new_readonly(other_player_profile, false),
                        &data.into_data(signer_bump),
                    )
                    .unwrap()
                    .instruction(SolanaAccountMeta::new_readonly(program_id, false))
                    .instruction,
                ],
                signers: [authority, game, wager_funder, funder]
                    .into_iter()
                    .collect(),
            },
            None => InstructionSet {
                instructions: vec![
                    cpi::CreateGameCPI::new(
                        SolanaAccountMeta::new_readonly(authority.pubkey(), true),
                        SolanaAccountMeta::new(player_profile, false),
                        SolanaAccountMeta::new(game.pubkey(), true),
                        SolanaAccountMeta::new(game_signer, false),
                        SolanaAccountMeta::new(wager_funder.pubkey(), true),
                        SolanaAccountMeta::new_readonly(SystemProgram::<()>::KEY, false),
                        SolanaAccountMeta::new(funder.pubkey(), true),
                        &data.into_data(signer_bump),
                    )
                    .unwrap()
                    .instruction(SolanaAccountMeta::new_readonly(program_id, false))
                    .instruction,
                ],
                signers: [authority, game, wager_funder, funder]
                    .into_iter()
                    .collect(),
            },
        }
    }

    /// Creates a new game from a zeroed account.
    #[allow(clippy::too_many_arguments)]
    pub async fn create_game_zeroed<'a, F, E>(
        program_id: Pubkey,
        authority: impl Into<HashedSigner<'a>>,
        player_profile: Pubkey,
        game: impl Into<HashedSigner<'a>>,
        wager_funder: impl Into<HashedSigner<'a>>,
        funder: impl Into<HashedSigner<'a>>,
        other_player_profile: Option<Pubkey>,
        data: CreateGameClientData,
        rent: impl FnOnce(usize) -> F,
    ) -> Result<InstructionSet<'a>, E>
    where
        F: Future<Output = Result<u64, E>>,
    {
        let authority = authority.into();
        let game = game.into();
        let game_key = game.pubkey();
        let wager_funder = wager_funder.into();
        let funder = funder.into();

        let (game_signer, signer_bump) =
            GameSignerSeeder { game: game_key }.find_address(&program_id);

        let mut out = system_program::create_account(
            funder,
            game,
            rent(GameBoard::ON_CHAIN_SIZE).await?,
            GameBoard::ON_CHAIN_SIZE as u64,
            program_id,
        );
        out.add_set(match other_player_profile {
            Some(other_player_profile) => InstructionSet {
                instructions: vec![
                    cpi::CreateGameCPI::new_zeroed_with_locked_player(
                        SolanaAccountMeta::new_readonly(authority.pubkey(), true),
                        SolanaAccountMeta::new(player_profile, false),
                        SolanaAccountMeta::new(game_key, false),
                        SolanaAccountMeta::new(game_signer, false),
                        SolanaAccountMeta::new(wager_funder.pubkey(), true),
                        SolanaAccountMeta::new_readonly(SystemProgram::<()>::KEY, false),
                        SolanaAccountMeta::new_readonly(other_player_profile, false),
                        &data.into_data(signer_bump),
                    )
                    .unwrap()
                    .instruction(SolanaAccountMeta::new_readonly(program_id, false))
                    .instruction,
                ],
                signers: [authority, wager_funder].into_iter().collect(),
            },
            None => InstructionSet {
                instructions: vec![
                    cpi::CreateGameCPI::new_zeroed(
                        SolanaAccountMeta::new_readonly(authority.pubkey(), true),
                        SolanaAccountMeta::new(player_profile, false),
                        SolanaAccountMeta::new(game_key, false),
                        SolanaAccountMeta::new(game_signer, false),
                        SolanaAccountMeta::new(wager_funder.pubkey(), true),
                        SolanaAccountMeta::new_readonly(SystemProgram::<()>::KEY, false),
                        &data.into_data(signer_bump),
                    )
                    .unwrap()
                    .instruction(SolanaAccountMeta::new_readonly(program_id, false))
                    .instruction,
                ],
                signers: [authority, wager_funder].into_iter().collect(),
            },
        });
        Ok(out)
    }
}
```

## Tests

Finally, we can add tests for our function. First we need to add it to `tests/instructions/mod.rs`:

```rust
mod create_game;
```

Then we'll add the test to `tests/instructions/create_game.rs`. For this tutorial we will only test the init with no other player path but good practice would be to test all paths, as well as missing signers and other attacks.

```rust
use crate::instructions::setup_validator;
use cruiser::prelude::*;
use cruiser_tutorial::accounts::{GameBoard, Player};
use cruiser_tutorial::instructions::{create_game, create_profile, CreateGameClientData};
use cruiser_tutorial::TutorialAccounts;
use std::error::Error;
use std::time::Duration;

#[tokio::test]
async fn create_game_test() -> Result<(), Box<dyn Error>> {
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
    let game = Keypair::new();

    // Send transaction
    let (sig, result) = TransactionBuilder::new(&funder)
        .signed_instructions(create_profile(
            guard.program_id(),
            &authority,
            &profile,
            &funder,
        ))
        .signed_instructions(create_game(
            guard.program_id(),
            &authority,
            profile.pubkey(),
            &game,
            &funder,
            &funder,
            None,
            CreateGameClientData {
                creator_player: Player::One,
                wager: LAMPORTS_PER_SOL,
                turn_length: 60 * 60 * 24, // 1 day
            },
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
        .get_account_with_commitment(&game.pubkey(), CommitmentConfig::confirmed())
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
        <TutorialAccounts as AccountListItem<GameBoard>>::compressed_discriminant()
    );
    let board = GameBoard::deserialize(&mut data)?;
    assert_eq!(
        board,
        GameBoard::new(
            &profile.pubkey(),
            Player::One,
            board.signer_bump,
            LAMPORTS_PER_SOL,
            60 * 60 * 24
        )
    );

    guard.drop_self().await;
    Ok(())
}
```

This test should execute without error. To run it you can either run `cargo test --features client` or `cargo test --features client --test all_tests instructions::create_profile::create_game_test -- --exact` to run only this test.
