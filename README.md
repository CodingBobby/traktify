<p align="center">
  <img src="https://i.imgur.com/Y5rSPSm.png" width="128"/>
</p>

<h1 align="center"> <a href="https://codingbobby.xyz/traktify">Traktify</a> </h1>

> A multi platform desktop app for trakt.tv

![master_build][master_build]
![dev_build][dev_build]

![quality][quality]
![size][size]
![top_lang][top_lang]
![electron][electron]

Traktify provides super easy super fast access to your trakt.tv account. User experience is our top priority.

Visit the project's website [here](https://codingbobby.xyz/traktify).


## Features
So let us tell you what traktify can do—because thats what you really care about right?

### Fast-access dashboard
![screen_dashboard](https://i.imgur.com/XOTBUlz.png)

Traktify's dashboard offers a clean overview of whats up next to watch for you. From here, you can add episodes you just watched to your history. The search panel allows blazing-fast access to the entire trakt database. Via shortcuts, filtering search results is made very easy.

### Keyboard shortcuts
If you're a keyboard orientated person, we've got you. Simple commands allow you to quickly jump through traktify's pages and panels.

### Customization
A wide range of settings let you customize the look and feel of your app. You can apply different accent colors, background textures and more.

### Discord integration
If you wish, you can let traktify show a beautiful rich-presence on your Discord profile. All you need to do is clicking a button.

You can find more images in this [gallery](https://imgur.com/a/1BFUMGm).


## Getting started
Traktify is currently at it's climax of development. You can dive in really soon.

### Requirements
Traktify is an electron based app and thus requires a Windows 7 (and higher) or macOS 10.10 (and higher) machine to run on. You'll also need a [Node.js](https://nodejs.org/en/download/) installation. Traktify is tested on versions higher than `v10.10.0` but we recommend the latest `LTS` release.

If you want to use the Discord Rich-Presence integration, you'll also have to install [Python](https://www.python.org/downloads/).


## Contributing
Contributions are very welcome! To report issues and start pull requests, please use github's integrated systems.

A detailed documentation for developers is available [here](https://codingbobby.xyz/traktify/docs). Please note that this might not be complete.

### Quickstart
To start working on Traktify, you first need to clone this repository:
```sh
git clone https://github.com/CodingBobby/traktify.git
cd traktify
```
After that, you install the required dependencies. This might take a while.
```sh
brew install node npm
npm i
```
Because Traktify uses several APIs, you will need keys for them. We provide development keys that are used by default but you can use your own.

You can now hop in and do several things:
 - Start app in development mode: `npm start`
 - Run test suites: `npm run test`
 - Package the app for your operating system: `npm run pack`

When building, make sure to set the environment to `'production'` at the start of `app.js`.


## Credits

### Authors
   - [Bumbleboss](https://github.com/Bumbleboss): Frontend developer & Graphics designer
   - [CodingBobby](https://github.com/CodingBobby): Backend developer

### 3rd Party Dependencies
   - [Jean van Kasteel](https://github.com/vankasteelj): `trakt.tv` and `fanart.tv`
   - [Roy Riojas](https://github.com/royriojas): `flat-cache`



<!-- long links -->
[top_lang]: https://img.shields.io/github/languages/top/CodingBobby/traktify.svg?style=flat-square
[quality]: https://img.shields.io/codacy/grade/a68c06c191d54df0879b854c05c2ea79/master.svg?style=flat-square
[electron]: https://img.shields.io/github/package-json/dependency-version/CodingBobby/traktify/dev/electron.svg?style=flat-square
[size]: https://img.shields.io/github/repo-size/CodingBobby/traktify.svg?style=flat-square
[dev_build]: https://img.shields.io/circleci/build/github/CodingBobby/traktify/development?label=dev%20build&style=flat-square
[master_build]: https://img.shields.io/circleci/build/github/CodingBobby/traktify/master?label=build&style=flat-square
