---
sidebar_position: 3
---

# Tutorial

Github: <https://github.com/identity-com/identity-challenge>

In this tutorial, we will walk through the steps to issue a gateway pass to the user.

First, to make a solana transaction, we will create a new wallet and fund it with SOL.

```ts

// The airdrop function takes in a connection and a PublicKey object representing an account, and an optional amount parameter, and uses the requestAirdrop and confirmTransaction methods provided by the Connection object to perform an airdrop on the specified account with the specified amount.

import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

const airdrop = async (
  connection: Connection,
  account: PublicKey,
  amount = LAMPORTS_PER_SOL
) => {
  // Request an airdrop for the specified account with the specified amount  
  const sigAirdrop = await connection.requestAirdrop(account, amount);
  // Get the latest block hash from the connection
  const latestBlockHash = await connection.getLatestBlockhash();

  await connection.confirmTransaction({
    signature: sigAirdrop,
    blockhash: latestBlockHash.blockhash,
    lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
  });
};
```

1. import the Connection, PublicKey, and LAMPORTS_PER_SOL types from the @solana/web3.js package.
2. Define an airdrop function that takes in a connection of type Connection, an account of type PublicKey, and an optional amount of type number which defaults to LAMPORTS_PER_SOL.
3. Use the requestAirdrop method provided by the connection object to request an airdrop on the specified account with the specified amount.
4. Use the getLatestBlockhash method provided by the connection object to get the latest blockhash on the chain.
5. Use the confirmTransaction method provided by the connection object to confirm the airdrop transaction, passing in the signature returned by the requestAirdrop method, the blockhash, and the lastValidBlockHeight obtained from the latestBlockHash object as arguments.

Second, set up a required middleware cryptid.

```ts

// The setupCryptid function takes in a Wallet object representing an authority, and a Connection object, and returns a CryptidClient object. The function first initializes an array of middleware programs that need to be passed to the CryptidClient object, then uses the Cryptid.buildFromDID method to build a CryptidClient object, passing in the DID identifier, authority wallet, and middleware programs as arguments.

const setupCryptid = async (authority: Wallet, connection: Connection): Promise<CryptidClient> => {
  // Required Middleware to pass challenge Program
  const middleware = [
    {
      programId: CHECK_DID_MIDDLEWARE_PROGRAM_ID,
      address: new PublicKey("79Rca2Uu11RJ6i7fbFQPvm2kbTWEEJnzsm8RmWVGwbnB"),
    },
  ];

  return Cryptid.buildFromDID(
    DidSolIdentifier.create(authority.publicKey, cluster).toString(),
    authority,
    // middleware,
    { connection, accountIndex: 1, middlewares: middleware }
  );
}
```

1. Define the function with the required parameters: authority of type Wallet and connection of type Connection.
2. Create an array of middleware and assign it to the middleware variable: an object with the programId and address properties.
3. Return a CryptidClient object that is built using the Cryptid class and the buildFromDID method: pass in the DID identifier, authority wallet, and middleware programs as arguments.
4. Use the setupCryptid function by passing in a Wallet object for the authority parameter and a Connection object for the connection parameter to initialize a CryptidClient object.

This will return a Promise that will resolve to a CryptidClient object.

Third, we will propose and execute the transaction.

```ts

// The proposeAndExecute function takes in a Transaction object and a CryptidClient object, and logs the transaction and the proposeTransaction and proposeSigners returned by the cryptid.propose method. It then sends the propose transaction to the network, skipping the preflight check. It then sends the executeTransactions and executeSigners returned by the cryptid.execute method to the network.

const proposeAndExecute = async (tx: Transaction, cryptid: CryptidClient) => {
  console.log(JSON.stringify(tx, null, 2));
  const { proposeTransaction, transactionAccount, proposeSigners } =
    await cryptid.propose(tx);
  console.log(`proposeTransaction: ${JSON.stringify(proposeTransaction, null, 2)}`);
  console.log(`proposeSigners: ${proposeSigners}`);
  await cryptid.send(proposeTransaction, proposeSigners, { skipPreflight: true });

  // send the execute tx, which fails to pass through the middleware
  const { executeTransactions, executeSigners } = await cryptid.execute(
    transactionAccount
  );
  await cryptid.send(executeTransactions[0], executeSigners);
}
```

