/**
 * Retrieves all data for uncompleted shows to update the UNTW tiles.
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
      let epId = nextEp.ids.trakt;

      untw.children[i+1].dataset.id = epId;

      window.traktify.get.images({type: 'show', id: show.ids.tvdb}).then(images => {
        setTileData('show', null, {
          id: showId,
          title: show.title,
          aired: progress.aired,
          completed: progress.completed,
          images: images,
          season: {
            number: nextEp.season,
          },
          episode: {
            id: epId,
            title: nextEp.title,
            number: nextEp.number,
            number_abs: nextEp.number_abs,
            rating: nextEp.rating.toFixed(1),
            runtime: nextEp.runtime
          }
        })
      }).catch(err => alertError(err))
    }).catch(err => alertError(err))
  }
}).catch(err => alertError(err))

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
    tile = untw.children[order] || document.createElement('div')
  } else {
    let tileById = untw.querySelector(`[data-id="${data.episode.id}"`);
    tile = tileById ? tileById :  document.createElement('div')
  }

  if (type == 'show') {
    tile.dataset.untwTitle = data.title;
    tile.dataset.untwEpisodeTitle = parseEpisodeTitle(data);
    tile.dataset.posterImg = parseItemImage('poster', data);
    tile.style.backgroundImage = `url(${parseItemImage(tile.hasAttribute('untw-latest') ? 'poster' : 'banner', data)})`;
    
    tile.innerHTML = `
      <div>
        <div class="fs16 fwSemiBold">
          <div class="actions">
            <div class="btn small"></div>
            <div class="btn small"></div>
          </div>
          <div class="rating"><i class="icon-heart"></i> ${data.episode.rating}</div>
        </div>
        <div class="progress" data-tooltip="${minutesToText(data.episode.runtime * data.completed)}-- ${data.completed}/${data.aired}">
          <div style="width:${getProgressPercentage(data.completed, data.aired)}%"></div>
        </div>
      </div>
    `;
  
    tile.onmouseover = () => setTextUNTW(tile);
    tile.onmouseleave = (e) => {
      if (e.toElement && e.toElement.closest('.alertContainer')) {
        return tile.children[0].style.bottom = 0
      }
    
      setTextUNTW(untw.children[1])
    };
  
    setTileActionButton(tile, data, 'play', false);
    setTileActionButton(tile, data, 'watchlist', true)
  } else if (type == 'empty') {
    tile.style.backgroundColor = 'var(--watchlist)'
  }

  if (tile.hasAttribute('untw-latest')) {
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
  if (tile.hasAttribute('untw-latest')) {
    let nextTile = tile.nextElementSibling;

    nextTile.setAttribute('untw-latest', '');
    nextTile.style.backgroundImage = `url(${nextTile.dataset.posterImg})`;
    setTextUNTW(nextTile)
  }

  tile.remove();

  // creates a new tile to fill in blanks
  let children = untw.children.length;
  if (children < 15) {
    untw.appendChild(setTileData('empty', children+1))
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
  let callback = () => {
    updateNextTile(tile);
    toggleAlert(actionAlerts, false);
    resetTile(tile)
  };

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
  btn.style.backgroundColor = `var(--${type == 'play' ? 'red' : type})`;
  btn.onclick = () => {
    setAlertbox(actionAlerts, 'Info', message, {text: 'OK', cb: callback}, {text: 'revert action', cb: () => {
      toggleAlert(actionAlerts, false); resetTile(tile)
    }});

    toggleAlert(actionAlerts, true)
  }
}

/**
 * Resets UNTW tiles to its default state.
 * @param {HTMLElement} tile 
 */
function resetTile(tile) {
  tile.children[0].style = '';
  setTextUNTW(untw.children[1])
}

/**
 * Updates show and episode name in UNTW.
 * @param {HTMLElement} tile 
 */
function setTextUNTW(tile) {
  // prevents from changing title when the main tile has not loaded yet
  if (!untw.children[1].dataset.untwTitle) {
    return
  }

  let data = ['up next to watch', tile.dataset.untwTitle, tile.dataset.untwEpisodeTitle];

  Array.from(untw.children[0].children).forEach((elm, i) => {
    if (!data[i]) {
      elm.innerHTML = '';
      elm.setAttribute('loading', 'dark')
    } else {
      elm.innerHTML = data[i];
      if (elm.hasAttribute('loading')) {
        elm.removeAttribute('loading')
      }
    }    
  })
}

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