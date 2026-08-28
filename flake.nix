{
  description = "mc-kernel: Minecraft domain data and pure logic for block/item registries, recipes, cooking, brewing, stonecutting, smithing, grindstones, crops, dimensions, Java and Bedrock mining, breaking, chunks, anvils, coordinates, projectiles, explosions, TNT, camera, time, weather, vitals, frame timing, and clock ports.";

  inputs = {
    # nixos-unstable, not nixpkgs-unstable: it advances only after the NixOS
    # release tests pass, so it is less likely to land a broken build.
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs =
    { nixpkgs, ... }:
    let
      # Only what is actually exercised: x86_64-linux by CI, aarch64-darwin by
      # the maintainer. Declaring a platform nothing builds makes
      # `nix flake check --all-systems` fail rather than skip it.
      systems = [
        "x86_64-linux"
        "aarch64-darwin"
      ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
      pkgsFor = system: nixpkgs.legacyPackages.${system};
    in
    {
      # Keep Nix formatting available to both supported systems. This makes
      # `nix fmt -- --check flake.nix` part of the repository's own flake
      # contract. The explicit file argument makes the check work with
      # nixfmt's file-oriented CLI as well as editor integrations.
      formatter = forAllSystems (system: (pkgsFor system).nixfmt);

      devShells = forAllSystems (
        system:
        let
          pkgs = pkgsFor system;
        in
        {
          # Node 24 matches the `engines` field and the CI runner. pnpm comes
          # from corepack rather than nixpkgs so that the version is decided by
          # the `packageManager` field in package.json — one source of truth
          # instead of two that can drift.
          #
          # oxlint is intentionally supplied by Nix rather than package.json.
          # This keeps the executable version in the reproducible development
          # shell and avoids a second package-manager lockfile entry.
          #
          # ast-grep is here for the same reason, and covers what oxlint cannot:
          # it implements none of no-restricted-syntax, no-restricted-properties
          # or no-restricted-globals, so the org-wide ban on reading a
          # process-global clock had no mechanical gate. `.ast-grep/rules/`
          # holds that gate. Structural matching is the point — the ban is
          # documented in prose beside the code it governs, and a textual check
          # would fail its own documentation.
          default = pkgs.mkShell {
            packages = [
              pkgs.nodejs_24
              pkgs.corepack_24
              pkgs.typescript-language-server
              pkgs.oxlint
              pkgs.ast-grep
            ];

            shellHook = ''
              mkdir -p "$PWD/.corepack"
              corepack enable --install-directory "$PWD/.corepack"
              export PATH="$PWD/.corepack:$PATH"
            '';
          };
        }
      );
    };
}
