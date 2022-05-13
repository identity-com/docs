---
sidebar_position: 3
---

# Join Game

Our next instruction will be `join_game`. This is a simpler instruction than the previous one because it doesn't initialize an account, just edit one and do a transfer.

This instruction will be light on explanations and definitions. This should serve as a checkpoint to your understanding as most of what is happening should seem familiar.

## Definition

```rust
use crate::pda::GameSignerSeeder;
use crate::{Game, PlayerProfile, TutorialAccounts};
use cruiser::prelude::*;

/// Joins an already created game.
#[derive(Debug)]
pub enum JoinGame {}

impl<AI> Instruction<AI> for JoinGame {
type Accounts = JoinGameAccounts<AI>;
type Data = JoinGameData;
type ReturnType = ();
}

/// Accounts for [`JoinGame`]
#[derive(AccountArgument, Debug)]
#[account_argument(account_info = AI, generics = [where AI: AccountInfo])]
#[validate(generics = [<'a> where AI: ToSolanaAccountInfo<'a>])]
pub struct JoinGameAccounts<AI> {
/// The authority of the joiner
#[validate(signer)]
pub authority: AI,
/// The profile of the joiner
#[validate(custom = &self.player_profile.authority == self.authority.key())]
pub player_profile: ReadOnlyDataAccount<AI, TutorialAccounts, PlayerProfile>,
/// The game to join
#[validate(
    writable,
    custom = !self.game.is_started(),
    custom = self.game.is_valid_other_player(self.player_profile.info().key()),
)]
pub game: DataAccount<AI, TutorialAccounts, Game>,
/// The signer of the game
#[validate(writable, data = (GameSignerSeeder{ game: *self.game.info().key() }, self.game.signer_bump))]
pub game_signer: Seeds<AI, GameSignerSeeder>,
/// The funder for the wager
#[validate(signer, writable)]
pub wager_funder: AI,
/// The system program
pub system_program: SystemProgram<AI>,
}

/// Data for [`JoinGame`]
#[derive(Clone, Debug, BorshSerialize, BorshDeserialize)]
pub struct JoinGameData {}
```

This should all be familiar at this point except for `DataAccount` which is just a version of `ReadOnlyDataAccount` that writes data changes back to the chain.

## Processor

```rust
#[cfg(feature = "processor")]
mod processor {
    use super::*;
    use crate::accounts::Player;
    use cruiser::solana_program::clock::Clock;
    use std::iter::empty;

    impl<'a, AI> InstructionProcessor<AI, JoinGame> for JoinGame
    where
        AI: ToSolanaAccountInfo<'a>,
    {
        type FromAccountsData = ();
        type ValidateData = ();
        type InstructionData = ();

        fn data_to_instruction_arg(
            _data: <JoinGame as Instruction<AI>>::Data,
        ) -> CruiserResult<(
            Self::FromAccountsData,
            Self::ValidateData,
            Self::InstructionData,
        )> {
            Ok(((), (), ()))
        }

        fn process(
            _program_id: &Pubkey,
            _data: Self::InstructionData,
            accounts: &mut <JoinGame as Instruction<AI>>::Accounts,
        ) -> CruiserResult<<JoinGame as Instruction<AI>>::ReturnType> {
            // Set the other player
            *match accounts.game.creator {
                Player::One => &mut accounts.game.player2,
                Player::Two => &mut accounts.game.player1,
            } = *accounts.player_profile.info().key();

            // Start the game by setting the timestamp
            accounts.game.last_turn = Clock::get()?.unix_timestamp;

            // Transfer the wager to the game
            accounts.system_program.transfer(
                CPIChecked,
                &accounts.wager_funder,
                accounts.game_signer.info(),
                accounts.game.wager,
                empty(),
            )?;

            Ok(())
        }
    }
}
```

## Add to `InstructionList`

Add the following to `src/lib.rs`:

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
    /// Join a game.
    #[instruction(instruction_type = instructions::JoinGame)]
    JoinGame,
}
```

## CPI

```rust
#[cfg(feature = "cpi")]
pub use cpi::*;

/// CPI for [`JoinGame`]
#[cfg(feature = "cpi")]
mod cpi {
    use super::*;
    use crate::TutorialInstructions;

