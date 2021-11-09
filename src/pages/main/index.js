/**
 * Retrieves all data for uncompleted shows to update to the UNTW tiles.
 */
window.traktify.get.shows().then(shows => {
  for (let i = 0; i < 14; i++) {

    // will be replaced later with recommended shows
    if (!shows[i]) {
      setTileData('empty', i+1);
      continue
    }

    let show = shows[i].show;
    let showId = show.ids.trakt;

    window.traktify.get.progress(showId).then(progress => {
      let nextEp = progress.next_episode;

      setTileData('show', i+1, {
        id: showId,
        title: show.title,
        // api for images still in progress
        poster: 'https://walter.trakt.tv/images/seasons/000/236/954/posters/thumb/76b746ab1e.jpg',
        aired: progress.aired,
        completed: progress.completed,
        season: {
          number: nextEp.season
        },
        episode: {
          id: nextEp.ids.trakt,
          title: nextEp.title,
          number: nextEp.number,
          number_abs: nextEp.number_abs,
          rating: nextEp.rating.toFixed(1),
          runtime: nextEp.runtime
        }
      })
    })
  }
})

/**
 * Responsible for setting the tile data and its functionality as a whole.
 * Manages both empty tiles and recommendations.
 * @param {string} type 
 * @param {number} order 
 * @returns {HTMLDocument}
 */
function setTileData(type, order, data) {
  let tile;

  if (order) {
    tile = untw.children[order]
  } else {
    tile = document.createElement('div')
  }

  if (type == 'show') {
    tile.dataset.untwId = data.episode.id;
    tile.dataset.untwTitle = data.title;
    tile.dataset.untwEpisode = parseEpisodeTitle(data);
    tile.style.backgroundImage = `url(${parseEpisodeImage(tile, data)})`;
  
    tile.innerHTML = `
      <div>
        <div class="fs16 fwSemiBold">
          <div class="actions">
            <div class="btn small"></div>
            <div class="btn small"></div>
          </div>
          <div class="rating"><i class="icon-heart"></i> ${data.episode.rating}</div>
        </div>
        <div class="progress">
          <div style="width:${getProgressRatio(data.completed, data.aired)}%"></div>
        </div>
      </div>
    `;
  
    tile.onmouseover = () => setTextUNTW(tile);
    tile.onmouseleave = () => setTextUNTW(untw.children[1]);
  
    setTileActionButton(tile, data, 'play', false);
    setTileActionButton(tile, data, 'watchlist', true);
  } else if (type == 'empty') {
    tile.style.backgroundColor = 'var(--watchlist)'
  }

  if (tile.hasAttribute('data-untw-latest')) {
    setTextUNTW(tile)
  }

  if (tile.hasAttribute('loading')) {
    tile.removeAttribute('loading')
  }

  return tile
}

/**
 * When user finishes playing an episode / adds to history, the tile list is updated accordingly.
 * @param {HTMLElement} tile 
 */
function updateNextTile(tile) {
  if (tile.hasAttribute('data-untw-latest')) {
    tile.nextElementSibling.setAttribute('data-untw-latest', '');
    setTextUNTW(tile.nextElementSibling)
  }

  tile.remove()

  // creates a new tile to fill in blanks
  if (untw.children.length < 15) {
    untw.appendChild(setTileData('empty'))
  }
}

/**
 * Sets the tile action buttons with the configured settings, its type (play, watchlist, history) and if its the main or secondary button.
 * @param {HTMLElement} tile 
 * @param {string} type
 * @param {boolean} secondary
 */
function setTileActionButton(tile, data, type, secondary) {
  let message;
  let actionContent;

  // when api is available, callback will change according to action type
  let callback = () => {updateNextTile(tile);toggleAlert(false)};

  let actionBtns = tile.children[0].children[0].children[0];
  let btn = secondary ? actionBtns.children[1] : actionBtns.children[0];

  if (type == 'play') {
    message = `Start playing <span>${data.title}: ${parseEpisodeTitle(data)}</span>?`;
    actionContent = secondary ? '<i class="icon-play"></i>' : 'play now'
  } else if (type == 'watchlist') {
    message = `Add <span>${data.title}: ${parseEpisodeTitle(data)}</span> to your watchlist?`;
    actionContent = secondary ? '<i class="icon-watchlist"></i>' : 'add to watchlist'
  } else if (type == 'history') {
    message = `Add <span>${data.title}: ${parseEpisodeTitle(data)}</span> to your history?`;
    actionContent = secondary ? '<i class="icon-history"></i>' : 'add to history'
  }

  btn.innerHTML = actionContent;
  btn.style.backgroundColor = `var(--${type == 'play' ? 'red' : type})`
  btn.onclick = () => {
    setAlertbox('Info', message, {text: 'OK', cb: callback}, {text: 'revert action', cb: () => toggleAlert(false)})
    toggleAlert(true)
  }
}

/**
 * Updates show and episode name in UNTW.
 * @param {HTMLElement} tile 
 */
function setTextUNTW(tile) {
  // prevents from changing title when the main tile has not loaded yet
  if (!untw.children[1].hasAttribute('data-untw-title')) {
    return
  }

  let data = ['up next to watch', tile.dataset.untwTitle, tile.dataset.untwEpisode];

  Array.from(untw.children[0].children).forEach((elm, i) => {
    elm.innerHTML = data[i];

    if (elm.hasAttribute('loading')) {
      elm.removeAttribute('loading')
    }
  })
}

/**
 * Calculates the ratio between number of episodes watched to total aired episodes in percentage for progress bar.
 * @param {number} number number of episodes watched 
 * @param {number} total number of episodes that have aired
 * @returns {number} float in range 0.0–100.0
 */
 function getProgressRatio(number, total) {
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
 * @param {HTMLElement} tile 
 * @returns {string} image url
 */
 function parseEpisodeImage(tile, data) {
  if (tile.hasAttribute('data-untw-latest')) {
    return data.season.poster || data.poster
  } else {
    return data.season.poster_wide || data.poster_wide || data.season.poster || data.poster
  }
}