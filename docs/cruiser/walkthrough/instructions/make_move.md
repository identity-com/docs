---
sidebar_position: 5
title: Make Move
---

# Make Move

Our final instruction will be the culmination of all we've learned. We'll be making the actual game moves. This instruction is more algorithm heavy but contains a bit of everything but initialization. Handling ties is out of scope for this tutorial.

It will handle the player making a move and if they win it will close the game transferring the full wager to them.

## Definition

```rust
use crate::accounts::{CurrentWinner, Player, Space};
use crate::pda::GameSignerSeeder;
use crate::{Game, PlayerProfile, TutorialAccounts};
use cruiser::prelude::*;

/// Makes a move on the board and handles wins.
#[derive(Debug)]
pub enum MakeMove {}

impl<AI> Instruction<AI> for MakeMove {
    type Accounts = MakeMoveAccounts<AI>;
    type Data = MakeMoveData;
    type ReturnType = ();
}

/// Accounts for [`MakeMove`]
#[derive(AccountArgument, Debug)]
#[account_argument(account_info = AI, generics = [where AI: AccountInfo])]
#[validate(data = (mov: MakeMoveData), custom = is_valid_move(&*self.game, &mov))]
pub struct MakeMoveAccounts<AI> {
    /// The authority for the player
    #[validate(signer)]
    pub authority: AI,
    /// The player to make a move for
    #[validate(writable, custom = &self.player_profile.authority == self.authority.key())]
    pub player_profile: DataAccount<AI, TutorialAccounts, PlayerProfile>,
    /// The game to make a move on.
    #[validate(
        writable,
        custom = self.game.is_started(),
        custom = match self.game.next_play {
            Player::One => &self.game.player1 == self.player_profile.info().key(),
            Player::Two => &self.game.player2 == self.player_profile.info().key(),
        },
    )]
    pub game: Box<DataAccount<AI, TutorialAccounts, Game>>,
    /// The signer for the game.
    /// Only needed if will win the game.
    #[validate(
        writable(IfSome),
        data = IfSomeArg((GameSignerSeeder{ game: *self.game.info().key() }, self.game.signer_bump)),
    )]
    pub game_signer: Option<Seeds<AI, GameSignerSeeder>>,
    /// The other player's profile.
    /// Only needed if will win the game.
    #[validate(
        writable(IfSome),
        custom = match (self.other_profile.as_ref(), self.game.next_play) {
            (Some(profile), Player::One) => &self.game.player2 == profile.info().key(),
            (Some(profile), Player::Two) => &self.game.player1 == profile.info().key(),
            _ => true,
        },
    )]
    pub other_profile: Option<DataAccount<AI, TutorialAccounts, PlayerProfile>>,
    /// Only needed if will win the game.
    #[validate(writable(IfSome))]
    pub funds_to: Option<AI>,
    /// Only needed if will win the game.
    pub system_program: Option<SystemProgram<AI>>,
}

/// Data for [`MakeMove`]
#[derive(Clone, Debug, BorshSerialize, BorshDeserialize)]
pub struct MakeMoveData {
    /// Index on the big board
    pub big_board: [u8; 2],
    /// Index on the small board
    pub small_board: [u8; 2],
}

fn is_valid_move(game: &Game, mov: &MakeMoveData) -> bool {
    // Verify valid with last move
    (game.last_move == [3, 3]
        || game.board.get(game.last_move).map_or(false, |board| {
            board.current_winner().is_some() || mov.big_board == game.last_move
        }))
        && game
            .board
            .get(mov.big_board)
            .and_then(|board| {
                board
                    .get(mov.small_board)
                    .map(|space| space == &Space::Empty)
            })
            .unwrap_or(false)
}
```

## Processor

