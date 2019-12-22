const {
   createWindowsInstaller
} = require('electron-winstaller')
const path = require('path')

getInstallerConfig()
   .then(createWindowsInstaller)
   .catch((error) => {
      console.error(error.message || error)
      process.exit(1)
   })

function getInstallerConfig() {
   console.log('creating windows installer...')

   const rootPath = path.join('./')
   const outPath = path.join(rootPath, 'release-builds')

   return Promise.resolve({
      appDirectory: path.join(outPath, 'packages/traktify-win32-ia32/'),
      authors: 'CodingBobby',
      noMsi: true,
      outputDirectory: path.join(outPath, 'installers/win32'),
      exe: 'Traktify.exe',
      setupExe: 'Setup.exe',
      setupIcon: path.join(rootPath, 'assets', 'icons', 'trakt', 'trakt.ico')
   })
}
