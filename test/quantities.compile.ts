import { MaxStackSize, StackCount, TransferQuantity } from "../src/domain/quantities";

const stackCount: ReturnType<typeof StackCount> = StackCount(1);
const transferQuantity: ReturnType<typeof TransferQuantity> = TransferQuantity(1);
const maxStackSize: ReturnType<typeof MaxStackSize> = MaxStackSize(1);

// @ts-expect-error StackCount and TransferQuantity are distinct brands.
export const stackFromTransfer: typeof stackCount = transferQuantity;
// @ts-expect-error StackCount and MaxStackSize are distinct brands.
export const stackFromMax: typeof stackCount = maxStackSize;
// @ts-expect-error TransferQuantity and MaxStackSize are distinct brands.
export const transferFromMax: typeof transferQuantity = maxStackSize;