```rust
#[cfg(feature = "processor")]
mod processor {
    use super::*;
    use crate::accounts::CurrentWinner;
    use cruiser::solana_program::clock::Clock;

    impl<'a, AI> InstructionProcessor<AI, MakeMove> for MakeMove
    where
        AI: ToSolanaAccountInfo<'a>,
    {
        type FromAccountsData = ();
        type ValidateData = MakeMoveData;
        type InstructionData = MakeMoveData;

        fn data_to_instruction_arg(
            data: <MakeMove as Instruction<AI>>::Data,
        ) -> CruiserResult<(
            Self::FromAccountsData,
            Self::ValidateData,
            Self::InstructionData,
        )> {
            Ok(((), data.clone(), data))
        }

        fn process(
            _program_id: &Pubkey,
            data: Self::InstructionData,
            accounts: &mut <MakeMove as Instruction<AI>>::Accounts,
        ) -> CruiserResult<<MakeMove as Instruction<AI>>::ReturnType> {
            let next_play = accounts.game.next_play;
            accounts
                .game
                .board
                .make_move(next_play, (data.big_board, (data.small_board, ())))?;

            if accounts.game.board.current_winner() == Some(accounts.game.next_play) {
                let game_signer = accounts.game_signer.as_mut().ok_or(GenericError::Custom {
                    error: "no game_signer on win".to_string(),
                })?;
                let other_profile =
                    accounts
                        .other_profile
                        .as_mut()
                        .ok_or(GenericError::Custom {
                            error: "no other_profile on win".to_string(),
                        })?;
                let funds_to = accounts.funds_to.as_ref().ok_or(GenericError::Custom {
                    error: "no funds_to on win".to_string(),
                })?;
                let system_program =
                    accounts
                        .system_program
                        .as_ref()
                        .ok_or(GenericError::Custom {
                            error: "no system_program on win".to_string(),
                        })?;

                let signer_seeds = game_signer.take_seed_set().unwrap();
                let winnings = *game_signer.lamports();

                system_program.transfer(
                    CPIChecked,
                    game_signer.info(),
                    funds_to,
                    winnings,
                    [&signer_seeds],
                )?;

                // Burn game data
                accounts.game.player1 = SystemProgram::<()>::KEY;
                accounts.game.player2 = SystemProgram::<()>::KEY;

                // Update profiles
                accounts.player_profile.wins.saturating_add_assign(1);
                other_profile.losses.saturating_add_assign(1);

                accounts
                    .player_profile
                    .lamports_won
                    .saturating_add_assign(winnings);
                other_profile.lamports_lost.saturating_add_assign(winnings);

                // Close game
                let mut game_lamports = game_signer.lamports_mut();
                *funds_to.lamports_mut() += *game_lamports;
                *game_lamports = 0;
            } else {
                accounts.game.next_play = match accounts.game.next_play {
                    Player::One => Player::Two,
                    Player::Two => Player::One,
                };

                accounts.game.last_turn = Clock::get()?.unix_timestamp;
                accounts.game.last_move = data.small_board;
            }

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
    /// Forfeits another player from a game
    #[instruction(instruction_type = instructions::ForfeitGame)]
    ForfeitGame,
    /// Makes a move.
    #[instruction(instruction_type = instructions::MakeMove)]
    MakeMove,
}
```

## CPI

```rust
#[cfg(feature = "cpi")]
pub use cpi::*;

/// CPI for [`MakeMove`]
#[cfg(feature = "cpi")]
mod cpi {
use super::*;
use crate::TutorialInstructions;

    /// Makes a move
    #[derive(Debug)]
    pub struct MakeMoveCPI<'a, AI, const N: usize> {
        accounts: [MaybeOwned<'a, AI>; N],
        data: Vec<u8>,
    }
    impl<'a, AI> MakeMoveCPI<'a, AI, 3> {
        /// Makes a move that won't win the game
        pub fn new(
            authority: impl Into<MaybeOwned<'a, AI>>,
            player_profile: impl Into<MaybeOwned<'a, AI>>,
            game: impl Into<MaybeOwned<'a, AI>>,
            make_move_data: MakeMoveData,
        ) -> CruiserResult<MakeMoveCPI<'a, AI, 3>> {
            let mut data = Vec::new();
            <TutorialInstructions as InstructionListItem<MakeMove>>::discriminant_compressed()
                .serialize(&mut data)?;
            make_move_data.serialize(&mut data)?;
            Ok(MakeMoveCPI {
                accounts: [authority.into(), player_profile.into(), game.into()],
                data,
            })
        }
    }
    impl<'a, AI> MakeMoveCPI<'a, AI, 7> {
        /// Makes a move that will win the game
        #[allow(clippy::too_many_arguments)]
        pub fn new_win(
            authority: impl Into<MaybeOwned<'a, AI>>,
            player_profile: impl Into<MaybeOwned<'a, AI>>,
            game: impl Into<MaybeOwned<'a, AI>>,
            game_signer: impl Into<MaybeOwned<'a, AI>>,
            other_profile: impl Into<MaybeOwned<'a, AI>>,
            funds_to: impl Into<MaybeOwned<'a, AI>>,
            system_program: impl Into<MaybeOwned<'a, AI>>,
            make_move_data: MakeMoveData,
        ) -> CruiserResult<MakeMoveCPI<'a, AI, 7>> {
            let mut data = Vec::new();
            <TutorialInstructions as InstructionListItem<MakeMove>>::discriminant_compressed()
                .serialize(&mut data)?;
            make_move_data.serialize(&mut data)?;
            Ok(MakeMoveCPI {
                accounts: [
                    authority.into(),
                    player_profile.into(),
                    game.into(),
                    game_signer.into(),
                    other_profile.into(),
                    funds_to.into(),
                    system_program.into(),
                ],
                data,
            })
        }
    }

    impl<'a, AI> CPIClientStatic<'a, 4> for MakeMoveCPI<'a, AI, 3>
    where
        AI: ToSolanaAccountMeta,
    {
        type InstructionList = TutorialInstructions;
        type Instruction = MakeMove;
        type AccountInfo = AI;

        fn instruction(
            self,
            program_account: impl Into<MaybeOwned<'a, Self::AccountInfo>>,
        ) -> InstructionAndAccounts<[MaybeOwned<'a, Self::AccountInfo>; 4]> {
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
                    program_account,
                ],
            }
        }
    }

    impl<'a, AI> CPIClientStatic<'a, 8> for MakeMoveCPI<'a, AI, 7>
    where
        AI: ToSolanaAccountMeta,
    {
        type InstructionList = TutorialInstructions;
        type Instruction = MakeMove;
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
}
```

