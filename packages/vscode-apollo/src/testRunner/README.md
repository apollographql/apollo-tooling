# Jest TestRunner

Huge thanks to Unibeautify for their initial work on this. Most of the code in `/testRunner` is utilizing their work, barring some changes to configuration.

For reference, see:
https://github.com/Unibeautify/vscode/tree/master/test

## Notes

The test runner itself must be compiled for VSCode to run it, so it lives in `src` and gets compiled to js. However, it's not included in the final build via the `.vscodeignore` file.

The tests themselves don't need to be compiled due to `ts-jest`, so they're ignored in the `tsconfig.json`
