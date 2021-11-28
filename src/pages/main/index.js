const MAX_TILES = 9;
let upNext = new UpNext();

/**
 * Retrieves all data for uncompleted shows to update the UNTW tiles.
 */
window.traktify.get.shows({}, true).then(shows => {
  for (let i = 0; i < MAX_TILES; i++) {
    let tile = untw.children[i+1];

    // will be replaced later with recommended shows
    if (!shows[i]) {
      upNext.tile(tile).set('empty');
      continue
    }

    let show = shows[i].show;
    let showId = show.ids.trakt;

    window.traktify.get.progress(showId).then(progress => {
      let nextEp = progress.next_episode;
      
      // if show is complete or has no data for next episode, dont continue.
      if (!nextEp) {
        upNext.tile(tile).set('empty')
        return
      }

      let epId = nextEp.ids.trakt;

      tile.dataset.untwId = showId;
      tile.dataset.untwEpisodeId = epId;
      tile.dataset.untwTvdb = show.ids.tvdb;

      window.traktify.get.images({type: 'show', id: show.ids.tvdb}).then(images => {
        upNext.tile(untw.querySelector(`[data-untw-id='${showId}']`), [
          [showId, show.title, epId], progress, nextEp, images
        ]).set('show')
      }).catch(err => alertError(err))
    }).catch(err => alertError(err))
  }
}).catch(err => alertError(err))

/**
 * Calculates the ratio between number of episodes watched to total aired episodes in percentage for progress bar.
 * @param {number} number number of episodes watched 
 * @param {number} total number of episodes that have aired
 * @returns {number} float in range 0.0–100.0
 */
function getProgressPercentage(number, total) {
  return ((number/total)*100).toFixed(1)
}

/**
 * Parses the data from the API to provided a constructed episode title for UNTW.
 * @returns {string} "0 x 00 (0) Episode Title"
 */
function parseEpisodeTitle(data) {
  let abs = data.episode.number_abs;
  return `${data.season.number} &#215; ${data.episode.number} ${abs ? `(${abs})`: ''} ${data.episode.title}`
}

/**
 * Optimal image for the tiles with fallback for non-existent ones.
 * @param {string} imgType 
 * @returns {string} image url
 */
function parseItemImage(imgType, data) {
  let img;
  let imgs = data.images;
  let filters = [{lang: 'en', season: data.season.number}, {season: data.season.number}, {}];

  if (imgs) {
    for (let filter of filters) {
      if (imgType == 'poster') {
        img = checkImage(imgs.seasonposter, filter) || checkImage(imgs.tvposter, filter)
      } else if (imgType == 'banner') {
        img = checkImage(imgs.seasonbanner, filter) || checkImage(imgs.tvbanner, filter)
      }
      
      if (img) break
    }
  }
  
  return img ? img : (FALLCHECKER ? FALLBACKIMG : `../../assets/media/placeholders/${imgType}.png`)
}

/**
 * Recieves the image type wether it was banner or poster and filters it through.
 * @returns {string} image url
 */
function checkImage(imgType, filter) {
  let img;

  if (!imgType) {
    return
  }

  // if the filter is an empty object, it will just return first iteration without filtering
  if (Object.keys(filter).length === 0 && filter.constructor === Object) {
    img = imgType[0]
  } else {
    img = filterItems(imgType, filter)[0]
  }

  return img ? img.url : undefined
}