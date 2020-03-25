Traktify has to store user specific data across sessions. To make this possible, the app will generate a folder inside the user's home directory at launch and load data from there during the following launches.

This folder will be initialized at `$HOME/.traktify` and contains these files:
```cson
.traktify:
   .cache:
      # cache files are placed here
   .log
   config.json
```

The configuration file `config.json` has the following structure:
```cson
config:
   client:
      settings:
         app
         user
   user:
      trakt:
         auth
         status
```

## Settings
There are two different scopes inside `config.client.settings`: `app` and `user`.

### App
The `app` scope contains settings of different types. All types share these properties:

property | info
---|---
type | Type of the setting
status | The currently set value
default | The default setting
needsReload | Whether the app has to reload to apply changes

The `select` type allows to choose one option from a list. Each option hast a name and a value.
```cson
setting:
   type: 'select'
   status: name
   default: name
   options: {
      name: any
      name: any
      ...
   }
   needsReload: boolean
```

The `toggle` type can switch between `true` and `false`.
```cson
setting:
   type: 'toggle'
   status: boolean
   default: boolean
   needsReload: boolean
```

The `range` type has a minimum and maximum possible value. The accuracy is defined by the `accuracy` property.
```cson
setting:
   type: 'range'
   status: number
   default: number
   accuracy: number
   range: [number, number]
   needsReload: boolean
```

### User
This scope is used to store temporary tokens for user logins.
