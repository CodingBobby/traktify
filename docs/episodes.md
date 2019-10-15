# Episodes
Fetching a list of all episodes a show contains requires some workflow as it can't be done in one single step. This first seems like a problem but later helps to improve the requesting-caching-system.

In the following, the request tree is shown. You can see that retrieving extended data is possible when requesting a list of seasons but not for a list of episodes, where a separate request for each episode is required.

```cson
shows/${show_id}/seasons -> season[]
   season: { ?extended=full
      number,
      ids: { trakt, tvdb, tmdb },
      ...
   }

   shows/${show_id}/seasons/${season.number} -> episode[]
      episode: {
         season,
         number,
         title,
         ids: { trakt, tvdb, tmdb }
      }

      shows/${show_id}/seasons/${season.number}/episodes/${episode.number} -> episodeData
         episodeData: { ?extended=full
            ...
         }
```

Lets say, this is the structure of a show that I just came up with:

```cson
show:
   season 1:
      episode 1
      episode 2
   season 2:
      episode 3
      episode 5
      episode 6
```

Then you would need 9 total requests to get all available data of this exact data structure—one for the list of seasons, two for the lists of episodes of each of its seasons and finally six for each of the episodes these lists contain.

Unfortunately it is not possible to predict how many requests will be required in total as the general show info would only provide the amount of episodes and not the amount of seasons. However, with the first request that provides a list of seasons, you can calculate just that. In the following pseudo-code, `show` is equivalent to the result `season[]` of the first request shown in the block above. Thus, `totalRequests` does not include this required first request into the calculation.

```
seasons = show.length
episodes = 0

for season in show:
   episodes += season.episode_count

totalRequests = seasons + episodes
```
