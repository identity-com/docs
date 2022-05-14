---
sidebar_position: 5
---

# Further Topics

This tutorial is not every feature you could want in an Ultimate Tic-Tac-Toe game. Because of that there is quite a bit of room for improvement. These topics are great for further exploration and learning. Here's some ideas to kickstart your own additions to the game:

1. Change authority on profiles
2. Negative testing: Testing errors that should be caught
   * ex. Signer did not sign
3. Use custom `AccountArguments` to take some repetitiveness out of accounts
   * `authority` + `player_profile` + `game`
   * `game` + `game_signer`
4. Handle tie games (this is out of scope for this tutorial)
5. Token wagers
6. Fees (take a percent of the wager or a fixed amount)
7. Allow queueing of moves
8. AI only version where the AI code must run on-chain
   * Could use return types for persistent AI state?
9. Early tie detection
10. 3rd party wagers
11. Data size optimizations (only need 18 bits for a mini board)
12. [Ultimate-Ultimate Tic-Tac-Toe](https://i.redd.it/iecrceevdlhz.jpg) (open rule questions here)
13. [5d Ultimate Tic-Tac-Toe with Multiverse Time Travel](https://store.steampowered.com/app/1349230/5D_Chess_With_Multiverse_Time_Travel/) 
    * I have no idea how this would work since you don't have pieces to move, but it sounds really cool
    * If you are insane enough to do this then... good luck...

## UI

There's also the topic of making a UI for the game so users can actually play. With this design there are a lot of features that can be made, such as elo based matchmaking or tournament brackets with a tournament bracket program.

This may be explored in a later tutorial but for now it's an exercise for the reader.
