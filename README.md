# Vercel Project Manager

Manage Vercel projects from the comfort of VSCode

Available on the [VSCode Marketplace](https://marketplace.visualstudio.com/items?itemName=AaronDill.vercel-project-manager-vscode)!

![Image of side panel](side-panel-screenshot.png)

### Important note:

The CLI commands require the [Vercel CLI](https://vercel.com/docs/cli) to be installed. You can still use this extension without it, however generally, this CLI creates the `.vercel/project.json` required for this extension to detect the current project.
Without the Vercel CLI installed **globally** (install with `npm i -g vercel`) the following commands will not work:

- Run a development server through Vercel
- Link current workspace to a Vercel project
- Deploy working directory to Vercel

## Features

- Manage deployments in the activity panel
- Add, edit, and remove environment variables without ever leaving VSCode!

## Setup

This extension will automatically detect any project with a `.vercel/project.json` file in it and use the project id defined in that file. If you are unsure of where that file comes from, check out the [Vercel CLI](https://vercel.com/docs/cli).
If you already have the Vercel CLI installed, run `vercel link` in your terminal or use the button on the side panel to connect to a Vercel project.

Run the `Log in` command to log into your vercel account.
Note: When using the CLI, you may need to log in a second time.

## Extension Settings

This extension contributes the following settings:

- `vercel.RefreshRate`: Number of minutes to wait between refreshes of Deployments and Environment. (Default 5 minutes)
- `vercel.DeploymentCount`: Number of deployments to display from Vercel. (Default 20)
- `vercel.DashboardURL`: (For use with teams) The URL to append the project name to. If not set, it will default to https://vercel.com/{user}/{project}"

## Contributing

- Run `npm run compile` to compile your changes into the `dist` directory
- Run `npm run watch` to compile your changes and recompile when a file changes.
- Run `npm run lint` to lint the src directory for typos and errors and fix them if possible.
- Run `npm run package` to compile the extension in a production environment
- Run `npm run ext:package` to package the extension into a `*.vsix` file to be installed with `code --install-extension "<FILE>"` (vsce is required to be installed for this!)
