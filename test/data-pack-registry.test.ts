import { describe, expect, it } from "vitest";
import { Result } from 'effect'

import {
  DataPackFormat,
  DataPackPriority,
  DataPackResourcePath,
  dataPackLayer,
  dataPackLayerFromUnknown,
  dataPackLayerFromUnknownWithId,
  dataPackResourcePath,
  mapDataPackLayer,
  selectDataPackRegistry,
  type DataPackLayer,
  type DataPackRegistryFailure,
} from "../src/domain/world/data-pack-registry";
import { resultFailure, resultValue } from './block-result-helpers.js'
import { NamespacedResourceLocation, ResourceLocation } from "../src/domain/text/identifiers";
import {
  SULFUR_CUBE_ITEM_TAGS,
  SulfurCubeKnockbackPower,
  SulfurCubePushSoundCooldown,
  SulfurCubePushSoundImpulseThreshold,
  type SulfurCubeArchetypeOptions,
} from "../src/domain/entity/sulfur-cube";
import { AttributeModifierAmount } from "../src/domain/time/quantities";
import {
  selectSulfurCubeArchetypes,
  sulfurCubeArchetypeDataPackLayer,
  sulfurCubeArchetypeDataPackLayerFromUnknown,
  sulfurCubeArchetypeDataPath,
} from "../src/domain/entity/sulfur-cube-registry";

const namespacedResourceLocation = (value: string): Result.Result<NamespacedResourceLocation, DataPackRegistryFailure> =>
  Result.mapError(NamespacedResourceLocation.result(value), (error) => ({
    _tag: 'DataPackRegistryFailure',
    reason: 'invalid-resource-location',
    message: error.message,
  }))

const dataPackLayerFromRaw = <T>(options: {
  readonly pack: string;
  readonly format: number;
  readonly priority: number;
  readonly entries: ReadonlyArray<Readonly<{ readonly id: string; readonly value: T }>>;
}): Result.Result<DataPackLayer<T>, DataPackRegistryFailure> =>
  Result.gen(function* () {
    const pack = yield* namespacedResourceLocation(options.pack)
    const format = yield* DataPackFormat(options.format)
    const priority = yield* DataPackPriority(options.priority)
    const entries: Array<{ readonly id: NamespacedResourceLocation; readonly value: T }> = []
    for (const entry of options.entries) {
      entries.push({ id: yield* namespacedResourceLocation(entry.id), value: entry.value })
    }
    return yield* dataPackLayer({ pack, format, priority, entries })
  })

const sulfurCubeLayerFromRaw = (options: {
  readonly pack: string;
  readonly format: number;
  readonly priority: number;
  readonly entries: ReadonlyArray<Readonly<{ readonly id: string; readonly value: unknown }>>;
}) => Result.gen(function* () {
  const pack = yield* namespacedResourceLocation(options.pack)
  const format = yield* DataPackFormat(options.format)
  const priority = yield* DataPackPriority(options.priority)
  const entries: Array<{ readonly id: NamespacedResourceLocation; readonly value: unknown }> = []
  for (const entry of options.entries) {
    entries.push({ id: yield* namespacedResourceLocation(entry.id), value: entry.value })
  }
  return yield* sulfurCubeArchetypeDataPackLayer({ pack, format, priority, entries })
});

const sulfurCubeOptions = {
  items: SULFUR_CUBE_ITEM_TAGS.food,
  buoyant: true,
  attributeModifiers: [
    {
      attribute: NamespacedResourceLocation("minecraft:bounciness"),
      id: NamespacedResourceLocation("minecraft:test_bounciness"),
      amount: AttributeModifierAmount(0.25),
      operation: "add_value",
    },
  ],
  knockbackModifiers: {
    horizontalPower: SulfurCubeKnockbackPower(1),
    verticalPower: SulfurCubeKnockbackPower(0.5),
  },
  soundSettings: {
    hitSound: ResourceLocation("minecraft:entity.slime.squish"),
    pushSound: ResourceLocation("minecraft:entity.slime.jump"),
    pushSoundImpulseThreshold: SulfurCubePushSoundImpulseThreshold(0.4),
    pushSoundCooldown: SulfurCubePushSoundCooldown(0.2),
  },
} satisfies SulfurCubeArchetypeOptions;

