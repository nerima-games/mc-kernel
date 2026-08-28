import { describe, expect, it } from "vitest";

import {
  DataPackFormat,
  DataPackPriority,
  dataPackLayer,
  dataPackLayerFromUnknown,
  dataPackLayerFromUnknownWithId,
  dataPackResourcePath,
  mapDataPackLayer,
  selectDataPackRegistry,
} from "../src/domain/data-pack-registry";
import { NamespacedResourceLocation } from "../src/domain/identifiers";
import {
  SULFUR_CUBE_ITEM_TAGS,
  type SulfurCubeArchetypeOptions,
} from "../src/domain/sulfur-cube";
import {
  selectSulfurCubeArchetypes,
  sulfurCubeArchetypeDataPackLayer,
  sulfurCubeArchetypeDataPackLayerFromUnknown,
  sulfurCubeArchetypeDataPath,
} from "../src/domain/sulfur-cube-registry";

const sulfurCubeOptions = {
  items: SULFUR_CUBE_ITEM_TAGS.food,
  buoyant: true,
  attributeModifiers: [
    {
      attribute: "minecraft:bounciness",
      id: "minecraft:test_bounciness",
      amount: 0.25,
      operation: "add_value",
    },
  ],
  knockbackModifiers: {
    horizontalPower: 1,
    verticalPower: 0.5,
  },
  soundSettings: {
    hitSound: "minecraft:entity.slime.squish",
    pushSound: "minecraft:entity.slime.jump",
    pushSoundImpulseThreshold: 0.4,
    pushSoundCooldown: 0.2,
  },
} satisfies SulfurCubeArchetypeOptions;

