---
sidebar_position: 2
---

# Gateway Pass

A Gateway Pass is a wallet-based proof that a user has been verified and meets the network’s requirements.

## Gateway Pass usage

The dApp checks a user’s wallet for a Gateway Pass that is:

1. Active
1. Meets the requirements for the dApp (e.g. belongs to the Gatekeeper Network of choice).

If there is no Gateway Pass present or the Pass does not satisfy the relevant requirements, the dApp sends the user to the appropriate Gatekeeper to complete the verification process. After the verification is complete, the user is able to use the dApp without further verification interaction while the Gateway Pass remains active.

### If a Gateway Pass is inactive

When a Gateway Pass becomes inactive due to expiration or updated requirements, a new Gateway Pass is required. The user must go through the verification process again with the Gatekeeper. These conditions are decided by the protocol and the network, but can be further restricted by the dApp.

In the case of a Gateway Pass being revoked for misuse or for other reasons, contact the Guardian or the issuing Gatekeeper for possible resolutions.

If the Gateway Pass is frozen, the user must wait for the investigation to end. The Pass will either be revoked or unfrozen following the conclusion of the investigation, e.g. a Gateway Pass might be temporarily frozen if the user travels outside of their own country.
Requirements for dApps using Gateway Passes

A dApp that uses Gateway Passes for KYC is required to:

1. Select the Gateway Network that satisfies their requirements.
1. Integrate the Gateway Library Code associated with the Gateway Network.
1. Use Pass operations tracked by usage data.
