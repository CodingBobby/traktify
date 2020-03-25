## Episode Request Structure
Fetching a list of all episodes a show contains requires some workflow as it can't be done in one single step. This first seems like a problem but later helps to improve the requesting-caching-system.

In the following, the request tree is shown. You can see that retrieving extended data is possible when requesting a list of seasons but not for a list of episodes, where a separate request for each episode is required.

```
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

```
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

## Card Slider
The info-card feature of traktify is the most obvious usecase of the above described workflow. When the user clicks on a recommended episode that is shown in the up-next-dashboard, a slider will show up that allows the user to look at all episodes the corresponding show contains. This slider will open up with an initial position of the episode seen before on the dashboard.

Because many shows contain hundrets if not thousands of episodes, it will be impractical to request all of them in one go. To reduce API stress and loading time dramatically, only a few episodes need to be requested when opening the slider.

For better illustration, I will represent the list of episodes a show contains with a line of dashes where every character stands for one episode:

- `-` means unrequested
- `x` means requested
- `o` means requested and currently shown

In the following example, the 11th item of a show containing 17 total episodes is opened. The slider will be opened in the second you clicked on it but the content is shown later when the requests finished. To improve user experience, the data of the clicked episode will be requested first.

When clicked:
```
----------o------
```
After buffer requests finished:
```
--------xxoxx----
```

When moving one episode to the right, the required data is already requested in the background and can be shown immediately. After this, more of the hidden episodes can be requested to keep a buffer of two around the currently visible one.

When moved one to the right:
```
--------xxxox----
```
After buffer requests finished:
```
--------xxxoxx---
```

A similar procedure can be used to show the items inside a watchlist or when clicking on a result in the search-panel.