    /// CPI for [`JoinGame`]
    #[derive(Debug)]
    pub struct JoinGameCPI<'a, AI> {
        accounts: [MaybeOwned<'a, AI>; 6],
        data: Vec<u8>,
    }
    impl<'a, AI> JoinGameCPI<'a, AI> {
        /// Joins a game
        pub fn new(
            authority: impl Into<MaybeOwned<'a, AI>>,
            player_profile: impl Into<MaybeOwned<'a, AI>>,
            game: impl Into<MaybeOwned<'a, AI>>,
            game_signer: impl Into<MaybeOwned<'a, AI>>,
            wager_funder: impl Into<MaybeOwned<'a, AI>>,
            system_program: impl Into<MaybeOwned<'a, AI>>,
        ) -> CruiserResult<Self> {
            let mut data = Vec::new();
            <TutorialInstructions as InstructionListItem<JoinGame>>::discriminant_compressed()
                .serialize(&mut data)?;
            JoinGameData {}.serialize(&mut data)?;
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

    impl<'a, AI> CPIClientStatic<'a, 7> for JoinGameCPI<'a, AI>
    where
        AI: ToSolanaAccountMeta,
    {
        type InstructionList = TutorialInstructions;
        type Instruction = JoinGame;
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
}
```

## Client

```rust
#[cfg(feature = "client")]
pub use client::*;

/// Client for [`JoinGame`]
#[cfg(feature = "client")]
mod client {
    use super::*;

    /// Joins a game.
    pub fn join_game<'a>(
        program_id: Pubkey,
        authority: impl Into<HashedSigner<'a>>,
        player_profile: Pubkey,
        game: Pubkey,
        game_signer_bump: u8,
        wager_funder: impl Into<HashedSigner<'a>>,
    ) -> InstructionSet<'a> {
        let authority = authority.into();
        let wager_funder = wager_funder.into();
        InstructionSet {
            instructions: vec![
                JoinGameCPI::new(
                    SolanaAccountMeta::new_readonly(authority.pubkey(), true),
                    SolanaAccountMeta::new_readonly(player_profile, false),
                    SolanaAccountMeta::new(game, false),
                    SolanaAccountMeta::new(
                        GameSignerSeeder { game }
                            .create_address(&program_id, game_signer_bump)
                            .unwrap(),
                        false,
                    ),
                    SolanaAccountMeta::new(wager_funder.pubkey(), true),
                    SolanaAccountMeta::new_readonly(SystemProgram::<()>::KEY, false),
                )
                .unwrap()
                .instruction(SolanaAccountMeta::new_readonly(program_id, false))
                .instruction,
            ],
            signers: [authority, wager_funder].into_iter().collect(),
        }
    }
}
```

## Tests

Add the following to your `tests/instructions/mod.rs`:

```rust
mod join_game;
```

Then we create `tests/instructions/join_game.rs`:

```rust
use crate::instructions::setup_validator;
use cruiser::prelude::*;
use cruiser_tutorial::accounts::{Game, Player};
use cruiser_tutorial::instructions::{
    create_game, create_profile, join_game, CreateGameClientData,
};
use cruiser_tutorial::pda::GameSignerSeeder;
use cruiser_tutorial::TutorialAccounts;
use std::error::Error;
use std::time::Duration;

#[tokio::test]
async fn join_game_test() -> Result<(), Box<dyn Error>> {
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
    let authority1 = Keypair::new();
    let profile1 = Keypair::new();
    let authority2 = Keypair::new();
    let profile2 = Keypair::new();
    let game = Keypair::new();

    let (sig, result) = TransactionBuilder::new(&funder)
        .signed_instructions(create_profile(
            guard.program_id(),
            &authority1,
            &profile1,
            &funder,
        ))
        .signed_instructions(create_profile(
            guard.program_id(),
            &authority2,
            &profile2,
            &funder,
        ))
        .signed_instructions(create_game(
            guard.program_id(),
            &authority1,
            profile1.pubkey(),
            &game,
            &funder,
            &funder,
            Some(profile2.pubkey()),
            CreateGameClientData {
                creator_player: Player::One,
                wager: LAMPORTS_PER_SOL,
                turn_length: 60 * 60 * 24, // 1 day
            },
        ))
        .signed_instructions(join_game(
            guard.program_id(),
            &authority2,
            profile2.pubkey(),
            game.pubkey(),
            GameSignerSeeder {
                game: game.pubkey(),
            }
            .find_address(&guard.program_id())
            .1,
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
        <TutorialAccounts as AccountListItem<Game>>::compressed_discriminant()
    );
    let game: Game = Game::deserialize(&mut data)?;
    assert!(game.last_turn > 0);
    let mut expected = Game::new(
        &profile1.pubkey(),
        Player::One,
        game.signer_bump,
        LAMPORTS_PER_SOL,
        60 * 60 * 24,
    );
    expected.player2 = profile2.pubkey();
    expected.last_turn = game.last_turn;

    assert_eq!(game, expected);

    guard.drop_self().await;
    Ok(())
}
```

This test should execute without error. To run it you can either run `cargo test --features client` or `cargo test --features client --test all_tests instructions::join_game::join_game_test -- --exact` to run only this test.
