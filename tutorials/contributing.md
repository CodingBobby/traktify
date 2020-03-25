Nice to see you considering to contribute to Traktify in some form. You are very welcome to fork the repo and improve some code, fix issues or even add your own ideas. Please make sure to include a detailed description and reasoning when raising pull requests on [GitHub](https://github.com/CodingBobby/traktify/pulls).

If you encounter an issue or bug, find out if someone else already reported similar problems on the [issue tracker](https://github.com/CodingBobby/traktify/issues) before you submit a new issue. Please do not ask about geneal support there, instead you can join our [Discord Server](https://discord.gg/BJNAMcj) and contact an admin or send us an [email](mailto:traktify@codingbobby.xyz).

Please read the [documentation](https://codingbobby.xyz/traktify/docs) so you can further understand how this project works.


## Table of contents
- [Quickstart](#quickstart)
- [Guidelines](#guidelines)
  - [Code Standards](#code-standards)
  - [Commits](#commits)

## Quickstart <a name="quickstart"></a>
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
Because Traktify uses several APIs, you will need keys for them. We provide development keys that are used by default but you can use your own. More on that later.

You can now hop in and do several things:
 - Start app in development mode: `npm start`
 - Run test suites: `npm run test`
 - Package the app for your operating system: `npm run pack`

When building, make sure to set the environment to `'production'` at the start of `app.js`.


## Guidelines <a name="guidelines"></a>

#### Code Standards <a name="code-standards"></a>
Readable code is top priority. When contributing, follow a general code standard like [StandardJS](https://standardjs.com/rules.html) to ensure this. We are not very consistent ourselves but please, avoid weird code formatting.

We also encourage you to document your code using the [JSDoc](https://jsdoc.app) syntax. This enables us to work type-sensitive which is awesome. Instead of:

```js
// This function returns the sum of numbers inside an array.
function sumArray (arr) {
   let sum = arr.reduce((a, b) => a + b, 0)
   return sum
}
```
… do:
```js
/**
 * Adds the values inside an array.
 * @param {Array.<Number>} arr The array to sum
 * @returns {Number} Sum of array
 */
function sumArray (arr) {
   let sum = arr.reduce((a, b) => a + b, 0)
   return sum
}
```

#### Commits <a name="commits"></a>
First of all, do not worry about "too little" changes. If a single additional line of code fixes a bug, thats commit-worthy. Do not gather a bunch of additions or modifications and combine them into one commit but split them into "topics" they are related to.

Inside your commit message, you will need to brievely explain
- what you did
- why it was necessary
- what side effects result from it.

Please describe your changes in **full sentences** and make sure to start with a descriptive title that indicates whether a bug was fixed, a feature added or the code improved in any other sense.
