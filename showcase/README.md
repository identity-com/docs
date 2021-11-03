# Identity Technology Showcase

This guide will take you through the suite of Identity software available on Solana.

## Setup

For this demo you'll need the following setup on your machine:
- Node 14+
- `yarn`
- Solana Tool Suite (1.8.0+)
- @identity.com/sol-did-client
- @identity.com/cryptid-cli
- @identity.com/solana-gatekeeper-lib
For demo purposes we will use the `node:16` docker image that comes with `node` and `yarn` 
and install all relevant software inside this dedicated environment
```shell
$ docker run -it node:16 /bin/bash
```


### Solana:

```shell
$ sh -c "$(curl -sSfL https://release.solana.com/v1.8.1/install)"

$ solana-keygen new

$ solana config set -u devnet
```

### SOL DID Client
```shell
$ yarn global add @identity.com/sol-did-client

$ sol --help
```

### Cryptid Client
```shell
$ yarn global add @identity.com/cryptid-cli

$ cryptid --help
```

### Gateway Client
```shell
$ yarn global add @identity.com/solana-gatekeeper-lib

$ gateway --help
```

## Getting started with did:sol

Goal: Intro to DIDs

```shell
$ solana address

$ sol did:sol:devnet:$(solana address)
```

Visit https://did.civic.com, and resolve the above DID.


## Manipulating SOL DIDs

Goal: Add keys to DID documents, introduction to [Cryptid](https://github.com/identity-com/cryptid)

```shell
$ cryptid init

$ cryptid config

$ cryptid document (shows same as above)

$ cryptid airdrop

$ solana-keygen new -o key2.json

$ cryptid key add <pubkey> key2

$ cryptid document

$ cryptid config set keyFile $(pwd)/key2.json

$ cryptid key remove default
```

## Controllers


Goal: Show the power of DID Controllers for joining accounts

```shell
$ solana-keygen new -o controlled.json

$ cryptid init -k controlled.json -p controlled.yml

$ cryptid config -c controlled.yml

$ cryptid transfer 1_000_000 <NEW_DID>

$ cryptid controller add -c controlled.yml <OLD_DID>

$ cryptid alias controlled <NEW_DID>

$ cryptid alias me <OLD_DID>

$ cryptid document --as controlled

$ cryptid balance --as controlled

$ cryptid transfer me 0.1 --as controlled
```

## Cryptid Wallet UI

Goal: preparation for using cryptid in a dApp, show the connection between the basic concepts learned and "real life".

- Visit http://cryptid.identity.com
- Create a new cryptid account by connecting a wallet
- Airdrop using UI

```shell
$ cryptid controller add -c controlled.yml <UI_DID>
```

- Add controlled DID to UI
- Transfer 0.1 from controlled to UI cryptid account

## Gateway


Goal: intro to gateway tokens, permissioned dApps and the gateway CLI

- Visit https://candy.identity,com - controlled cryptid account cannot yet mint NFT (no GT)

```shell
$ gateway add-gatekeeper -c devnet $(solana address)

$ gateway issue -g $HOME/.config/solana/id.json <CONTROLLED CRYPTID ADDRESS>
```

- Visit https://candy.identity,com - Mint NFT

## Credentials & Gateway

Goal: "Real-life" example of a gateway token issuance based on credentials.

- Visit https://vp-demo.identity.com
- Connect Cryptid wallet
- Scan QR code and onboard with Civic
- Sign credential with cryptid key
- Click button to get Gateway Token issued to cryptid account
- Mint NFT https://candy.identity,com
