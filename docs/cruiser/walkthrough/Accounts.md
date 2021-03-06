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

mod game;
mod player_profile;

pub use game::*;
pub use player_profile::*;
```

## Game Board

Next we'll add in the game board account. This isn't the most efficient way to store the data, but it's a good starting point.

### `src/accounts/game.rs`
```rust
use cruiser::prelude::*;

/// The game board.
#[derive(Debug, BorshDeserialize, BorshSerialize, Eq, PartialEq, OnChainSize)]
pub struct Game {
    /// The version of this account. Should always add this for future proofing.
    /// Should be 0 until a new version is added.
    pub version: u8,
    /// The first player's profile.
    pub player1: Pubkey,
    /// The second player's profile.
    pub player2: Pubkey,
    /// Which player was the creator and entitled to the rent.
    pub creator: Player,
    /// The player to take the next move.
    pub next_play: Player,
    /// The bump of the signer that holds the wager.
    pub signer_bump: u8,
    /// The wager per player in lamports.
    pub wager: u64,
    /// The amount of time in seconds to play a given turn before forfeiting.
    /// 0 means no time limit.
    pub turn_length: UnixTimestamp,
    /// The last turn timestamp. If 0 game is not started.
    pub last_turn: UnixTimestamp,
    /// The last move a player did. If `[3,3]` last move is game start.
    pub last_move: [u8; 2],
    /// The current board. In RC format.
    pub board: Board<Board<Space>>,
}

impl Game {
    /// Creates a new game board.
    pub fn new(
        player_profile: &Pubkey,
        player: Player,
        signer_bump: u8,
        wager: u64,
        turn_length: UnixTimestamp,
    ) -> Self {
        Self {
            version: 0,

            player1: if player == Player::One {
                *player_profile
            } else {
                Pubkey::new_from_array([0; 32])
            },
            player2: if player == Player::Two {
                *player_profile
            } else {
                Pubkey::new_from_array([0; 32])
            },
            creator: player,
            next_play: Player::One,
            signer_bump,
            wager,
            turn_length,
            last_turn: 0,
            last_move: [3, 3],
            board: Default::default(),
        }
    }

    /// Tells whether the game has started.
    pub fn is_started(&self) -> bool {
        self.last_turn > 0
    }

    /// Tells whether the other player is valid to join the game.
    pub fn is_valid_other_player(&self, other_player: &Pubkey) -> bool {
        match self.creator {
            Player::One => {
                self.player2 == *other_player || self.player2 == Pubkey::new_from_array([0; 32])
            }
            Player::Two => {
                self.player1 == *other_player || self.player1 == Pubkey::new_from_array([0; 32])
            }
        }
    }
}

/// A player
#[derive(Copy, Clone, Debug, BorshDeserialize, BorshSerialize, Eq, PartialEq, OnChainSize)]
pub enum Player {
    /// Player 1
    One,
    /// Player 2
    Two,
}

/// A space on the game board.
#[derive(Copy, Clone, Debug, BorshDeserialize, BorshSerialize, Eq, PartialEq, OnChainSize)]
pub enum Space {
    /// Player 1's space
    PlayerOne,
    /// Player 2's space
    PlayerTwo,
    /// Empty space
    Empty,
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
#[derive(Copy, Clone, Debug, BorshDeserialize, BorshSerialize, Eq, PartialEq, OnChainSize)]
#[on_chain_size(generics = [where S: OnChainSize])]
pub enum Board<S> {
    /// Board has no winner yet. Board is in RC format.
    Unsolved([[S; 3]; 3]),
    /// Board has a winner
    Solved(Player),
}
impl<S> Default for Board<S>
    where
        S: Default + Copy,
{
    fn default() -> Self {
        Board::Unsolved([[S::default(); 3]; 3])
    }
}
impl<S> Board<S> {
    /// Gets an index of the board if unsolved.
    pub fn get(&self, index: [u8; 2]) -> Option<&S> {
        match self {
            Board::Unsolved(board) => board.get(index[0] as usize)?.get(index[1] as usize),
            Board::Solved(_) => None,
        }
    }

