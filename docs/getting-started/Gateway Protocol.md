---
title: Gateway Protocl
draft: true
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

TODO: Story with On-Chain program as a Gatekeeper., DID-state (e.g. you have at least one ETH key linked). You are part of a DAO with XYZ contributions.