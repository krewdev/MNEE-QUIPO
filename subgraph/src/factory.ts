import { WalletCreated as WalletCreatedEvent } from "../generated/AgentWalletFactory/AgentWalletFactory";
import { WalletCreated as WalletCreatedEntity, FactoryStats } from "../generated/schema";

export function handleWalletCreated(event: WalletCreatedEvent): void {
  let entity = new WalletCreatedEntity(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.owner = event.params.owner;
  entity.wallet = event.params.wallet;
  entity.index = event.params.index;
  entity.timestamp = event.block.timestamp;
  entity.blockNumber = event.block.number;
  entity.transactionHash = event.transaction.hash;

  entity.save();

  // Update stats
  let stats = FactoryStats.load("1");
  if (stats == null) {
    stats = new FactoryStats("1");
    stats.totalWallets = BigInt.fromI32(0);
  }
  stats.totalWallets = event.params.index.plus(BigInt.fromI32(1));
  stats.lastUpdated = event.block.timestamp;
  stats.save();
}

