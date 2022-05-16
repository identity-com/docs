---
sidebar_position: 4
title: Forfeit Game
---

# Forfeit Game

Our next instruction will be forfeiting an abandoned game. This can be called by a player when it has been the opposing player's turn for longer than `Game::turn_length`. This makes sure players can't lock up the wagers by not playing. Players can also ignore this if they want by setting `Game::turn_length` to `0`.

The main new topic for this is closing accounts which is done on solana by draining all of their lamports. In `cruiser` this is easily done by wrapping the account with `CloseAccount`. 

When closing an account make sure the data is put into a state that makes the account unusable because unless you do instruction checking (not suggested for composability) a malicious user could add an instruction that transfers lamports to the account that was attempted to be closed or otherwise use it in the same transaction. The reason is that accounts are cleaned up at the end of the transaction so this could be an attack vector.

## Definition

```rust
use crate::accounts::Player;
use crate::pda::GameSignerSeeder;
use crate::{Game, PlayerProfile, TutorialAccounts};
use cruiser::prelude::*;
use cruiser::solana_program::clock::Clock;

/// Causes another player to forfeit the game if they run out of time for their turn.
#[derive(Debug)]
pub enum ForfeitGame {}

impl<AI> Instruction<AI> for ForfeitGame {
    type Accounts = ForfeitGameAccounts<AI>;
    type Data = ForfeitGameData;
    type ReturnType = ();
}

/// Accounts for [`ForfeitGame`]
#[derive(AccountArgument, Debug)]
#[account_argument(account_info = AI, generics = [where AI: AccountInfo])]
#[validate(generics = [<'a> where AI: ToSolanaAccountInfo<'a>])]
pub struct ForfeitGameAccounts<AI> {
    /// The authority of the player calling the forfeit.
    #[validate(signer)]
    pub authority: AI,
    /// The profile of the calling player.
    #[validate(custom = &self.player_profile.authority == self.authority.key())]
    pub player_profile: DataAccount<AI, TutorialAccounts, PlayerProfile>,
    /// The other player's profile.
    pub other_profile: DataAccount<AI, TutorialAccounts, PlayerProfile>,
    /// The game the other player has forfeited.
    #[validate(
        custom = self.game.turn_length == 0
            || self.game.last_turn.saturating_add(self.game.turn_length) < Clock::get()?.unix_timestamp,
        custom = match self.game.next_play {
            Player::One => self.player_profile.info().key() == &self.game.player2,
            Player::Two => self.player_profile.info().key() == &self.game.player1,
        },
        custom = match self.game.next_play {
            Player::One => self.other_profile.info().key() == &self.game.player1,
            Player::Two => self.other_profile.info().key() == &self.game.player2,
        },
    )]
    pub game: Box<CloseAccount<AI, DataAccount<AI, TutorialAccounts, Game>>>,
    /// The game's signer.
    #[validate(writable, data = (GameSignerSeeder{ game: *self.game.info().key() }, self.game.signer_bump))]
    pub game_signer: Seeds<AI, GameSignerSeeder>,
    /// Where the funds should go to.
    #[validate(writable)]
    pub funds_to: AI,
    /// The system program
    pub system_program: SystemProgram<AI>,
}

/// Data for [`ForfeitGame`]
#[derive(Clone, Debug, BorshSerialize, BorshDeserialize)]
pub struct ForfeitGameData {}
```

Here we can see the use of `CloseAccount` on `game`.

## Processor

```rust
#[cfg(feature = "processor")]
mod processor {
    use super::*;
    use crate::accounts::update_elo;
    use std::iter::once;

    impl<'a, AI> InstructionProcessor<AI, ForfeitGame> for ForfeitGame
    where
        AI: ToSolanaAccountInfo<'a>,
    {
        type FromAccountsData = ();
        type ValidateData = ();
        type InstructionData = ();

        fn data_to_instruction_arg(
            _data: <ForfeitGame as Instruction<AI>>::Data,
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
            accounts: &mut <ForfeitGame as Instruction<AI>>::Accounts,
        ) -> CruiserResult<<ForfeitGame as Instruction<AI>>::ReturnType> {
            // Get the seeds out of the signer account
            let signer_seeds = accounts.game_signer.take_seed_set().unwrap();

            msg!("Transferring");
            // Need to separate this out because it will cause a borrow error if done in-line.
            // Can also be avoided with `CPIUnchecked`
            let transfer_amount = *accounts.game_signer.lamports();
            // Transfer wager to forfeit-eer
            accounts.system_program.transfer(
                CPIChecked,
                accounts.game_signer.info(),
                &accounts.funds_to,
                transfer_amount,
                once(&signer_seeds),
            )?;

            msg!("Setting fields");
            // Zero out the players so the game is dead.
            // We will close the game but this prevents it from being re-opened in the same transaction and still being useful.
            accounts.game.player1 = SystemProgram::<()>::KEY;
            accounts.game.player2 = SystemProgram::<()>::KEY;

            // Set who gets the funds on close
            accounts.game.set_fundee(accounts.funds_to.clone());

            accounts
                .player_profile
                .lamports_won
                .saturating_add_assign(accounts.game.wager);
            accounts.player_profile.wins.saturating_add_assign(1);

            accounts
                .other_profile
                .lamports_lost
                .saturating_add_assign(accounts.game.wager);
            accounts.other_profile.losses.saturating_add_assign(1);

            update_elo(
                &mut accounts.player_profile.elo,
                &mut accounts.other_profile.elo,
                50.0, // 50 for forfeits to discourage them
                true,
            );

            Ok(())
        }
    }
}
```

