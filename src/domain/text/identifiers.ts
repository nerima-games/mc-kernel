/**
 * Nominal identifiers shared by every repository.
 */
import { Brand } from "effect";

const NON_BLANK_STRING_MIN_LENGTH = 0;
const RESOURCE_LOCATION_PATTERN = /^(?:[a-z0-9._-]+:)?[a-z0-9/._-]+$/;
const VANILLA_RESOURCE_PATH_PATTERN = /^[a-z0-9/._-]+$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Identifies a single world (save). Kernel does not know how worlds are stored;
 * it only guarantees that a WorldId is a non-empty, non-blank string.
 */
export type WorldId = string & Brand.Brand<"WorldId">;

export const WorldId: Brand.Constructor<WorldId> = Brand.make<WorldId>(
  (value) =>
    value.trim().length > NON_BLANK_STRING_MIN_LENGTH
      ? true
      : `WorldId must be a non-blank string, received ${JSON.stringify(value)}`,
);

/**
 * Identifies a stable vertex in a per-frame ordering graph.
 */
export type StageId = string & Brand.Brand<"StageId">;

export const StageId: Brand.Constructor<StageId> = Brand.make<StageId>(
  (value) =>
    value.trim().length > NON_BLANK_STRING_MIN_LENGTH
      ? true
      : `StageId must be a non-blank string, received ${JSON.stringify(value)}`,
);

/** A canonical UUID string used by Minecraft profile data. */
export type UUID = string & Brand.Brand<"UUID">;

export const UUID: Brand.Constructor<UUID> = Brand.make<UUID>(
  (value) =>
    UUID_PATTERN.test(value)
      ? true
      : `UUID has invalid syntax, received ${JSON.stringify(value)}`,
);

/**
 * A Minecraft resource location, with an optional namespace.
 *
 * The short form is intentionally accepted because vanilla component values
 * use it for effect and sound identifiers; consumers can normalize it to a
 * fully qualified location when they need an explicit namespace.
 */
export type ResourceLocation = string & Brand.Brand<"ResourceLocation">;

export const ResourceLocation: Brand.Constructor<ResourceLocation> =
  Brand.make<ResourceLocation>(
    (value) =>
      RESOURCE_LOCATION_PATTERN.test(value)
        ? true
        : `ResourceLocation has invalid syntax, received ${JSON.stringify(value)}`,
  );

/** A resource location whose namespace is explicit, as required by data-pack paths. */
export type NamespacedResourceLocation = string &
  Brand.Brand<"NamespacedResourceLocation">;

export const NamespacedResourceLocation: Brand.Constructor<NamespacedResourceLocation> =
  Brand.make<NamespacedResourceLocation>(
    (value) =>
      ResourceLocation.is(value) && value.includes(":")
        ? true
        : `NamespacedResourceLocation must include a namespace, received ${JSON.stringify(value)}`,
  );

/** A Minecraft tag location, including its required `#` prefix. */
export type TagLocation = string & Brand.Brand<"TagLocation">;

export const TagLocation: Brand.Constructor<TagLocation> =
  Brand.make<TagLocation>(
    (value) =>
      value.startsWith("#") && ResourceLocation.is(value.slice(1))
        ? true
        : `TagLocation has invalid syntax, received ${JSON.stringify(value)}`,
  );

export type VanillaResourcePath = string & Brand.Brand<"VanillaResourcePath">;

export const VanillaResourcePath: Brand.Constructor<VanillaResourcePath> =
  Brand.make<VanillaResourcePath>(
    (value) =>
      VANILLA_RESOURCE_PATH_PATTERN.test(value)
        ? true
        : `VanillaResourcePath has invalid syntax, received ${JSON.stringify(value)}`,
  );

/**
 * The single place that spells `minecraft:<name>` for a vanilla id.
 * `damageTypeId`, `statusEffectId`, and `crafting-special.ts`'s pot
 * decoration ids all route through here rather than each building the
 * string itself, which is what keeps the concept from drifting back into
 * independent spellings (docs/design-notes.md §1).
 */
export const vanillaId = (name: VanillaResourcePath): ResourceLocation =>
  ResourceLocation(`minecraft:${name}`);
