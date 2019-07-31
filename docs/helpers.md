# Helper Methods

## Debugging
For debugging purposes in development mode, the following methods are provided.

### Logging messages and errors
The function `debugLog` provides automatic error recognition. To log a normal message you use it like this:

```js
debugLog('message title', 'description' [, 'optional message'])
```

To log it as an error, for example inside a `.catch(err => ...)` you have to put either `'err'` or `'error'` as the message title. The `'name'` argument lets you give the error a name, so you can find it in your code more easily. The optional argument must be a new `Error` instance. That way you get the location of your debug logging.

```js
...
.catch(err => {
   debugLog('error', 'name' [, new Error().stack])
})
```
