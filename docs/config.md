# Configuration
The configuration file has the following structure:
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
There are two different scopes available: `app` and `user`.

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
This scope is not in use yet.
