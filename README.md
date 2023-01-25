# bundler
the bundler provides an efficient way for bundling code and its artifacts into inner networks

the bundler comes with a cli tool which provides 3 commands:

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

- `verbose`: the cli comes with a neat terminal user interface. by providing the verbose flag the ui will be deactivated and logs from the level of `debug` or higher will be streamed to the terminal
- `token`: private github repositories requires a valid github token. to bundle\list such repositories a token must be provided upon command. to set a persistent token see [local configuration](#local-configuration)

## bundle command
bundles a single / multiple repositories and their artifacts into a single tar.gz archive ready for bdila
a repository is provided by `{owner}/{name}/{ref}`
- owner is non required, defaults to `MapColonies`
- name is required, the repository name
- ref is non required and can be a tag, a release or a branch defaults to the `master` branch

### repository atrifacts are:
- docker images: will look for dockerfiles on the repository. supports `Dockerfile` and `Dockerfile.migration` files - the images can be build locally or pulled from registry
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
  -w, --workdir                                     the bundler working directory  [string] [default: "/home/{hostname}/.bundler-cli/workdir"]
  -o, --outputPath                                  the bundler output file path  [string] [required]
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

- `workdir`: a single bundle run command working directory, this directory consist mainly of temporary files and its cleaning up is defined by `cleanupMode`
- `outputPath`: the path to the resulting bundle `tar.gz` archive. other than the bundle archive the bundler will output a [checksum file](#checksum)
- `cleanupMode`: supports 3 modes
    - `none`: won't cleanup anything
    - `on-the-fly`: cleans dangling artifacts mid execution time once they are unnecessary
    - `post`: sweeps all the unnecessary files only after the bundle is ready
- `buildImageLocally`: all the image artifacts will be build locally instead of pulled from registry
- `includeMigrations`: will build/pull migaration images and include them on the bundle
- `includeAssets`: will download all the assets attached to the repository release and include them on the bundle
- `includeHelmPackage`: will package helm directories and include them on the bundle
- the repositories for bundle can be provided in 3 fashions that conflicts with one another:
    - `repository`: bundle a single repository
    - `repositories`: bundle multiple repositories
    - `input`: the path to a input file consisting the repositories to be bundled and their include artifacts flags. this option provides the possibility to have a mixture of include flags. once provided the other include flags will be dismissed, [see example](packages/cli/examples/input.json)

### manifest
the bundler will produce a `manifest.yaml` file depicting the input parameters and the resulting output of the bundle. the file will be located in the bundle archive root level

### checksum
other than the bundle archive itself the bundler will produce a `checksum.yaml` file of the bundler tar.gz archive file. this checksum can be used to verify the bdila process went accordingly

## list command
lists all the repositories in correspondence to the filter flags, will list only non archived repositories and that match at least one of provided topics
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

## verify command

checks that all pre-requisites are set up correctly: internet connectivity docker, helm and possibly provided github access token

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

### local configuration
the cli holds a local configuration located in the cli working directory `/home/{hostname}/.bundler-cli/config.json`

the configuration holds the following schema:
- `workdir`: path to a single bundle command working directory. defaults to `/home/{hostname}/.bundler-cli/workdir`
- `githubAccessToken`: a consistent token to be used by default. can be overrided by providing --token flag
```json
{
    "workdir": "/tmp/bundler-cli",
    "githubAccessToken": "secret"
}
```

### logs
each cli run creates a single log file consisting the targeted logs defined by the `verbose` and `isDebugMode` flags.
all log files are located in the cli working directory `/home/{hostname}/.bundler-cli/logs`

- a failed cli run will provide the path to its log file
- a successful cli run will remove its log file from the local system
