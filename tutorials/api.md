For easy data request and retrieval, an internal API is provided to the frontent of the app.
It is generally accessible through `window.traktify` for the renderer.
This object wraps the API-class {@link Modules.API.Traktor} as well as the {@link Modules.Manager.tracer} logging module.
Detailed documentation about the exposed methods can be found in {@link Modules.Renderer}.


## Table of Contents
- [Frontend](#frontend)
- [Backend](#backend)
  - [Traktor-Class](#traktor-class)


<a name="frontend"></a>

## Frontend
When the user does things like searching for a movie, opening one of the results, adding it to a list and marking it as watched, data has to be retreived from and sent to the trakt.tv database.
For this, the {@link trakt.js} module is used as an API.
But many actions the user can perform require more than just one API request and beyond that also require various kinds of processing of the raw results.
Most of these tasks are performed by the [backend](#backend) in order to keep the rendering process free from heavy workloads.
For the frontend, an internal API is provided which communicates with the backend and the available methods wrap multiple requests or processing funtions together to form a much simpler interface.
More details on how the communication between front- and backend works can be found under {@tutorial ipc}.


<a name="backend"></a>

## Backend

<a name="traktor-class"></a>

#### Traktor-Class
This class is the last station before using the trakt.tv API and provides an internal structure that allows easier usage, combination of multiple methods and the integration of a caching system.