Here we can see that the use of `CloseAccount` requires a call to `set_fundee` to tell where the funds go to on close. We also zero out the player accounts to burn the data in the account.

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
}
```

## CPI

```rust
#[cfg(feature = "cpi")]
pub use cpi::*;

/// CPI for [`ForfeitGame`]
#[cfg(feature = "cpi")]
mod cpi {
    use super::*;
    use crate::TutorialInstructions;

    /// Forfiets another player from a game.
    #[derive(Debug)]
    pub struct ForfeitGameCPI<'a, AI> {
        accounts: [MaybeOwned<'a, AI>; 7],
        data: Vec<u8>,
    }
    impl<'a, AI> ForfeitGameCPI<'a, AI> {
        /// Forfiets another player from a game.
        pub fn new(
            authority: impl Into<MaybeOwned<'a, AI>>,
            player_profile: impl Into<MaybeOwned<'a, AI>>,
            other_profile: impl Into<MaybeOwned<'a, AI>>,
            game: impl Into<MaybeOwned<'a, AI>>,
            game_signer: impl Into<MaybeOwned<'a, AI>>,
            funds_to: impl Into<MaybeOwned<'a, AI>>,
            system_program: impl Into<MaybeOwned<'a, AI>>,
        ) -> CruiserResult<Self> {
            let mut data = Vec::new();
            <TutorialInstructions as InstructionListItem<ForfeitGame>>::discriminant_compressed()
                .serialize(&mut data)?;
            ForfeitGameData {}.serialize(&mut data)?;
            Ok(Self {
                accounts: [
                    authority.into(),
                    player_profile.into(),
                    other_profile.into(),
                    game.into(),
                    game_signer.into(),
                    funds_to.into(),
                    system_program.into(),
                ],
                data,
            })
        }
    }

    impl<'a, AI> CPIClientStatic<'a, 8> for ForfeitGameCPI<'a, AI>
    where
        AI: ToSolanaAccountMeta,
    {
        type InstructionList = TutorialInstructions;
        type Instruction = ForfeitGame;
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

/// Client for [`ForfeitGame`]
#[cfg(feature = "client")]
mod client {
    use super::*;

    /// Forfeits another player from a game.
    pub fn forfeit_game<'a>(
        program_id: Pubkey,
        authority: impl Into<HashedSigner<'a>>,
        player_profile: Pubkey,
        other_profile: Pubkey,
        game: Pubkey,
        game_signer_bump: u8,
        funds_to: Pubkey,
    ) -> InstructionSet<'a> {
        let authority = authority.into();
        InstructionSet {
            instructions: vec![
                ForfeitGameCPI::new(
                    SolanaAccountMeta::new_readonly(authority.pubkey(), true),
                    SolanaAccountMeta::new(player_profile, false),
                    SolanaAccountMeta::new(other_profile, false),
                    SolanaAccountMeta::new(game, false),
                    SolanaAccountMeta::new(
                        GameSignerSeeder { game }
                            .create_address(&program_id, game_signer_bump)
                            .unwrap(),
                        false,
                    ),
                    SolanaAccountMeta::new(funds_to, false),
                    SolanaAccountMeta::new_readonly(SystemProgram::<()>::KEY, false),
                )
                .unwrap()
                .instruction(SolanaAccountMeta::new_readonly(program_id, false))
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
mod forfeit_game;
```

Then we create `tests/instructions/forfeit_game.rs`:

```rust
use crate::instructions::setup_validator;
use cruiser::prelude::*;
use cruiser_tutorial::accounts::Player;
use cruiser_tutorial::instructions::*;
use cruiser_tutorial::pda::GameSignerSeeder;
use std::error::Error;
use std::time::Duration;
use tokio::time::sleep;

#[tokio::test]
async fn forfeit_game_test() -> Result<(), Box<dyn Error>> {
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
    let game_signer_bump = GameSignerSeeder {
        game: game.pubkey(),
    }
    .find_address(&guard.program_id())
    .1;

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
                turn_length: 1, // 1 second
            },
        ))
        .signed_instructions(join_game(
            guard.program_id(),
            &authority2,
            profile2.pubkey(),
            game.pubkey(),
            game_signer_bump,
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

    // Wait for game to timeout
    // This value may need to be adjusted to be longer, we are working on very small timescales
    sleep(Duration::from_millis(2000)).await;

    let receiver = Keypair::new().pubkey();

    let (sig, result) = TransactionBuilder::new(&funder)
        .signed_instructions(forfeit_game(
            guard.program_id(),
            &authority2,
            profile2.pubkey(),
            profile1.pubkey(),
            game.pubkey(),
            game_signer_bump,
            receiver,
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
            Duration::from_millis(501),
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

    let accounts = rpc
        .get_multiple_accounts_with_commitment(
            &[game.pubkey(), receiver],
            CommitmentConfig::confirmed(),
        )
        .await?
        .value;
    if let Some(game) = &accounts[0] {
        assert_eq!(game.lamports, 0);
        assert_eq!(game.owner, SystemProgram::<()>::KEY);
    }
    let receiver = accounts[1].as_ref().unwrap();
    assert!(receiver.lamports > LAMPORTS_PER_SOL * 2);

    guard.drop_self().await;
    Ok(())
}
```

This test should execute without error. To run it you can either run `cargo test --features client` or `cargo test --features client --test all_tests instructions::forfeit_game::forfeit_game_test -- --exact` to run only this test.