type DataPackTestDecoderFailure = Readonly<{
  readonly _tag: 'DataPackTestDecoderFailure'
  readonly message: string
}>

const decodeNumber = (value: unknown): Result.Result<number, DataPackTestDecoderFailure> =>
  typeof value === 'number'
    ? Result.succeed(value)
    : Result.fail({ _tag: 'DataPackTestDecoderFailure', message: 'registry value must be a number' })

describe("data-pack registry", () => {
  it("brands valid formats and priorities and returns tagged failures for invalid values", () => {
    expect(resultValue(DataPackFormat(0))).toBe(0);
    expect(resultValue(DataPackFormat(107.1))).toBe(107.1);
    expect(resultValue(DataPackPriority(3))).toBe(3);
    expect(resultValue(DataPackPriority(Number.MAX_SAFE_INTEGER))).toBe(Number.MAX_SAFE_INTEGER);
    const notANumber = resultFailure(DataPackFormat(Number.NaN));
    expect(notANumber._tag).toBe('DataPackRegistryFailure');
    expect(notANumber.reason).toBe('invalid-format');
    expect(notANumber.message).toMatch(/finite non-negative number/);
    expect(resultFailure(DataPackFormat(Number.POSITIVE_INFINITY)).reason).toBe('invalid-format');
    expect(resultFailure(DataPackFormat(-1)).reason).toBe('invalid-format');
    const fractionalPriority = resultFailure(DataPackPriority(1.5));
    expect(fractionalPriority.reason).toBe('invalid-priority');
    expect(fractionalPriority.message).toMatch(/non-negative safe integer/);
    expect(resultFailure(DataPackPriority(-1)).reason).toBe('invalid-priority');
    expect(DataPackResourcePath("data/example/recipe/regular.json")).toBe("data/example/recipe/regular.json");
    expect(Result.isFailure(DataPackResourcePath.result("data/example/../recipe/regular.json"))).toBe(true);
    expect(Result.isFailure(DataPackResourcePath.result("data/example\\recipe/regular.json"))).toBe(true);
    expect(Result.isFailure(DataPackResourcePath.result("/data/example/recipe/regular.json"))).toBe(true);
  });

  it("normalizes and freezes a namespaced layer", () => {
    const layer = resultValue(dataPackLayerFromRaw({
      pack: "example:base",
      format: 107.1,
      priority: 0,
      entries: [{ id: "example:regular", value: "base" }],
    }));

    expect(layer.pack).toBe(NamespacedResourceLocation("example:base"));
    expect(layer.format).toBe(resultValue(DataPackFormat(107.1)));
    expect(layer.priority).toBe(resultValue(DataPackPriority(0)));
    expect(layer.entries[0]).toEqual({
      id: NamespacedResourceLocation("example:regular"),
      value: "base",
    });
    expect(Object.isFrozen(layer)).toBe(true);
    expect(Object.isFrozen(layer.entries)).toBe(true);
    expect(Object.isFrozen(layer.entries[0])).toBe(true);
    const duplicate = resultFailure(dataPackLayerFromRaw({
      pack: "example:base",
      format: 107.1,
      priority: 0,
      entries: [
        { id: "example:regular", value: "base" },
        { id: "example:regular", value: "duplicate" },
      ],
    }));
    expect(duplicate._tag).toBe('DataPackRegistryFailure');
    expect(duplicate.reason).toBe('duplicate-entry');
    const invalidPack = resultFailure(dataPackLayerFromRaw({
      pack: "base",
      format: 107.1,
      priority: 0,
      entries: [],
    }));
    expect(invalidPack.reason).toBe('invalid-resource-location');
    const invalidEntry = resultFailure(dataPackLayerFromRaw({
      pack: "example:base",
      format: 107.1,
      priority: 0,
      entries: [{ id: "regular", value: "invalid" }],
    }));
    expect(invalidEntry.reason).toBe('invalid-resource-location');
  });

  it("rejects malformed runtime layer and entry values", () => {
    const invalidLayer = resultFailure(Reflect.apply(dataPackLayer, undefined, [null]));
    expect(invalidLayer).toMatchObject({
      _tag: 'DataPackRegistryFailure',
      reason: 'invalid-layer',
      message: 'Data-pack layer must contain a pack, format, priority, and entries array',
    });

    const invalidEntry = resultFailure(Reflect.apply(dataPackLayer, undefined, [{
      pack: 'example:base',
      format: 107.1,
      priority: 0,
      entries: [{ id: 1, value: 'invalid' }],
    }]));
    expect(invalidEntry).toMatchObject({
      _tag: 'DataPackRegistryFailure',
      reason: 'invalid-entry',
      message: 'Data-pack registry entry id must be a string',
    });
  });

  it("maps values while preserving the layer identity and frozen entries", () => {
    const layer = resultValue(dataPackLayerFromRaw({
      pack: "example:base",
      format: 107.1,
      priority: 0,
      entries: [{ id: "example:regular", value: "base" }],
    }));

    const mapped = resultValue(mapDataPackLayer(layer, (value) => Result.succeed(value.length)));

    expect(mapped.pack).toBe(layer.pack);
    expect(mapped.format).toBe(layer.format);
    expect(mapped.priority).toBe(layer.priority);
    expect(mapped.entries).toEqual([
      { id: NamespacedResourceLocation("example:regular"), value: 4 },
    ]);
    expect(Object.isFrozen(mapped)).toBe(true);
    expect(Object.isFrozen(mapped.entries)).toBe(true);
    expect(Object.isFrozen(mapped.entries[0])).toBe(true);
    const mappingFailure = resultFailure(mapDataPackLayer(layer, () =>
      Result.fail({ _tag: 'DataPackTestDecoderFailure', message: 'mapping failed' } as const),
    ));
    expect(mappingFailure._tag).toBe('DataPackTestDecoderFailure');
    expect(mappingFailure.message).toBe('mapping failed');
  });

  it("decodes an unknown layer at one strict value boundary", () => {
    const validLayer = {
      pack: "example:json",
      format: 107.1,
      priority: 2,
      entries: [{ id: "example:regular", value: 4 }],
    };
    const decoded = resultValue(dataPackLayerFromUnknown(validLayer, decodeNumber));

    expect(decoded.entries[0]?.value).toBe(4);
    const decodedWithId = resultValue(dataPackLayerFromUnknownWithId(
      validLayer,
      (id, value) => Result.succeed(`${id}:${String(value)}`),
    ));
    expect(decodedWithId.entries[0]?.value).toBe("example:regular:4");

    let entriesReads = 0
    const changingLayer = new Proxy({ ...validLayer }, {
      get(target, key, receiver) {
        if (key === 'entries') {
          entriesReads += 1
          return entriesReads === 1 ? validLayer.entries : {}
        }
        return Reflect.get(target, key, receiver)
      },
    })
    const changingLayerResult = dataPackLayerFromUnknown(changingLayer, decodeNumber)
    expect(Result.isSuccess(changingLayerResult)).toBe(true)
    expect(entriesReads).toBe(1)

    let idReads = 0
    const changingEntry = new Proxy({ id: 'example:regular', value: 4 }, {
      get(target, key, receiver) {
        if (key === 'id') {
          idReads += 1
          return idReads === 1 ? 'example:regular' : 1
        }
        return Reflect.get(target, key, receiver)
      },
    })
    const changingEntryResult = dataPackLayerFromUnknown({
      ...validLayer,
      entries: [changingEntry],
    }, decodeNumber)
    expect(Result.isSuccess(changingEntryResult)).toBe(true)
    expect(idReads).toBe(1)

    const decodeFailure = resultFailure(dataPackLayerFromUnknown(
      { ...validLayer, entries: [{ id: 'example:regular', value: 'four' }] },
      decodeNumber,
    ));
    expect(decodeFailure._tag).toBe('DataPackTestDecoderFailure');
    expect(decodeFailure.message).toBe('registry value must be a number');

    const extraField = resultFailure(dataPackLayerFromUnknown(
      {
        pack: "example:json",
        format: 107.1,
        priority: 2,
        entries: [{ id: "example:regular", value: 4 }],
        extra: true,
      },
      () => Result.succeed(1),
    ));
    expect(extraField).toMatchObject({ _tag: 'DataPackRegistryFailure', reason: 'invalid-layer' });
    const missingValue = resultFailure(dataPackLayerFromUnknown(
      {
        pack: "example:json",
        format: 107.1,
        priority: 2,
        entries: [{ id: "example:regular" }],
      },
      () => Result.succeed(1),
    ));
    expect(missingValue).toMatchObject({ _tag: 'DataPackRegistryFailure', reason: 'invalid-entry' });
    const duplicate = resultFailure(dataPackLayerFromUnknown(
        {
          ...validLayer,
          entries: [
            { id: "example:regular", value: 4 },
            { id: "example:regular", value: 5 },
          ],
        },
        decodeNumber,
      ));
    expect(duplicate).toMatchObject({ _tag: 'DataPackRegistryFailure', reason: 'duplicate-entry' });
    const invalidPack = resultFailure(dataPackLayerFromUnknown({ ...validLayer, pack: 1 }, decodeNumber));
    expect(invalidPack).toMatchObject({ _tag: 'DataPackRegistryFailure', reason: 'invalid-layer' });
    const invalidNamespacedPack = resultFailure(dataPackLayerFromUnknown(
      { ...validLayer, pack: 'base' },
      decodeNumber,
    ));
    expect(invalidNamespacedPack).toMatchObject({
      _tag: 'DataPackRegistryFailure',
      reason: 'invalid-resource-location',
      message: 'NamespacedResourceLocation must include a namespace, received "base"',
    });
    const invalidFormat = resultFailure(dataPackLayerFromUnknown(
      { ...validLayer, format: "107.1" },
      decodeNumber,
    ));
    expect(invalidFormat).toMatchObject({ _tag: 'DataPackRegistryFailure', reason: 'invalid-layer' });
    const outOfRangeFormat = resultFailure(dataPackLayerFromUnknown(
      { ...validLayer, format: -0.1 },
      decodeNumber,
    ));
    expect(outOfRangeFormat).toMatchObject({ _tag: 'DataPackRegistryFailure', reason: 'invalid-format' });
    const invalidPriority = resultFailure(dataPackLayerFromUnknown({ ...validLayer, priority: "2" }, decodeNumber));
    expect(invalidPriority).toMatchObject({ _tag: 'DataPackRegistryFailure', reason: 'invalid-layer' });
    const outOfRangePriority = resultFailure(dataPackLayerFromUnknown(
      { ...validLayer, priority: 1.5 },
      decodeNumber,
    ));
    expect(outOfRangePriority).toMatchObject({ _tag: 'DataPackRegistryFailure', reason: 'invalid-priority' });
    const invalidEntries = resultFailure(dataPackLayerFromUnknown({ ...validLayer, entries: {} }, decodeNumber));
    expect(invalidEntries).toMatchObject({ _tag: 'DataPackRegistryFailure', reason: 'invalid-layer' });
    const invalidEntryId = resultFailure(dataPackLayerFromUnknown(
      { ...validLayer, entries: [{ id: 1, value: 4 }] },
      decodeNumber,
    ));
    expect(invalidEntryId).toMatchObject({ _tag: 'DataPackRegistryFailure', reason: 'invalid-entry' });
  });

  it("selects exact formats and applies priority with stable equal-priority ordering", () => {
    const base = resultValue(dataPackLayerFromRaw({
      pack: "example:base",
      format: 107.1,
      priority: 0,
      entries: [
        { id: "example:regular", value: "base" },
        { id: "example:other", value: "base-other" },
      ],
    }));
    const samePriority = resultValue(dataPackLayerFromRaw({
      pack: "example:same",
      format: 107.1,
      priority: 1,
      entries: [{ id: "example:regular", value: "same-priority" }],
    }));
    const higherPriority = resultValue(dataPackLayerFromRaw({
      pack: "example:higher",
      format: 107.1,
      priority: 2,
      entries: [{ id: "example:regular", value: "higher" }],
    }));
    const differentFormat = resultValue(dataPackLayerFromRaw({
      pack: "example:other-format",
      format: 107,
      priority: 100,
      entries: [{ id: "example:regular", value: "wrong-format" }],
    }));

    const selected = selectDataPackRegistry(
      [differentFormat, higherPriority, base, samePriority],
      resultValue(DataPackFormat(107.1)),
    );

    expect(selected.get(NamespacedResourceLocation("example:regular"))).toBe(
      "higher",
    );
    expect(selected.get(NamespacedResourceLocation("example:other"))).toBe(
      "base-other",
    );
    expect(selected.has(NamespacedResourceLocation("example:wrong"))).toBe(
      false,
    );

    const equalPriorityFirst = resultValue(dataPackLayerFromRaw({
      pack: "example:first",
      format: 107.1,
      priority: 1,
      entries: [{ id: "example:regular", value: "first" }],
    }));
    const equalPrioritySecond = resultValue(dataPackLayerFromRaw({
      pack: "example:second",
      format: 107.1,
      priority: 1,
      entries: [{ id: "example:regular", value: "second" }],
    }));
    const equalPrioritySelected = selectDataPackRegistry(
      [equalPriorityFirst, equalPrioritySecond],
      resultValue(DataPackFormat(107.1)),
    );

    expect(
      equalPrioritySelected.get(NamespacedResourceLocation("example:regular")),
    ).toBe("second");
  });

  it("maps registry ids to vanilla data paths", () => {
    expect(
      resultValue(dataPackResourcePath(
        NamespacedResourceLocation("minecraft:sulfur_cube_archetype"),
        NamespacedResourceLocation("example:regular"),
      )),
    ).toBe("data/example/sulfur_cube_archetype/regular.json");
    const pathTraversal = dataPackResourcePath(
      NamespacedResourceLocation("minecraft:recipe"),
      NamespacedResourceLocation("example:../secret"),
    );
    expect(Result.isFailure(pathTraversal)).toBe(true);
    if (Result.isFailure(pathTraversal)) {
      expect(pathTraversal.failure).toMatchObject({
        _tag: 'DataPackRegistryFailure',
        reason: 'invalid-resource-path',
      });
    }
  });
});

