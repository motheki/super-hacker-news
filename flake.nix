{
  description = "Super HN";

  inputs = {
    nixpkgs = {
      url = "github:nixos/nixpkgs/nixpkgs-unstable";
    };
    flake-parts = {
      url = "github:hercules-ci/flake-parts";
    };
    treefmt-nix = {
      url = "github:numtide/treefmt-nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    devenv = {
      url = "github:cachix/devenv";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    inputs@{ flake-parts, ... }:
    flake-parts.lib.mkFlake { inherit inputs; } {
      imports = [
        inputs.devenv.flakeModule
        inputs.treefmt-nix.flakeModule
      ];
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "aarch64-darwin"
        "x86_64-darwin"
      ];
      perSystem =
        { ... }:
        {
          treefmt = {
            enableDefaultExcludes = true;
            programs = {
              alejandra.enable = true;
              deadnix.enable = true;
              prettier.enable = true;
              taplo.enable = true;
            };
          };
          devenv.shells.default = {
            name = "super-hacker-news";
            cachix = {
              enable = true;
              pull = [
                "devenv"
                "nixpkgs"
                "flake-parts"
                "cachix"
              ];
            };
            languages = {
              javascript = {
                enable = true;
                lsp = {
                  enable = true;
                };
                bun = {
                  enable = true;
                  install = {
                    enable = true;
                  };
                };
              };
            };
          };
        };
    };
}
