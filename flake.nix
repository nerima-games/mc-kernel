{
  description = "mc-kernel development shell and formatter";

  inputs = {
    # nixos-unstable, not nixpkgs-unstable: it advances only after the NixOS
    # release tests pass, so it is less likely to land a broken build.
    #
    # Keep flake.lock at nixpkgs rev 624af665: oxlint 1.79 reports false
    # no-redeclare warnings for the branded-type pattern in src/domain. That
    # revision provides oxlint 1.75.0. Re-check the rule before updating the pin.
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs =
    { nixpkgs, ... }:
    let
      # CI runs on x86_64-linux; the maintainer develops on aarch64-darwin.
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
          # Pinned nixpkgs packages Corepack with Node 24 only. Its pnpm shim
          # selects Node from PATH, so this shell uses Node 26 for pnpm and the
          # project. pnpm's version comes from package.json's `packageManager`.
          #
          # oxlint is intentionally supplied by Nix rather than package.json.
          # This keeps the executable version in the reproducible development
          # shell and avoids a second package-manager lockfile entry.
          #
          # ast-grep blocks Date.now(), performance.now(), and new Date() in
          # src/, which oxlint cannot express with its no-restricted-* rules.
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