describe("data-pack registry", () => {
  it("brands valid formats and priorities and rejects invalid values", () => {
    expect(DataPackFormat(107.1)).toBe(107.1);
    expect(DataPackPriority(3)).toBe(3);
    expect(() => DataPackFormat(Number.NaN)).toThrow();
    expect(() => DataPackFormat(Number.POSITIVE_INFINITY)).toThrow();
    expect(() => DataPackFormat(-1)).toThrow();
    expect(() => DataPackPriority(1.5)).toThrow();
    expect(() => DataPackPriority(-1)).toThrow();
  });

  it("normalizes and freezes a namespaced layer", () => {
    const layer = dataPackLayer({
      pack: "example:base",
      format: 107.1,
      priority: 0,
      entries: [{ id: "example:regular", value: "base" }],
    });

    expect(layer.pack).toBe(NamespacedResourceLocation("example:base"));
    expect(layer.format).toBe(DataPackFormat(107.1));
    expect(layer.priority).toBe(DataPackPriority(0));
    expect(layer.entries[0]).toEqual({
      id: NamespacedResourceLocation("example:regular"),
      value: "base",
    });
    expect(Object.isFrozen(layer)).toBe(true);
    expect(Object.isFrozen(layer.entries)).toBe(true);
    expect(Object.isFrozen(layer.entries[0])).toBe(true);
    expect(() =>
      dataPackLayer({
        pack: "example:base",
        format: 107.1,
        priority: 0,
        entries: [
          { id: "example:regular", value: "base" },
          { id: "example:regular", value: "duplicate" },
        ],
      }),
    ).toThrow();
    expect(() =>
      dataPackLayer({
        pack: "base",
        format: 107.1,
        priority: 0,
        entries: [],
      }),
    ).toThrow();
    expect(() =>
      dataPackLayer({
        pack: "example:base",
        format: 107.1,
        priority: 0,
        entries: [{ id: "regular", value: "invalid" }],
      }),
    ).toThrow();
  });

  it("maps values while preserving the layer identity and frozen entries", () => {
    const layer = dataPackLayer({
      pack: "example:base",
      format: 107.1,
      priority: 0,
      entries: [{ id: "example:regular", value: "base" }],
    });

    const mapped = mapDataPackLayer(layer, (value) => value.length);

    expect(mapped.pack).toBe(layer.pack);
    expect(mapped.format).toBe(layer.format);
    expect(mapped.priority).toBe(layer.priority);
    expect(mapped.entries).toEqual([
      { id: NamespacedResourceLocation("example:regular"), value: 4 },
    ]);
    expect(Object.isFrozen(mapped)).toBe(true);
    expect(Object.isFrozen(mapped.entries)).toBe(true);
    expect(Object.isFrozen(mapped.entries[0])).toBe(true);
  });

  it("decodes an unknown layer at one strict value boundary", () => {
    const validLayer = {
      pack: "example:json",
      format: 107.1,
      priority: 2,
      entries: [{ id: "example:regular", value: 4 }],
    };
    const decodeNumber = (value: unknown): number => {
      if (typeof value !== "number") {
        throw new TypeError("registry value must be a number");
      }
      return value;
    };
    const decoded = dataPackLayerFromUnknown(validLayer, decodeNumber);

    expect(decoded.entries[0]?.value).toBe(4);
    const decodedWithId = dataPackLayerFromUnknownWithId(
      validLayer,
      (id, value) => `${id}:${String(value)}`,
    );
    expect(decodedWithId.entries[0]?.value).toBe("example:regular:4");
    expect(() =>
      dataPackLayerFromUnknown(
        {
          pack: "example:json",
          format: 107.1,
          priority: 2,
          entries: [{ id: "example:regular", value: 4 }],
          extra: true,
        },
        () => 1,
      ),
    ).toThrow(TypeError);
    expect(() =>
      dataPackLayerFromUnknown(
        {
          pack: "example:json",
          format: 107.1,
          priority: 2,
          entries: [{ id: "example:regular" }],
        },
        () => 1,
      ),
    ).toThrow(TypeError);
    expect(() =>
      dataPackLayerFromUnknown(
        {
          ...validLayer,
          entries: [
            { id: "example:regular", value: 4 },
            { id: "example:regular", value: 5 },
          ],
        },
        decodeNumber,
      ),
    ).toThrow(TypeError);
    expect(() =>
      dataPackLayerFromUnknown({ ...validLayer, pack: 1 }, decodeNumber),
    ).toThrow(TypeError);
    expect(() =>
      dataPackLayerFromUnknown(
        { ...validLayer, format: "107.1" },
        decodeNumber,
      ),
    ).toThrow(TypeError);
    expect(() =>
      dataPackLayerFromUnknown({ ...validLayer, priority: "2" }, decodeNumber),
    ).toThrow(TypeError);
    expect(() =>
      dataPackLayerFromUnknown({ ...validLayer, entries: {} }, decodeNumber),
    ).toThrow(TypeError);
    expect(() =>
      dataPackLayerFromUnknown(
        { ...validLayer, entries: [{ id: 1, value: 4 }] },
        decodeNumber,
      ),
    ).toThrow(TypeError);
  });

  it("selects exact formats and applies priority with stable equal-priority ordering", () => {
    const base = dataPackLayer({
      pack: "example:base",
      format: 107.1,
      priority: 0,
      entries: [
        { id: "example:regular", value: "base" },
        { id: "example:other", value: "base-other" },
      ],
    });
    const samePriority = dataPackLayer({
      pack: "example:same",
      format: 107.1,
      priority: 1,
      entries: [{ id: "example:regular", value: "same-priority" }],
    });
    const higherPriority = dataPackLayer({
      pack: "example:higher",
      format: 107.1,
      priority: 2,
      entries: [{ id: "example:regular", value: "higher" }],
    });
    const differentFormat = dataPackLayer({
      pack: "example:other-format",
      format: 107,
      priority: 100,
      entries: [{ id: "example:regular", value: "wrong-format" }],
    });

    const selected = selectDataPackRegistry(
      [differentFormat, higherPriority, base, samePriority],
      DataPackFormat(107.1),
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

    const equalPriorityFirst = dataPackLayer({
      pack: "example:first",
      format: 107.1,
      priority: 1,
      entries: [{ id: "example:regular", value: "first" }],
    });
    const equalPrioritySecond = dataPackLayer({
      pack: "example:second",
      format: 107.1,
      priority: 1,
      entries: [{ id: "example:regular", value: "second" }],
    });
    const equalPrioritySelected = selectDataPackRegistry(
      [equalPriorityFirst, equalPrioritySecond],
      DataPackFormat(107.1),
    );

    expect(
      equalPrioritySelected.get(NamespacedResourceLocation("example:regular")),
    ).toBe("second");
  });

  it("maps registry ids to vanilla data paths", () => {
    expect(
      dataPackResourcePath(
        NamespacedResourceLocation("minecraft:sulfur_cube_archetype"),
        NamespacedResourceLocation("example:regular"),
      ),
    ).toBe("data/example/sulfur_cube_archetype/regular.json");
  });
});

describe("Sulfur Cube data-pack registry", () => {
  it("decodes and selects typed archetype layers", () => {
    const base = sulfurCubeArchetypeDataPackLayer({
      pack: "example:base",
      format: 107.1,
      priority: 0,
      entries: [{ id: "example:regular", value: sulfurCubeOptions }],
    });
    const override = sulfurCubeArchetypeDataPackLayer({
      pack: "example:override",
      format: 107.1,
      priority: 1,
      entries: [
        {
          id: "example:regular",
          value: { ...sulfurCubeOptions, buoyant: false },
        },
      ],
    });

    expect(base.entries[0]?.value.buoyant).toBe(true);
    expect(() =>
      sulfurCubeArchetypeDataPackLayer({
        pack: "example:invalid",
        format: 107.1,
        priority: 0,
        entries: [{ id: "example:invalid", value: {} }],
      }),
    ).toThrow(TypeError);

    const selected = selectSulfurCubeArchetypes(
      [base, override],
      DataPackFormat(107.1),
    );

    expect(
      selected.get(NamespacedResourceLocation("example:regular"))?.buoyant,
    ).toBe(false);
    expect(
      sulfurCubeArchetypeDataPath(
        NamespacedResourceLocation("minecraft:regular"),
      ),
    ).toBe("data/minecraft/sulfur_cube_archetype/regular.json");
  });

  it("decodes archetype values through the generic data-pack boundary", () => {
    const decoded = sulfurCubeArchetypeDataPackLayerFromUnknown({
      pack: "example:json",
      format: 107.1,
      priority: 0,
      entries: [{ id: "example:regular", value: sulfurCubeOptions }],
    });

    expect(decoded.entries[0]?.value.buoyant).toBe(true);
  });
});