    /// Gets an index mutably of the board if unsolved.
    pub fn get_mut(&mut self, index: [u8; 2]) -> Option<&mut S> {
        match self {
            Board::Unsolved(board) => board.get_mut(index[0] as usize)?.get_mut(index[1] as usize),
            Board::Solved(_) => None,
        }
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
                if is_winner(sub_board, player) {
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
pub fn is_winner(board: &[[impl CurrentWinner + Copy; 3]; 3], last_turn: Player) -> bool {
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
        assert!(is_winner(&board, Player::One));
        let board = [
            [Space::PlayerTwo, Space::PlayerOne, Space::PlayerOne],
            [Space::Empty, Space::PlayerTwo, Space::PlayerTwo],
            [Space::Empty, Space::Empty, Space::PlayerTwo],
        ];
        assert!(is_winner(&board, Player::Two));
        let board = [
            [Space::PlayerTwo, Space::PlayerOne, Space::PlayerOne],
            [Space::Empty, Space::PlayerTwo, Space::PlayerOne],
            [Space::Empty, Space::Empty, Space::PlayerOne],
        ];
        assert!(is_winner(&board, Player::One));
        let board = [
            [Space::PlayerTwo, Space::PlayerOne, Space::PlayerOne],
            [Space::Empty, Space::PlayerTwo, Space::Empty],
            [Space::Empty, Space::Empty, Space::PlayerOne],
        ];
        assert!(!is_winner(&board, Player::One));
        assert!(!is_winner(&board, Player::Two));
    }
}
```

## Player Profile

Next we'll build the player profile. This is for storing a player's stats including [ELO](https://en.wikipedia.org/wiki/Elo_rating_system). Usually you don't want to store historical data unless you have an on-chain use for it, but it's useful for learning how you would. We also won't restrict the number of profiles for a given wallet, it's technically difficult (PDAs don't solve this without running find) and very easy to create a new wallet.

### `src/accounts/player_profile.rs`

```rust
use cruiser::prelude::*;

/// A player's profile.
#[derive(Debug, BorshDeserialize, BorshSerialize, PartialEq, OnChainSize)]
pub struct PlayerProfile {
    /// The key allowed to act for this profile.
    pub authority: Pubkey,
    /// The number of wins this player has.
    pub wins: u64,
    /// The number of losses this player has.
    pub losses: u64,
    /// The number of draws this player has.
    pub draws: u64,
    /// The amount of lamports this player has won.
    pub lamports_won: u64,
    /// The amount of lamports this player has lost.
    pub lamports_lost: u64,
    /// The elo rating of the player.
    pub elo: u64,
}
impl PlayerProfile {
    /// The initial elo for a new profile.
    pub const INITIAL_ELO: u64 = 1200;

    /// Creates a new player profile.
    /// `authority` is a ref to a pubkey because it's more efficient to use a ref on-chain.
    pub fn new(authority: &Pubkey) -> Self {
        Self {
            authority: *authority,
            wins: 0,
            losses: 0,
            draws: 0,
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
pub fn update_elo(elo_a: &mut u64, elo_b: &mut u64, k: f64, a_won: bool) {
    let mut elo_a_float = *elo_a as f64;
    let mut elo_b_float = *elo_b as f64;
    let a_prob = win_probability(elo_a_float, elo_b_float);
    let b_prob = win_probability(elo_b_float, elo_a_float);

    if a_won {
        elo_a_float += k * (1.0 - a_prob);
        elo_b_float += k * (0.0 - b_prob);
    } else {
        elo_a_float += k * (0.0 - a_prob);
        elo_b_float += k * (1.0 - b_prob);
    }

    *elo_a = elo_a_float as u64;
    *elo_b = elo_b_float as u64;
}
```