1. Define the function with the required parameters: tx of type Transaction and cryptid of type CryptidClient.
2. Use the propose method of the cryptid object to create a proposal for the transaction and log the proposal transaction and signers to the console: the proposeTransaction, transactionAccount, and proposeSigners objects returned by the cryptid.propose method.
3. Use the send method of the cryptid object to send the proposal transaction, passing in the proposeSigners and setting the skipPreflight option to true: this will send the transaction to the network without performing a preflight check.
4. Use the execute method of the cryptid object to create an execution transaction for the proposed transaction, and log the execution transaction and signers to the console: the executeTransactions and executeSigners objects returned by the cryptid.execute method.
5. Use the send method of the cryptid object to send the execute transaction, passing in the transaction and the list of signers as arguments: this will send the transaction to the network.

Fourth, we will add Eth Key to the user's DID.

```ts

// The addEthKeyWithOwnershipToDID function takes in a Wallet object representing an authority, and adds an Ethereum key to the authority's DID. The function first creates a DID wallet and a key verification method, then adds the verification method to the DID using the didSolService.addVerificationMethod method, and sets the ownership flags on the verification method using the didSolService.setVerificationMethodFlags method.

export const addEthKeyWithOwnershipToDID = async (authority: Wallet) => {
  const did = DidSolIdentifier.create(authority.publicKey, cluster);
  const didSolService = DidSolService.build(did, {
    wallet: authority,
  });

  // Create a DID Wallet
  const newEthKey = EthWallet.createRandom();
  const fragment = `eth-key${Date.now()}`;
  const newKeyVerificationMethod = {
    flags: [BitwiseVerificationMethodFlag.CapabilityInvocation],
    fragment,
    keyData: Buffer.from(utils.arrayify(newEthKey.address)),
    methodType: VerificationMethodType.EcdsaSecp256k1RecoveryMethod2020,
  };

  // Set VM
  await didSolService.addVerificationMethod(newKeyVerificationMethod).withAutomaticAlloc(authority.publicKey).rpc();

  // Set Ownership flags
  await didSolService
    .setVerificationMethodFlags(fragment, [
      BitwiseVerificationMethodFlag.CapabilityInvocation,
      BitwiseVerificationMethodFlag.OwnershipProof,
    ])
    .withEthSigner(newEthKey)
    .rpc();
};
```

1. Import the addEthKeyWithOwnershipToDID function and the necessary dependencies (e.g. Wallet, DidSolIdentifier, DidSolService, EthWallet, etc.) at the top of your file.
2. Create a new Wallet object representing the authority that will be used to create the new DID.
3. Call the addEthKeyWithOwnershipToDID function, passing in the authority object as an argument.
4. This will create a new DID based on the authority object's publicKey, and add a new Ethereum key with ownership proof to it. The updated DID will then be sent to an RPC endpoint.
5. You can now use the updated DID and its associated Ethereum key for any operations that require ownership proof.

Fifth, we will add service to the user's DID.

```ts

// The addServiceToDID function which takes in a Wallet object representing an authority, and a Service object, and adds the service to the authority's DID using the didSolService.addService method.

export const addServiceToDID = async (authority: Wallet, service: Service) => {
  const did = DidSolIdentifier.create(authority.publicKey, cluster);
  const didSolService = DidSolService.build(did, {
    wallet: authority,
  });

  await didSolService.addService(service).withAutomaticAlloc(authority.publicKey).rpc();
};
```

1. Import the addServiceToDID function and the necessary dependencies (e.g. Wallet, DidSolIdentifier, DidSolService, Service, etc.) at the top of your file.

2. Create a new Wallet object representing the authority that will be used to add the service to the DID.

3. Create a new Service object representing the service that you want to add to the DID.

4. Call the addServiceToDID function, passing in the authority and service objects as arguments.

5. This will add the service to the DID associated with the authority object, and then send the updated DID to an RPC endpoint.

6. You can now use the updated DID with the added service for any operations that require that service.

Once we have done all the steps, we will have a gateway pass issued to the user.

