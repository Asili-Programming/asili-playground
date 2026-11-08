# File and folder icons

These are the file and folder icons of the **Material Icon Theme** (pkief.material-icon-theme 5.40.0,
MIT: see LICENSE.txt), as VS Code shows them. `theme.json` is its `dist/material-icons.json`, reduced to
the lookup tables the IDE uses (file names, extensions, folder names, the default icons and the icon
definitions). `icons.js` does the lookup.

Changes made for the IDE:
- `asili.svg` is the Asili logo (a copy of `logo-mark.svg`); `.as` files use it instead of the theme's
  ActionScript icon.

To update: copy `icons/*.svg` and `dist/material-icons.json` from the new extension version, keep the
`asili` override, and run `node scripts/test_icons.mjs`.
