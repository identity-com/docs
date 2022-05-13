---
sidebar_position: 1
title: IntelliJ File Templates
---

# IntelliJ File Templates

These are helpful file templates use in Intellij IDEs (specifically I use CLion). These can be added in `Settings -> Editor -> File and Code Templates` and then used when creating new files.

## Instruction

```rust
use cruiser::prelude::*;

#[derive(Debug)]
pub enum ${INSTRUCTION_NAME} {}
impl<AI> Instruction<AI> for ${INSTRUCTION_NAME} {
    type Accounts = ${INSTRUCTION_NAME}Accounts<AI>;
    type Data = ${INSTRUCTION_NAME}Data;
    type ReturnType = ();
}

/// Accounts for [`${INSTRUCTION_NAME}`]
#[derive(AccountArgument, Debug)]
#[account_argument(account_info = AI, generics = [where AI: AccountInfo])]
pub struct ${INSTRUCTION_NAME}Accounts<AI> {}
/// Data for [`${INSTRUCTION_NAME}`]
#[derive(Clone, Debug, BorshSerialize, BorshDeserialize)]
pub struct ${INSTRUCTION_NAME}Data {}

#[cfg(feature = "processor")]
mod processor{
    use super::*;

    impl<AI> InstructionProcessor<AI, ${INSTRUCTION_NAME}> for ${INSTRUCTION_NAME} where AI: AccountInfo{
        type FromAccountsData = ();
        type ValidateData = ();
        type InstructionData = ();

        fn data_to_instruction_arg(_data: <${INSTRUCTION_NAME} as Instruction<AI>>::Data) -> CruiserResult<(Self::FromAccountsData, Self::ValidateData, Self::InstructionData)> {
            todo!()
        }

        fn process(_program_id: &Pubkey, _data: Self::InstructionData, _accounts: &mut <${INSTRUCTION_NAME} as Instruction<AI>>::Accounts) -> CruiserResult<<${INSTRUCTION_NAME} as Instruction<AI>>::ReturnType> {
            todo!()
        }
    }
}

#[cfg(feature = "cpi")]
pub use cpi::*;
/// CPI for [`${INSTRUCTION_NAME}`]
#[cfg(feature = "cpi")]
mod cpi {
    use super::*;
    
    #[derive(Debug)]
    pub struct ${INSTRUCTION_NAME}CPI<'a, AI, const N: usize> {
        accounts: [MaybeOwned<'a, AI>; N],
        data: Vec<u8>,
    }
}

#[cfg(feature = "client")]
pub use client::*;
/// Client for [`${INSTRUCTION_NAME}`]
#[cfg(feature = "client")]
mod client {
    use super::*;
}
```
