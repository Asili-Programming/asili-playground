# Interface icons

`material-icons.woff` and `product-icons.json` are the **Material product icon theme** (pkief.material-product-icons
1.7.1, MIT: see LICENSE.md), as VS Code uses it for its interface icons. `product-icons.json` maps the icon names
to their code points in the font. The IDE uses the font for its explorer toolbar, its view tabs and its Run
and Stop buttons (`productIconHTML` in `main.js`). Where a name has no icon, the IDE keeps its own SVG.