## Client

```rust
#[cfg(feature = "client")]
pub use client::*;

/// Client for [`MakeMove`]
#[cfg(feature = "client")]
mod client {
    use super::*;

    /// Makes a non-winning move
    pub fn make_move<'a>(
        program_id: Pubkey,
        authority: impl Into<HashedSigner<'a>>,
        player_profile: Pubkey,
        game: Pubkey,
        move_data: MakeMoveData,
    ) -> InstructionSet<'a> {
        let authority = authority.into();
        InstructionSet {
            instructions: vec![
                MakeMoveCPI::new(
                    SolanaAccountMeta::new_readonly(authority.pubkey(), true),
                    SolanaAccountMeta::new_readonly(player_profile, false),
                    SolanaAccountMeta::new(game, false),
                    move_data,
                )
                    .unwrap()
                    .instruction(SolanaAccountMeta::new_readonly(program_id, true))
                    .instruction,
            ],
            signers: [authority].into_iter().collect(),
        }
    }

    /// Makes a winning move
    #[allow(clippy::too_many_arguments)]
    pub fn make_winning_move<'a>(
        program_id: Pubkey,
        authority: impl Into<HashedSigner<'a>>,
        player_profile: Pubkey,
        game: Pubkey,
        game_signer_bump: u8,
        other_profile: Pubkey,
        funds_to: Pubkey,
        move_data: MakeMoveData,
    ) -> InstructionSet<'a> {
        let authority = authority.into();
        InstructionSet {
            instructions: vec![
                MakeMoveCPI::new_win(
                    SolanaAccountMeta::new_readonly(authority.pubkey(), true),
                    SolanaAccountMeta::new(player_profile, false),
                    SolanaAccountMeta::new(game, false),
                    SolanaAccountMeta::new(
                        GameSignerSeeder { game }
                            .create_address(&program_id, game_signer_bump)
                            .unwrap(),
                        false,
                    ),
                    SolanaAccountMeta::new(other_profile, false),
                    SolanaAccountMeta::new(funds_to, false),
                    SolanaAccountMeta::new_readonly(SystemProgram::<()>::KEY, false),
                    move_data,
                )
                    .unwrap()
                    .instruction(SolanaAccountMeta::new_readonly(program_id, true))
                    .instruction,
            ],
            signers: [authority].into_iter().collect(),
        }
    }
}
```

## Tests

Add the following to your `tests/instructions/mod.rs`:

```rust
mod make_move;
```

Then we create `tests/instructions/make_move.rs`:

```rust
use crate::instructions::setup_validator;
use cruiser::prelude::*;
use cruiser_tutorial::accounts::{Game, Player, Space};
use cruiser_tutorial::instructions::{
    create_game, create_profile, join_game, make_move, CreateGameClientData, MakeMoveData,
};
use cruiser_tutorial::pda::GameSignerSeeder;
use cruiser_tutorial::TutorialAccounts;
use std::error::Error;
use std::time::Duration;

#[tokio::test]
async fn make_move_test() -> Result<(), Box<dyn Error>> {
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
        .signed_instructions(make_move(
            guard.program_id(),
            &authority1,
            profile1.pubkey(),
            game.pubkey(),
            MakeMoveData {
                big_board: [0, 0],
                small_board: [0, 0],
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
    expected.next_play = Player::Two;
    expected.last_move = [0, 0];
    *expected
        .board
        .get_mut([0, 0])
        .unwrap()
        .get_mut([0, 0])
        .unwrap() = Space::PlayerOne;

    assert_eq!(game, expected);

    guard.drop_self().await;
    Ok(())
}
```

This test should execute without error. To run it you can either run `cargo test --features client` or `cargo test --features client --test all_tests instructions::make_move::make_move_test -- --exact` to run only this test.

## Finished

After this our program is complete on-chain!
