{
  description = "mc-kernel development shell and formatter";

  inputs = {
    # nixos-unstable, not nixpkgs-unstable: it advances only after the NixOS
    # release tests pass, so it is less likely to land a broken build.
    #
    # flake.lock is pinned to rev 624af66541 (2026-07-26) rather than the channel
    # head: every revision from 2026-08-28 onward ships oxlint >=1.79.0, whose
    # `no-redeclare` rule false-positives on the Effect 4 branded scalar type
    # and same-named constructor pair (`Brand.Brand<'X'>` and `Brand.make<X>(..)`)
    # used throughout src/domain (proven by A/B testing
    # oxlint 1.75.0 vs 1.79.0 against the same source tree — 0 vs 59 warnings;
    # still present in 1.88). Re-check the rule before updating the pin.
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs =
    { nixpkgs, ... }:
    let
      # CI uses x86_64-linux; the maintainer uses aarch64-darwin. Declaring
      # other systems makes `nix flake check --all-systems` fail on missing
      # outputs.
      systems = [
        "x86_64-linux"
        "aarch64-darwin"
      ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
      pkgsFor = system: nixpkgs.legacyPackages.${system};
    in
    {
      formatter = forAllSystems (system: (pkgsFor system).nixfmt);

      devShells = forAllSystems (
        system:
        let
          pkgs = pkgsFor system;
        in
        {
          # Node 26 matches CI; the `engines` field allows Node 24. The pinned
          # `corepack_24` shim uses Node from PATH. Corepack, rather than nixpkgs,
          # gets pnpm's version from `packageManager` in package.json, avoiding a
          # second version source that can drift.
          #
          # oxlint is intentionally supplied by Nix rather than package.json.
          # This keeps the executable version in the reproducible development
          # shell and avoids a second package-manager lockfile entry.
          #
          # ast-grep is here for the same reason, and covers what oxlint cannot:
          # it implements none of no-restricted-syntax, no-restricted-properties
          # or no-restricted-globals, so the org-wide ban on reading a
          # process-global clock had no mechanical gate. `.ast-grep/rules/`
          # holds that gate. The ban is documented in prose beside the code it
          # governs, and a textual check would fail its own documentation.
          default = pkgs.mkShell {
            packages = [
              pkgs.nodejs_26
              pkgs.corepack_24
              pkgs.typescript-language-server
              pkgs.oxlint
              pkgs.ast-grep
            ];

            shellHook = ''
              corepackDir="$(mktemp -d "''${TMPDIR:-/tmp}/mc-kernel-corepack.XXXXXX")"
              trap 'rm -r "$corepackDir"' EXIT
              corepack enable --install-directory "$corepackDir"
              export PATH="$corepackDir:$PATH"
            '';
          };
        }
      );
    };
}
