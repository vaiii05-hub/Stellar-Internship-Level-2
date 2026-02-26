#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Env, Symbol, symbol_short};

#[contract]
pub struct LivePoll;

#[contracttype]
pub enum DataKey {
    OptionA,
    OptionB,
}

#[contractimpl]
impl LivePoll {

    // Vote for Option A
    pub fn vote_a(env: Env) {
        let key = DataKey::OptionA;
        let mut count: u32 = env.storage().instance().get(&key).unwrap_or(0);
        count += 1;
        env.storage().instance().set(&key, &count);

        env.events().publish(
            (symbol_short!("vote"),),
            "OptionA",
        );
    }

    // Vote for Option B
    pub fn vote_b(env: Env) {
        let key = DataKey::OptionB;
        let mut count: u32 = env.storage().instance().get(&key).unwrap_or(0);
        count += 1;
        env.storage().instance().set(&key, &count);

        env.events().publish(
            (symbol_short!("vote"),),
            "OptionB",
        );
    }

    // Get results
    pub fn get_results(env: Env) -> (u32, u32) {
        let a: u32 = env.storage().instance().get(&DataKey::OptionA).unwrap_or(0);
        let b: u32 = env.storage().instance().get(&DataKey::OptionB).unwrap_or(0);
        (a, b)
    }
}