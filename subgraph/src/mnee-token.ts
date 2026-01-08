import { Transfer, Approval, TokenMint, TokenBurn } from "../generated/MNEEToken/MNEEToken";
import { Transfer as TransferEvent, Approval as ApprovalEvent, Minted, Burned } from "../generated/MNEEToken/MNEEToken";
import { TransferEntity, ApprovalEntity, TokenMint as TokenMintEntity, TokenBurn as TokenBurnEntity } from "../generated/schema";

export function handleTransfer(event: TransferEvent): void {
  let entity = new TransferEntity(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.from = event.params.from;
  entity.to = event.params.to;
  entity.value = event.params.value;
  entity.timestamp = event.block.timestamp;
  entity.blockNumber = event.block.number;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleApproval(event: ApprovalEvent): void {
  let entity = new ApprovalEntity(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.owner = event.params.owner;
  entity.spender = event.params.spender;
  entity.value = event.params.value;
  entity.timestamp = event.block.timestamp;
  entity.blockNumber = event.block.number;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleMinted(event: Minted): void {
  let entity = new TokenMintEntity(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.to = event.params.to;
  entity.amount = event.params.amount;
  entity.timestamp = event.block.timestamp;
  entity.blockNumber = event.block.number;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleBurned(event: Burned): void {
  let entity = new TokenBurnEntity(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.from = event.params.from;
  entity.amount = event.params.amount;
  entity.timestamp = event.block.timestamp;
  entity.blockNumber = event.block.number;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

