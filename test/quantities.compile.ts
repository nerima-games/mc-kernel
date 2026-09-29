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

// These literal constructor assignments are intentionally explicit K03 compile fixtures.
export const stackBoundaryOne: typeof stackCount = StackCount(1);
export const stackBoundaryNinetyNine: typeof stackCount = StackCount(99);
export const transferBoundaryNinetyNine: typeof transferQuantity = TransferQuantity(99);
export const maxBoundaryNinetyNine: typeof maxStackSize = MaxStackSize(99);

// @ts-expect-error A transfer quantity is not a stack count, even at the same literal value.
export const stackFromTransferNinetyNine: typeof stackCount = TransferQuantity(99);
// @ts-expect-error A max stack size is not a transfer quantity, even at the same literal value.
export const transferFromMaxNinetyNine: typeof transferQuantity = MaxStackSize(99);
// @ts-expect-error A stack count is not a max stack size, even at the same literal value.
export const maxFromStackNinetyNine: typeof maxStackSize = StackCount(99);
