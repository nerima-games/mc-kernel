/**
 * Nominal identifiers shared by every repository.
 */
import { Brand } from "effect";

const NON_BLANK_STRING_MIN_LENGTH = 0;
const RESOURCE_LOCATION_PATTERN = /^(?:[a-z0-9._-]+:)?[a-z0-9/._-]+$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Identifies a single world (save). Kernel does not know how worlds are stored;
 * it only guarantees that a WorldId is a non-empty, non-blank string.
 */
export type WorldId = string & Brand.Brand<"WorldId">;

export const WorldId: Brand.Brand.Constructor<WorldId> = Brand.refined<WorldId>(
  (value) => value.trim().length > NON_BLANK_STRING_MIN_LENGTH,
  (value) =>
    Brand.error(
      `WorldId must be a non-blank string, received ${JSON.stringify(value)}`,
    ),
);

/**
 * Identifies a stable vertex in a per-frame ordering graph.
 */
export type StageId = string & Brand.Brand<"StageId">;

export const StageId: Brand.Brand.Constructor<StageId> = Brand.refined<StageId>(
  (value) => value.trim().length > NON_BLANK_STRING_MIN_LENGTH,
  (value) =>
    Brand.error(
      `StageId must be a non-blank string, received ${JSON.stringify(value)}`,
    ),
);

/** A canonical UUID string used by Minecraft profile data. */
export type UUID = string & Brand.Brand<"UUID">;

export const UUID: Brand.Brand.Constructor<UUID> = Brand.refined<UUID>(
  (value) => UUID_PATTERN.test(value),
  (value) =>
    Brand.error(`UUID has invalid syntax, received ${JSON.stringify(value)}`),
);

/**
 * A Minecraft resource location, with an optional namespace.
 *
 * The short form is intentionally accepted because vanilla component values
 * use it for effect and sound identifiers; consumers can normalize it to a
 * fully qualified location when they need an explicit namespace.
 */
export type ResourceLocation = string & Brand.Brand<"ResourceLocation">;

export const ResourceLocation: Brand.Brand.Constructor<ResourceLocation> =
  Brand.refined<ResourceLocation>(
    (value) => RESOURCE_LOCATION_PATTERN.test(value),
    (value) =>
      Brand.error(
        `ResourceLocation has invalid syntax, received ${JSON.stringify(value)}`,
      ),
  );

/** A resource location whose namespace is explicit, as required by data-pack paths. */
export type NamespacedResourceLocation = string &
  Brand.Brand<"NamespacedResourceLocation">;

export const NamespacedResourceLocation: Brand.Brand.Constructor<NamespacedResourceLocation> =
  Brand.refined<NamespacedResourceLocation>(
    (value) => ResourceLocation.is(value) && value.includes(":"),
    (value) =>
      Brand.error(
        `NamespacedResourceLocation must include a namespace, received ${JSON.stringify(value)}`,
      ),
  );

/** A Minecraft tag location, including its required `#` prefix. */
export type TagLocation = string & Brand.Brand<"TagLocation">;

export const TagLocation: Brand.Brand.Constructor<TagLocation> =
  Brand.refined<TagLocation>(
    (value) => value.startsWith("#") && ResourceLocation.is(value.slice(1)),
    (value) =>
      Brand.error(
        `TagLocation has invalid syntax, received ${JSON.stringify(value)}`,
      ),
  );
