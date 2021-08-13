An electron app consists of at least two separate processes:
 - main `node.js` process (backend)
 - web-like renderer process (frontend)

The renderer process is what the user gets to see and controls when clicking around in the app.
It handles `onclick` events, `DOM` modification, etc.—just what a normal webside would and could do.
But a "native" app is much more than just a website and requires communication with a backend to retreive data, access local files or to modify the app window itself which is not part of the "website".

Fortunately, communication between front- and backend inside an electron app is easier than using traditional `HTTP` requests.
It uses `ipcMain` and `ipcRenderer` but to make it more documentable and unified througout traktify, the class {@link Modules.Manager.SwitchBoard} was implemented.

## Table of Contents
- [Frontend Calls Backend](#front-back)
- [Backend Calls Frontend](#back-front)


<a name="front-back"></a>

## Frontend Calls Backend
The frontend might want to display data that is currently only available to the backend.
Inside `index.js` loaded by `index.html`:
```js
const SB = new SwitchBoard()

// request property `age` of the user
SB.send('user-data', 'age').then(age => {
  // do stuff with the reply
  console.log(`the user is ${age} years old`)
})
```

Inside `main.js` called by node:
```js
// an electron app was stared which loaded `index.html`
const win = new electron.BrowserWindow()
...

// data available to the app only
const user = {
  name: 'Alice',
  age: 27,
  job: 'developer'
}

const SB = new SwitchBoard({
  window: win // browser-window to connect with
})

// listen for requests coming from the browser-window
SB.on('user-data', (key, send) => {
  // send back the requested data
  send(user[key])
})
```


<a name="back-front"></a>

## Backend Calls Frontend
The backend might want to instruct the frontend to display something.
Inside `main.js` called by node:
```js
// an electron app was stared which loaded `index.html`
const win = new electron.BrowserWindow()
...

// data available to the app only
const user = {
  name: 'Alice',
  age: 27,
  job: 'developer'
}

const SB = new SwitchBoard({
  window: win // browser-window to connect with
})

SB.send('display', `Good morning, ${user.name}!`)
```

Inside `index.js` loaded by `index.html`:
```js
const SB = new SwitchBoard()

// wait for instructions from the app
SB.on('display', (message, done) => {
  // here, we have access to the DOM
  document.alert(message)

  // main is not waiting for anything but otherwise a timeout would be thrown
  done()
})
```
