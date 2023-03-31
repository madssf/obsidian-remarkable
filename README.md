# obsidian-remarkable

This is an Obsidian plugin for converting .md files to .pdf and upload them to my.remarkable.com

## Requirements
- [rmapi](https://github.com/juruen/rmapi)
- [golang](https://go.dev/doc/install) (for running rmapi)
- [md-to-pdf](https://github.com/simonhaenisch/md-to-pdf)
- [node](https://nodejs.dev/en/learn/how-to-install-nodejs/) (for running md-to-pdf)

You will need to specify the path to `rmapi`, `md-to-pdf` and `node` in the plugin settings.


## Installation

`cd <path to vault>/.obsidian/plugins`

`git clone <this repo>`

`cd obsidian-remarkable`

`npm run build`

The plugin should now show up in your Obsidian app.

