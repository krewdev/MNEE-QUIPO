import { GasSponsored as GasSponsoredEvent, RateUpdated, TreasuryUpdated } from "../generated/MNEEPaymaster/MNEEPaymaster";
import { GasSponsored as GasSponsoredEntity, RateUpdate, TreasuryUpdate, PaymasterStats } from "../generated/schema";

export function handleGasSponsored(event: GasSponsoredEvent): void {
  let entity = new GasSponsoredEntity(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.user = event.params.user;
  entity.gasCost = event.params.gasCost;
  entity.mneeAmount = event.params.mneeAmount;
  entity.userOpHash = event.params.userOpHash;
  entity.timestamp = event.block.timestamp;
  entity.blockNumber = event.block.number;
  entity.transactionHash = event.transaction.hash;

  entity.save();

  // Update stats
  let stats = PaymasterStats.load("1");
  if (stats == null) {
    stats = new PaymasterStats("1");
    stats.totalGasSponsored = BigInt.fromI32(0);
    stats.totalMNEEcollected = BigInt.fromI32(0);
  }
  stats.totalGasSponsored = stats.totalGasSponsored.plus(event.params.gasCost);
  stats.totalMNEEcollected = stats.totalMNEEcollected.plus(event.params.mneeAmount);
  stats.lastUpdated = event.block.timestamp;
  stats.save();
}

export function handleRateUpdated(event: RateUpdated): void {
  let entity = new RateUpdate(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.oldRate = event.params.oldRate;
  entity.newRate = event.params.newRate;
  entity.timestamp = event.block.timestamp;
  entity.blockNumber = event.block.number;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleTreasuryUpdated(event: TreasuryUpdated): void {
  let entity = new TreasuryUpdate(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.oldTreasury = event.params.oldTreasury;
  entity.newTreasury = event.params.newTreasury;
  entity.timestamp = event.block.timestamp;
  entity.blockNumber = event.block.number;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

