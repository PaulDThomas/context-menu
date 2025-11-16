[npm]: https://img.shields.io/npm/v/@asup/context-menu
[npm-url]: https://www.npmjs.com/package/@asup/context-menu
[size]: https://packagephobia.now.sh/badge?p=@asup/context-menu
[size-url]: https://packagephobia.now.sh/result?p=@asup/context-menu

[![npm][npm]][npm-url]
[![size][size]][size-url]
![npm bundle size](https://img.shields.io/bundlephobia/min/@asup/context-menu)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://raw.githubusercontent.com/PaulDThomas/context-menu/master/LICENCE)

# @asup/context-menu

REACT Context menu, because I couldn't quite find what I wanted.

## Installation

```
# with npm
npm install @asup/context-menu
```

## Usage

Context menu provider, takes a list of available actions and renders a context menu on appropriate click.
Sub menus can be added within each item.
Wrap around the elements that need to have the menu.

```
import { ContextMenuProvider, IMenuItem } from '@asup/context-menu';

<ContextMenuHandler
  menuItems={[
    {
      label: 'Item 1',
      action: () => {
        console.log('Item 1 function run');
      },
    },
    {
      label: 'Item 2',
      action: () => console.log('Item 2 function run'),
      group: [
        { label: 'Subitem 2.1', action: () => console.log('Item 2.1 function run') },
      ],
    },
    {
      label: 'Item 3',
      action: () => console.log('Item 3 function run'),
      disabled: true,
    },
  ]}
>
  <Chilren
    where the context menu is applied...
  />
</ContextMenuHandler>

```

```
import { ContextWindowStack, ContextWindow }

// Context window stack needs to cover the application, or portion where context windows cannot clash with each other
<ContextWindowStack>
 ...rest of app

  <ContextWindow
    id='window-1'
    title={'Window 1'}
    visible={visible}
    style={ window styling, applied to the window div}
    onOpen={ called function on opening}
    onClose={ called function on closing (close cross in the window)}
  >
    {window contents}
  </ContextWindow>

  <ContextWindow
    id='window-2'
    title={'Window 2'}
    visible={visible}
    style={ window styling, applied to the window div}
    onOpen={ called function on opening}
    onClose={ called function on closing (close cross in the window)}
  >
    {window contents}
  </ContextWindow>

 ...end of app

</ContextWindowStack>

```

## Development

This project uses [semantic-release](https://github.com/semantic-release/semantic-release) for automated version management and package publishing.

### Automated Releases

Releases are automatically created when changes are pushed to the `main` or `master` branch using [npm trusted publishing](https://docs.npmjs.com/trusted-publishers) with OpenID Connect (OIDC). This eliminates the need for long-lived npm tokens and automatically generates provenance attestations for supply chain security.

The release process:

1. Analyzes commit messages to determine the next version number
2. Generates release notes from commits
3. Updates the package version
4. Publishes to npm with cryptographic provenance
5. Creates a GitHub release

#### Setup Requirements

To enable publishing, configure a trusted publisher in the [npm package settings](https://www.npmjs.com/package/@asup/context-menu/access):

1. Go to your package settings → "Trusted Publisher"
2. Add GitHub Actions as a publisher
3. Specify:
   - Repository: `PaulDThomas/context-menu`
   - Workflow file: `release.yml`
   - Branch: `main` or `master`

No npm token is required—authentication uses OIDC through GitHub Actions.

#### Commit Message Format

To trigger a release, use [Conventional Commits](https://www.conventionalcommits.org/) in your commit messages:

- `fix:` - patches a bug (PATCH version bump)
- `feat:` - introduces a new feature (MINOR version bump)
- `BREAKING CHANGE:` - introduces a breaking change (MAJOR version bump)
