# Build
To build installers for Mac and Windows, this is the workflow to follow:

## Mac
```bash
npm run package-mac
npm run installer-mac
```

## Windows
```bash
npm run package-win
npm run installer-win
```

## Structure
The building process generates these directories:

```cson
traktify:
   release-builds:
      installers:
         darwin # contains Setup.dmg
         win32 # contains Setup.exe
      packages:
         traktify-darwin-x64
         traktify-win32-ia32
```
