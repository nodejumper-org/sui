// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { UnserializedSignableTransaction } from '../signers/txn-data-serializers/txn-data-serializer';
import { Coin, SuiMoveObject } from '../types';

export type TxKind = UnserializedSignableTransaction['kind'];
type BudgetMap = typeof DEFAULT_GAS_BUDGET_PER_TX_TYPE;
export type GasBudgetGuessParams<txKind extends TxKind> =
  txKind extends keyof BudgetMap
    ? Parameters<BudgetMap[txKind]> extends [boolean, ...infer Params]
      ? Params
      : []
    : [];

export const MIN_GAS_BUDGET = 10;
export const MAX_GAS_BUDGET = 1_000_000;

const PAY_GAS_FEE_PER_COIN = 150;

/**
 * Make a guess for the gas budget of a pay tx
 * @param coins All the coins of the type to send
 * @param amount The amount to send
 * @returns The gasBudget guess
 */
function computeTransferTxGasBudget(
  forError: boolean,
  coins: SuiMoveObject[],
  amount: bigint
) {
  const numInputCoins = Coin.selectCoinSetWithCombinedBalanceGreaterThanOrEqual(
    coins,
    amount
  ).length;
  let gasBudgetGuess = Math.min(
    PAY_GAS_FEE_PER_COIN * Math.max(2, Math.min(100, numInputCoins / 2)),
    MAX_GAS_BUDGET
  );
  const isSuiTransfer = Coin.isSUI(coins[0]);
  if (isSuiTransfer && !forError) {
    // check if there is enough balance to cover for the amount + the gas
    // if not lower the gasBudget to allow making better estimations for those cases
    const totalSuiBalance = coins.reduce(
      (sum, aCoin) => sum + (Coin.getBalance(aCoin) || BigInt(0)),
      BigInt(0)
    );
    if (totalSuiBalance - BigInt(gasBudgetGuess) - amount < 0) {
      gasBudgetGuess = Math.max(
        Number(totalSuiBalance - amount),
        MIN_GAS_BUDGET
      );
    }
  }
  return gasBudgetGuess;
}

const DEFAULT_GAS_BUDGET_PER_TX_TYPE = {
  mergeCoin: (_forError: boolean) => 10_000,
  moveCall: (_forError: boolean) => 10_000,
  pay: computeTransferTxGasBudget,
  paySui: computeTransferTxGasBudget,
  payAllSui: computeTransferTxGasBudget,
  publish: (_forError: boolean) => 10_000,
  splitCoin: (_forError: boolean) => 10_000,
  transferObject: (_forError: boolean) => 100,
  transferSui: (_forError: boolean) => 100,
} as const;

export function getGasBudgetGuess<T extends TxKind>(
  txKind: T,
  maxGasCoinBalance: bigint | number | null,
  forError: boolean,
  budgetParams: GasBudgetGuessParams<T>
): number {
  const gasBudgetGuess = DEFAULT_GAS_BUDGET_PER_TX_TYPE[txKind](
    forError,
    // @ts-expect-error gave up - suggestions appreciated!
    ...budgetParams
  );
  return Math.max(
    Math.min(
      ...[gasBudgetGuess, forError ? null : maxGasCoinBalance, MAX_GAS_BUDGET]
        .filter((aNum) => aNum !== null)
        .map((aNum) => Number(aNum))
    ),
    MIN_GAS_BUDGET
  );
}
