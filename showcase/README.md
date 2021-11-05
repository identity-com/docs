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

### Solana

```shell
# Install the Solana tool suite
$ sh -c "$(curl -sSfL https://release.solana.com/v1.8.1/install)"

# Export the given path (or and add it to .profile (or equivalent for your shell)) e.g.
$ export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# Check that Solana is installed and accessible
$ solana --version

# Setup a new key-pair for the demo
$ solana-keygen new

# We do this demo in Devnet
$ solana config set -u devnet
```

### SOL DID Client
```shell
$ yarn global add @identity.com/sol-did-client
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

Visit [https://did.civic.com](https://did.civic.com), and resolve the above DID.


## Manipulating SOL DIDs

Goal: Add keys to DID documents, introduction to [Cryptid](https://github.com/identity-com/cryptid)

```shell
# Initialize cryptid
$ cryptid init

# View the cryptid configuration
$ cryptid config

# Shows the DID document (same as above)
$ cryptid document

# Airdop SOL to the signing key and cryptid account
$ cryptid airdrop

# Generate a new Solana key
$ solana-keygen new -o key2.json

# Add the new public key to your cryptid account, with 'key2' as an alias
$ cryptid key add <pubkey> key2

# Transfer SOL to the new key
$ cryptid transfer <pubkey> 1000000

# View the updated DID document
$ cryptid document

# Update c- Mint NFT [http://candy.identity.com](http://candy.identity.com)ryptid configuration to use the new key file
$ cryptid config set keyFile $(pwd)/key2.json

# Remove the key
$ cryptid key remove default

# Check the updated DID document
$ cryptid document

# Update cryptid configuration to use the original (default) key
$ cryptid config set keyFile $HOME/.config/solana/id.json

# Expect transfer of using the removed key to fail
$ cryptid transfer <pubkey> 1000000

# Switch back to your new key
$ cryptid config set keyFile $(pwd)/key2.json
```

## Controllers

Goal: Show the power of DID Controllers for joining accounts

```shell
# Create a new key to demonstrate the controlled cryptid account
$ solana-keygen new -o controlled.json

# Create a cryptid configuration for the new key
$ cryptid init -k controlled.json -p controlled.yml

# View the configuration
$ cryptid config -c controlled.yml

# Fund new cryptid address
$ cryptid transfer <NEW_DID> 100000000

# Fund Signer #default signer !!!!
$ cryptid transfer <pubkey controlled.json> 100000000

# Add your main account DID 
$ cryptid controller add -c controlled.yml <OLD_DID>

# Add an alias for the controlled did (for convenience)
$ cryptid alias controlled <NEW_DID>

# Add an alias for your original did (for convenience)
$ cryptid alias me <OLD_DID>

# Check the DID document for the controlled cryptid
$ cryptid document --as controlled

# Check the balance for the controlled cryptid
$ cryptid balance --as controlled

# Transfer SOL on behalf of the controlled cryptid account using the original cryptid account
$ cryptid transfer me 0.1 --as controlled
```
Show balances and transactions in explorer.

## Cryptid Wallet UI

Goal: preparation for using cryptid in a dApp, show the connection between the basic concepts learned and "real life".

- Visit [http://cryptid.identity.com](http://cryptid.identity.com)
- Create a new cryptid account by connecting a wallet
- Airdrop using UI

```shell
$ cryptid controller add -c controlled.yml <UI_DID>
```

- Add controlled DID to UI
- Transfer 0.1 from controlled to UI cryptid account

## Gateway

Goal: intro to gateway tokens, permissioned dApps and the gateway CLI

- Visit [http://candy.identity.com](http://candy.identity.com) - controlled cryptid account cannot yet mint NFT (no GT)

```shell
$ gateway add-gatekeeper -c devnet $(solana address)

$ gateway issue -g $HOME/.config/solana/id.json -c devnet <CONTROLLED CRYPTID ADDRESS>
```

- Visit [http://candy.identity.com](http://candy.identity.com) - Mint NFT

## Credentials & Gateway

Goal: "Real-life" example of a gateway token issuance based on credentials.

- Go to [http://candy.identity.com](http://candy.identity.com) (and fail to mint an NFT)
- Visit [https://vp-demo.identity.com](https://vp-demo.identity.com)
- Connect Cryptid wallet
- Scan QR code and onboard with Civic
- Sign credential with cryptid key
- Click button to get Gateway Token issued to cryptid account
- Mint NFT [http://candy.identity.com](http://candy.identity.com)