describe("Sulfur Cube data-pack registry", () => {
  it("decodes and selects typed archetype layers", () => {
    const base = resultValue(sulfurCubeLayerFromRaw({
      pack: "example:base",
      format: 107.1,
      priority: 0,
      entries: [{ id: "example:regular", value: sulfurCubeOptions }],
    }));
    const override = resultValue(sulfurCubeLayerFromRaw({
      pack: "example:override",
      format: 107.1,
      priority: 1,
      entries: [
        {
          id: "example:regular",
          value: { ...sulfurCubeOptions, buoyant: false },
        },
      ],
    }));

    expect(base.entries[0]?.value.buoyant).toBe(true);
    const invalid = resultFailure(sulfurCubeLayerFromRaw({
      pack: "example:invalid",
      format: 107.1,
      priority: 0,
      entries: [{ id: "example:invalid", value: {} }],
    }));
    expect(invalid).toStrictEqual({
      _tag: "InvalidSulfurCubeArchetypeOptions",
      value: {},
    });

    const selected = selectSulfurCubeArchetypes(
      [base, override],
      resultValue(DataPackFormat(107.1)),
    );

    expect(
      selected.get(NamespacedResourceLocation("example:regular"))?.buoyant,
    ).toBe(false);
    expect(resultValue(
      sulfurCubeArchetypeDataPath(
        NamespacedResourceLocation("minecraft:regular"),
      ),
    )).toBe("data/minecraft/sulfur_cube_archetype/regular.json");
  });

  it("decodes archetype values through the generic data-pack boundary", () => {
    const decoded = resultValue(sulfurCubeArchetypeDataPackLayerFromUnknown({
      pack: "example:json",
      format: 107.1,
      priority: 0,
      entries: [{ id: "example:regular", value: sulfurCubeOptions }],
    }));

    expect(decoded.entries[0]?.value.buoyant).toBe(true);
  });
});
