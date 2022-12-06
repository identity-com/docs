---
sidebar_position: 2
---

# How do I start with Gateway Protocl after I installed it?

We have two options once we have installed Gateway Protocol.

1. use of OFF-CHAIN GATEKEEPER: This is a Standard Use Case of creating a Network and having an EXTERNAL Gatekeeper as trusted issuer.

Let's say a particular dApp is in needs to operate KYC checks of users to sell them a particular product, such as alcohol. 

Trusted party such as Socure as a off-chain gatekeeper can provide KYC, Bot Protection, Carbon Utilization, etc. For their services, they can charge a fee to a dApp. When dAPP uses pass operation, Gatekeeper draw funds from dApp's Top-Up Wallet.

Socure Demo: https://zerodayshopping.identity.com

Every time a user wants to use the dApp, they need to pay the fee to the off-chain gatekeeper. The off-chain gatekeeper will then issue a token to the user. The user can then use the token to access the dApp. The off-chain gatekeeper can also revoke the token if the user is not using the dApp anymore.

Each Gatekeeper network will publish and maintain its own network compensation table. The table specifies the prices (for Gatekeepers) and fees (for the network/protocol) associated with each Pass operation within the network.

2. use of ON-CHAIN GATEKEEPER: Here on-chain program is the Gatekeeper / Gatekeeper Network

On some cases, dApp may want to have their own Gatekeeper Network. In this case, they can deploy their own Gatekeeper Network program that acts as a gatekeeper. 

On-chain gatekeeper can be a program that is deployed on the blockchain. The program checks the DID state (One Eth key must be linked) or if the user is a part of DAO with XYZ contributions and issues a token to the user. The user can then use the token to access the dApp.