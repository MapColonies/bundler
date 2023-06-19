# Bundler
Provides an efficient way for bundling code and its artifacts into inner networks

[![asciicast](https://asciinema.org/a/Ko12EFam0iIzZRYuG32qQNMY3.svg)](https://asciinema.org/a/Ko12EFam0iIzZRYuG32qQNMY3)

## Usage
The bundler comes with a cli tool providing 3 commands:

```
Usage: bundler <command> [options]
Commands:
  bundler bundle  bundle github repositories and their artifacts into a single archive
  bundler list    list github repositories according to filters
  bundler verify  verify the pre-requisites for bundling are set up correctly
Global Options:
  -v, --verbose  cli verbosity  [boolean] [default: false]
  -t, --token    github access token  [string]
  -h, --help     Show help  [boolean]
      --version  Show version number  [boolean]
```

#### Global Options:
- `verbose`: the cli comes with a neat terminal user interface. by providing the verbose flag the ui will be deactivated and logs from the level of `debug` or higher will be streamed to the terminal
- `token`: private github repositories require a valid github token. to bundle\list such repositories a token must be provided upon command. to set a persistent token see [local configuration](#Local-Configuration)

## Bundle command
Bundles single/multiple repositories and their artifacts into a single tar.gz archive ready for bdila
a repository is provided by `{owner}/{name}/{ref}`
- owner is non-required, defaults to `MapColonies`
- name is required, the repository name
- ref is non-required and can be a tag, a release, or a branch defaults to the `master` branch

### repository artifacts are:
- docker images: will look for dockerfiles on the repository. supports `Dockerfile` and `Dockerfile.migration` files - the images can be built locally or pulled from a registry
- helm packages: supports the packaging of the contents of `helm` directory
- assets: all attached assets to specified release

```
> bundler bundle
bundle github repositories and their artifacts into a single archive
Global Options:
  -v, --verbose  verbosity flag  [boolean] [default: false]
  -t, --token    github access token  [string]
  -h, --help     Show help  [boolean]
      --version  Show version number  [boolean]
Options:
  -w, --workdir                                     the bundler working directory  [string] [default: "$HOME/.bundler-cli/workdir"]
  -o, --outputPath                                  the bundler output file path  [string] [required]
  -O, --override                                    potentially override an existing output file path  [boolean] [default: false]
  -c, --cleanupMode                                 the bundle execution cleanup mode  [string] [choices: "none", "on-the-fly", "post"] [default: "on-the-fly"]
  -d, --isDebugMode, --debug                        child processes logs will be logged  [boolean] [default: false]
  -l, --buildImageLocally, --build-image-locally    build image(s) locally  [boolean] [default: false]
  -m, --includeMigrations, --include-migrations     include the migrations image of given repository  [boolean] [default: false]
  -a, --includeAssets, --include-assets             include the release assets of given repository  [boolean] [default: false]
  -H, --includeHelmPackage, --include-helm-package  include the packages helm chart of given repository  [boolean] [default: false]
  -r, --repository, --repo                          the repository to bundle  [string]
  -R, --repositories, --repos                       the repositories to bundle  [array]
  -i, --input                                       input file request  [string]
Examples:
  bundler bundle -r ts-server-boilerplate -l -o ./output.tar.gz                             >>  bundle the given repository by building locally
  bundler bundle -R replica-server@v1.0.1 osm-sync-tracker@v3.2.0 -a -H -o ./output.tar.gz  >>  bundle given repositories by pulling from registry and including given flags
  bundler bundle -i ./examples/input.json -o ./output.tar.gz                                >>  bundle according to the given possibly mixed criterias in the input file

```

- `workdir`: a single bundle run command working directory, this directory consists mainly of temporary files and its cleaning up is defined by `cleanupMode`
- `outputPath`: the path to the resulting bundle `tar.gz` archive. other than the bundle archive the bundler will output a [checksum file](#checksum)
- `override`: potentially override an existing output file path
- `isDebugMode`: child processes (docker, helm, etc.) logs will be logged as well
- `cleanupMode`: supports 3 modes
    - `none`: won't clean up anything
    - `on-the-fly`: cleans dangling artifacts mid-execution time once they are unnecessary
    - `post`: sweeps all the unnecessary files only after the bundle is ready
- `buildImageLocally`: all the image artifacts will be built locally instead of pulled from a registry
- `includeMigrations`: will build/pull migration images and include them on the bundle
- `includeAssets`: will download all the assets attached to the repository release and include them on the bundle
- `includeHelmPackage`: will package helm directories and include them on the bundle
- the repositories for a bundle can be provided in 3 fashions that conflict with one another:
    - `repository`: bundle a single repository
    - `repositories`: bundle multiple repositories
    - `input`: the path to an input file consisting of the repositories to be bundled and their include-artifacts flags. this option provides the possibility to have a mixture of include flags as well as a `buildArgs` option (key value string pair object) that corresponds to a truthy `buildImageLocally` flag. once provided the other include flags will be dismissed, [see example](packages/cli/examples/input.json).
    `input` could also be a path to a [`manifest.yaml file`](packages/cli/examples/manifest.yaml), previous bundle manifests are located in `historyDir`

### Manifest
The bundler will produce a `manifest.yaml` file depicting the input parameters and the resulting output of the bundle. the file will be located in the bundle archive root level, [see example](packages/cli/examples/manifest.yaml)

### Checksum
Other than the bundle archive itself the bundler will produce a `checksum.yaml` file. this is a checksum of the tar.gz archive file and can be used to verify the bdila process went accordingly

## List command
Lists all the repositories in correspondence to the filter flags, will list only non-archived repositories that match at least one of provided topics
[read more on topics](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/classifying-your-repository-with-topics)
```
> bundler list
list github repositories according to filters
Global Options:
  -v, --verbose  verbosity flag  [boolean] [default: false]
  -t, --token    github access token  [string]
  -h, --help     Show help  [boolean]
      --version  Show version number  [boolean]
Options:
  -V, --visibility  filter by repo visibility  [string] [choices: "all", "public", "private"] [default: "all"]
  -T, --topics      filter by topics  [array]
Examples:
  bundler list -V public -T javascript docker helm  >>  lists public repositories from the given topics
```

## Verify command

Checks that all pre-requisites are set up correctly: internet connectivity, docker, docker-pull-registry, helm, and possibly provided github access token

```
> bundler verify
verify the pre-requisites for bundling are set up correctly
Global Options:
  -v, --verbose  verbosity flag  [boolean] [default: false]
  -t, --token    github access token  [string]
  -h, --help     Show help  [boolean]
      --version  Show version number  [boolean]
Examples:
  bundler verify --token X  >>  verifies the environment including the verification of given token X
```

### Local Configuration
The cli holds a local configuration located in the cli working directory `$HOME/.bundler-cli/config.json`

The configuration has the following schema:
- `workdir`: path to a single bundle command working directory. defaults to `$HOME/.bundler-cli/workdir`
- `historyDir`: path to the a past bundles manifests and checksums directory. defaults to `$HOME/.bundler-cli/history`
- `githubAccessToken`: a consistent token to be used by default. can be overrided by providing --token flag
```json
{
    "workdir": "/tmp/bundler-cli",
    "historyDir": "/tmp/bundler-cli/history",
    "githubAccessToken": "secret"
}
```

### Logs
Each cli run creates a single local log file consisting of the targeted logs defined by the `verbose` and `isDebugMode` flags.
All log files are located in the cli working directory `$HOME/.bundler-cli/logs`

- a failed cli run will provide the path to its log file
- a successful cli run will remove its log file from the local system


### Environment Variables
Any option that can be set using the cli command line, can be also set by writing its value in `SNAKE_CASE`.
For example, the option `--isDebugMode` can be set by using the `IS_DEBUG_MODE` environment variables.

## Development
This repository is a monorepo managed by [`Lerna`](https://lerna.js.org/) and separated into multiple independent packages

![graph](https://user-images.githubusercontent.com/57397441/214806302-e6dc6465-c6b9-4f39-a960-fec4313f7715.png)

### Building
```
npx lerna run build
```

### Run Tests
```
npx lerna run test
```