```ts

(async () => {
  const connection = new Connection(clusterApiUrl(cluster));
  const connection = new Connection("https://rough-misty-night.solana-devnet.quiknode.pro/b57300ff234c12e95763e9b8cda67e9d86772a0d/")

  // generate an authority and airdrop to it.
  console.log('Setting up authority');
  const subject = Keypair.generate();
  // const authority = Keypair.generate();
  const authority = Keypair.fromSecretKey(Uint8Array.from([89,148,162,75,114,98,180,107,191,170,103,35,203,84,199,180,245,219,130,213,32,66,30,8,17,222,61,92,136,75,87,255,134,47,101,203,156,252,88,184,66,77,86,129,132,84,62,193,4,37,6,36,15,118,82,153,198,2,138,90,237,68,219,250]));
  const wallet = new NodeWallet(authority)
  // await airdrop(connection, authority.publicKey);

  const client = IdentityChallengeClient.build({
    // the network
    network: new PublicKey("cha3u755qh8GbDayALBwA7ZroFT4NHfPUYgERp16M1z"),
    // the Gatekeeper
    gatekeeper: new PublicKey("43tZqtJB8fZvHe4BgKJFxZU1pDaiTeBBES9DVLjbPATg"),
    // PDA of the challenge Program that is authorized to issue for the gatekeeper
    gatekeeperAuthority: new PublicKey("yQZBNHqdsquLZKfsUfNMcJqrS9F9rAw5oCEqJAH67MN")
  }, cluster, {
    connection,
    wallet
  });

  console.log('Setting up Cryptid');
  // Create Cryptid Account that uses middleware
  const cryptid = await setupCryptid(wallet, connection);
  console.log(`cryptid DID: ${cryptid.did}`);
  console.log(`cryptid address: ${cryptid.address()}`);

  await airdrop(connection, cryptid.address());

  await addEthKeyWithOwnershipToDID(wallet);
  await addServiceToDID(wallet, {
    fragment: "test-service",
    serviceType: "profile-pic",
    serviceEndpoint:
      "https://tenor.com/view/vendetta-hats-off-fat-gif-11654529",
  });


  console.log('Executing Transaction');
  const tx = await client.issuePass(cryptid.address(), subject.publicKey);
  // Create issue Transaction
  await proposeAndExecute(tx, cryptid);

  console.log(`Successfully issued a pass to ${subject.publicKey}`);

})().catch(console.error)
```

We can now verify that the pass has been issued to the user by running gateway pass verify command from the Identity's Gateway Command Line Interface.

## How to install identity's Gateway CLI

```bash
npm install -g @identity.com/gateway-solana-cli
```

## How to run the pass verify command

```bash
USAGE
  $ gateway pass verify -s <value> -n <value> -c <value> [-h]

FLAGS
  -c, --cluster=<value>  (required) The cluster you wish to use
  -h, --help             Show CLI help.
  -n, --network=<value>  (required) String representing the network's address
  -s, --subject=<value>  (required) The address to check for a gateway pass

DESCRIPTION
  Verifies a gateway pass

EXAMPLES
  $ gateway pass verify --subject [address] --network [address] --cluster [cluster type]
```

# Payments 

When doing a pass operation, the user will be charged a fee. The fee is paid in the supported token(s) that the network and gatekeepers support.
We specify the fees and the supported tokens when creating networks and gatekeepers. But can be updated later.

The fees are specified as follows
The gatekeeper specifies a fee in token units, while the network specifies a percentage in hundredths of a percent (0.01% or 0.0001).
For example:
The gatekeeper fee is 100 and the network percentage is 500 (5%) 
The gatekeeper will receive 95 and the network will receive 5.

The `fees.token` for network and `tokenFees.token` for gatekeeper must match `supportedTokens.key`, order doesn't matter.
The network and the gatekeeper must have at least one matching token to do a pass operation.
You can specify a different fee for each pass operation issue, refresh, expire and verify.

```ts
  createNetwork({
    authThreshold: 1,
    passExpireTime: 10000,
    fees: [
      {
        token: mint,
        issue: 10,
        refresh: 10,
        expire: 10,
        verify: 10,
      },
    ],
    supportedTokens: [{ key: mint }],
    authKeys: [],
  });

createGatekeeper(
  networkAuthority.publicKey,
  stakingPDA,
  adminAuthority.publicKey, 
  {
    tokenFees: [
      {
        token: mint,
        issue: 10,
        refresh: 10,
        expire: 10,
        verify: 10,
      },
    ],
    authThreshold: 1,
    authKeys: [], 
    supportedTokens: [{key: mint}],
  });
  
```