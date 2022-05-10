---
sidebar_position: 3
---

# Accounts

The first step in designing accounts for a Solana program is defining what you want the program to do. 
In our case we are going to build [Ultimate Tic-Tac-Toe](https://mathwithbaddrawings.com/2013/06/16/ultimate-tic-tac-toe/).

For this design we will need 2 accounts, one for the game board and one for the player profile. Each of these accounts will get its own file within the `src/accounts` directory.

## `accounts` mod

First we'll add in the `accounts` module. This requires we add the following to the top of `src/lib.rs`:

```rust 
pub mod accounts;
```

### `src/accounts/mod.rs`

```rust
//! Accounts for the program.

mod game_board;
mod player_profile;

pub use game_board::*;
pub use player_profile::*;
```

## Game Board

Next we'll add in the game board account. This isn't the most efficient way to store the data, but it's a good starting point.

### `src/accounts/game_board.rs`
```rust
use cruiser::prelude::*;

/// The game board.
#[derive(Debug, BorshDeserialize, BorshSerialize)]
pub struct GameBoard {
    /// The version of this account. Should always add this for future proofing.
    /// Should be 0 until a new version is added.
    pub version: u8,
    /// The first player's profile.
    pub player1: Pubkey,
    /// The second player's profile.
    pub player2: Pubkey,
    /// The player to take the next move.
    pub next_play: Player,
    /// The bump of the signer that holds the wager.
    pub signer_bump: u8,
    /// The wager per player in lamports.
    pub wager: u64,
    /// The current board. In RC format.
    pub board: Board<Board<Space>>,
}
// This helps us tell the size of the struct in bytes.
// Eventually this will be derivable.
impl OnChainSize for GameBoard {
    const ON_CHAIN_SIZE: usize = u8::ON_CHAIN_SIZE
        + Pubkey::ON_CHAIN_SIZE * 2
        + Player::ON_CHAIN_SIZE
        + u8::ON_CHAIN_SIZE
        + u64::ON_CHAIN_SIZE
        + Board::<Board<Space>>::ON_CHAIN_SIZE;
}

/// A player
#[derive(Copy, Clone, Debug, BorshDeserialize, BorshSerialize, Eq, PartialEq)]
pub enum Player {
    /// Player 1
    One,
    /// Player 2
    Two,
}
impl OnChainSize for Player {
    const ON_CHAIN_SIZE: usize = 1;
}

/// A space on the game board.
#[derive(Copy, Clone, Debug, BorshDeserialize, BorshSerialize, Eq, PartialEq)]
pub enum Space {
    /// Player 1's space
    PlayerOne,
    /// Player 2's space
    PlayerTwo,
    /// Empty space
    Empty,
}
impl OnChainSize for Space {
    // The size of an enum in borsh is its discriminant which is a u8.
    const ON_CHAIN_SIZE: usize = 1;
}
impl From<Player> for Space {
    fn from(player: Player) -> Self {
        match player {
            Player::One => Space::PlayerOne,
            Player::Two => Space::PlayerTwo,
        }
    }
}
impl Default for Space {
    fn default() -> Self {
        Space::Empty
    }
}

/// A sub-board. We use a generic for if we want to go crazy and add sub-sub boards!
#[derive(Copy, Clone, Debug, BorshDeserialize, BorshSerialize, Eq, PartialEq)]
pub enum Board<S> {
    /// Board has no winner yet. Board is in RC format.
    Unsolved([[S; 3]; 3]),
    /// Board has a winner
    Solved(Player),
}
impl<S> OnChainSize for Board<S>
    where
        S: OnChainSize,
{
    const ON_CHAIN_SIZE: usize = 1 + S::ON_CHAIN_SIZE * 3 * 3;
}
impl<S> Default for Board<S>
    where
        S: Default + Copy,
{
    fn default() -> Self {
        Board::Unsolved([[S::default(); 3]; 3])
    }
}

/// This trait lets us use the same logic for checking winners on the sub-boards and main board.
pub trait CurrentWinner {
    /// The index used to make a move.
    type Index;

    /// Gets the current player on the space.
    fn current_winner(&self) -> Option<Player>;

    /// Solves the current board to see if there is a winner.
    fn make_move(&mut self, player: Player, index: Self::Index) -> CruiserResult<()>;
}
impl CurrentWinner for Space {
    // A space is the lowest level and can't be further indexed.
    type Index = ();

    fn current_winner(&self) -> Option<Player> {
        match self {
            Space::PlayerOne => Some(Player::One),
            Space::PlayerTwo => Some(Player::Two),
            Space::Empty => None,
        }
    }

    fn make_move(&mut self, player: Player, _index: ()) -> CruiserResult<()> {
        *self = player.into();
        Ok(())
    }
}
impl<S> CurrentWinner for Board<S>
    where
        S: CurrentWinner + Copy,
{
    /// We set the indexer to be our index + the sub-board index.
    type Index = ([u8; 2], S::Index);

    fn current_winner(&self) -> Option<Player> {
        match self {
            Board::Unsolved(_) => None,
            Board::Solved(player) => Some(*player),
        }
    }

    fn make_move(&mut self, player: Player, index: ([u8; 2], S::Index)) -> CruiserResult<()> {
        let (index, sub_index) = index;
        match self {
            Board::Unsolved(sub_board) => {
                // We make a move on the sub board.
                sub_board[index[0] as usize][index[1] as usize].make_move(player, sub_index)?;
                // Now we check if we are solved.
                if get_winner(sub_board, player) {
                    *self = Board::Solved(player);
                }
                Ok(())
            }
            Board::Solved(_) => {
                // Cannot make a move on a solved board.
                // We call `into` here to turn a generic error into the even more general `CruiserError`.
                // You would do the same with a custom error type.
                Err(GenericError::Custom {
                    error: "Cannot make move on solved board".to_string(),
                }
                    .into())
            }
        }
    }
}

/// Gets the winner of a board. This could be a sub-board or the main board.
pub fn get_winner(board: &[[impl CurrentWinner + Copy; 3]; 3], last_turn: Player) -> bool {
    // Check rows
    if board.iter().any(|row| {
        row.iter()
            .map(CurrentWinner::current_winner)
            .all(|winner| winner.map(|winner| winner == last_turn).unwrap_or(false))
    }) {
        return true;
    }

    // Check columns
    'outer: for col in 0..board[0].len() {
        for row in board {
            if !matches!(row[col].current_winner(), Some(player) if player == last_turn) {
                continue 'outer;
            }
        }
        return true;
    }

    // Check diagonals
    let mut diagonal1 = 0;
    let mut diagonal2 = 0;
    for index in 0..board.len() {
        if matches!(board[index][index].current_winner(), Some(player) if player == last_turn) {
            diagonal1 += 1;
        }
        if matches!(
            board[index][board.len() - index - 1].current_winner(),
            Some(player) if player == last_turn
        ) {
            diagonal2 += 1;
        }
    }
    if diagonal1 == board.len() || diagonal2 == board.len() {
        return true;
    }

    false
}

#[cfg(test)]
mod test {
    use super::*;

    /// Simple test for our winner logic.
    #[test]
    fn test_get_winner() {
        let board = [
            [Space::PlayerOne, Space::PlayerOne, Space::PlayerOne],
            [Space::Empty, Space::PlayerTwo, Space::PlayerTwo],
            [Space::Empty, Space::Empty, Space::Empty],
        ];
        assert!(get_winner(&board, Player::One));
        let board = [
            [Space::PlayerTwo, Space::PlayerOne, Space::PlayerOne],
            [Space::Empty, Space::PlayerTwo, Space::PlayerTwo],
            [Space::Empty, Space::Empty, Space::PlayerTwo],
        ];
        assert!(get_winner(&board, Player::Two));
        let board = [
            [Space::PlayerTwo, Space::PlayerOne, Space::PlayerOne],
            [Space::Empty, Space::PlayerTwo, Space::PlayerOne],
            [Space::Empty, Space::Empty, Space::PlayerOne],
        ];
        assert!(get_winner(&board, Player::One));
        let board = [
            [Space::PlayerTwo, Space::PlayerOne, Space::PlayerOne],
            [Space::Empty, Space::PlayerTwo, Space::Empty],
            [Space::Empty, Space::Empty, Space::PlayerOne],
        ];
        assert!(!get_winner(&board, Player::One));
        assert!(!get_winner(&board, Player::Two));
    }
}
```

## Player Profile

Next we'll build the player profile. This is for storing a player's stats including [ELO](https://en.wikipedia.org/wiki/Elo_rating_system). Usually you don't want to store historical data unless you have an on-chain use for it, but it's useful for learning how you would. We also won't restrict the number of profiles for a given wallet, it's technically difficult (PDAs don't solve this without running find) and very easy to create a new wallet.

### `src/accounts/player_profile.rs`

```rust
use cruiser::prelude::*;

/// A player's profile.
#[derive(Debug, BorshDeserialize, BorshSerialize)]
pub struct PlayerProfile {
    /// The key allowed to act for this profile.
    pub authority: Pubkey,
    /// The number of wins this player has.
    pub wins: u64,
    /// The number of losses this player has.
    pub loses: u64,
    /// The number of draws this player has.
    pub draws: u64,
    /// The number of forfeits this player has.
    pub forfeits: u64,
    /// The amount of lamports this player has won.
    pub lamports_won: u64,
    /// The amount of lamports this player has lost.
    pub lamports_lost: u64,
    /// The elo rating of the player.
    /// Note: floats will be truncated to integers by borsh, we are using one here because it saves us some casting.
    pub elo: f64,
}
impl OnChainSize for PlayerProfile {
    const ON_CHAIN_SIZE: usize =
        Pubkey::ON_CHAIN_SIZE + u64::ON_CHAIN_SIZE * 6 + f64::ON_CHAIN_SIZE;
}
impl PlayerProfile {
    /// The initial elo for a new profile.
    pub const INITIAL_ELO: f64 = 1200.0;

    /// Creates a new player profile.
    /// `authority` is a ref to a pubkey because it's more efficient to use a ref on-chain.
    pub fn new(authority: &Pubkey) -> Self {
        Self {
            authority: *authority,
            wins: 0,
            loses: 0,
            draws: 0,
            forfeits: 0,
            lamports_won: 0,
            lamports_lost: 0,
            elo: Self::INITIAL_ELO,
        }
    }
}

/// Probability of `elo_a` winning over `elo_b`.
fn win_probability(elo_a: f64, elo_b: f64) -> f64 {
    1.0 / (1.0 + 10.0_f64.powf((elo_b - elo_a) / 400.0))
}

/// Calculates the new elo of players after a game.
pub fn update_elo(elo_a: &mut f64, elo_b: &mut f64, k: f64, a_won: bool) {
    let a_prob = win_probability(*elo_a, *elo_b);
    let b_prob = win_probability(*elo_b, *elo_a);

    if a_won {
        *elo_a += k * (1.0 - a_prob);
        *elo_b += k * (0.0 - b_prob);
    } else {
        *elo_a += k * (0.0 - a_prob);
        *elo_b += k * (1.0 - b_prob);
    }
}
```

## Add to list

Finally we'll add these accounts to our `AccountList`. In `src/lib.rs` we'll update the account list with:

```rust
/// This is the list of accounts used by the program.
///
/// The [`AccountList`] trait defines a list of accounts for use by a program.
/// It is used to make sure no two accounts have the same discriminants.
/// This derive also implements [`AccountListItem`].
/// Both these traits can be manually implemented if you need custom logic.
#[derive(Debug, AccountList)]
pub enum TutorialAccounts {
    /// A game board
    GameBoard(GameBoard),
    /// A player's profile
    PlayerProfile(PlayerProfile),
}
```
