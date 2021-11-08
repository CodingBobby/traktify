const dummyData = [
  {
    id: 65930,
    title: 'My Hero Academia',
    poster: 'https://walter.trakt.tv/images/shows/000/104/311/posters/thumb/af633add9b.jpg',
    poster_wide: 'https://walter.trakt.tv/images/shows/000/104/311/fanarts/full/22c3c6efc2.jpg',
    watched: 89,
    aired: 113,
    season: {
      count: 5,
      poster: 'https://walter.trakt.tv/images/seasons/000/236/954/posters/thumb/76b746ab1e.jpg'
    },
    episode: {
      id: 65930,
      title: 'Vestiges',
      count: 2,
      absolute_count: 90,
      rating: 7.8,
      runtime: 24,
    }
  },
  {
    id: 123446,
    title: 'The Great Jahy Will Not Be Defeated!',
    poster: 'https://walter.trakt.tv/images/seasons/000/255/423/posters/thumb/09aa5ef81e.jpg',
    poster_wide: 'https://walter.trakt.tv/images/shows/000/179/526/fanarts/full/adbedecb31.jpg',
    watched: 8,
    aired: 14,
    season: {
      count: 1,
    },
    episode: {
      id: 123446,
      title: 'Saurva Can\'t Catch a Break...',
      count: 9,
      rating: 7.1,
      runtime: 24,
    }
  },
  {
    id: 118821,
    title: 'The World\'s Finest Assassin Gets Reincarnated in Another World as an Aristocrat',
    poster: 'https://walter.trakt.tv/images/shows/000/175/074/posters/thumb/5515ffd419.jpg',
    poster_wide: 'https://walter.trakt.tv/images/shows/000/175/074/fanarts/full/271fc6689c.jpg',
    watched: 4,
    aired: 5,
    season: {
      count: 1,
    },
    episode: {
      id: 118821,
      title: 'Qualifications of Assassins',
      count: 5,
      rating: 7.1,
      runtime: 24,
    }
  },
]
/**
 * Will be fully documented once there has been a proper API as its subject to change completely once implemented.
 */
setTimeout(() => {
  untw.querySelectorAll('[loading]').forEach(elm => {
    elm.removeAttribute('loading')
  });

  Array.from(untw.children).forEach((elm, i) => {
    if (i > 0) {
      if (dummyData[i-1]) {
        setTileData(i, dummyData[i-1])
      } else {
        elm.style = 'background-color:var(--watchlist);'
      }
    }
  })

  setTextUNTW(untw.querySelector('[data-untw-latest]'))
}, 2000)

function setTileData(order, data) {
  let tile = untw.children[order];

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
        <div style="width:${getProgressRatio(data.watched, data.aired)}%"></div>
      </div>
    </div>
  `;

  tile.onmouseover = () => setTextUNTW(tile);
  tile.onmouseleave = () => setTextUNTW(untw.children[1]);

  setTileActionButton(tile, data, 'play', false);
  setTileActionButton(tile, data, 'watchlist', true)
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
  let callback = () => {window.location.reload()};

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
  let text = untw.children[0];

  text.children[0].innerHTML = 'up next to watch';
  text.children[1].innerHTML = tile.dataset.untwTitle;
  text.children[2].innerHTML = tile.dataset.untwEpisode
}

/**
 * Checks if the tile provided is the main tile, the one that takes most space.
 * @param {HTMLElement} tile
 * @returns {boolean}
 */
function isMainTile(tile) {
  return tile.dataset.untwLatest == ''
}

/**
 * Calculates the ratio between number of episodes watched to total aired episodes in percentage for progress bar.
 * @param {number} number number of episodes watched 
 * @param {number} total number of episodes that have aired
 * @returns 
 */
 function getProgressRatio(number, total) {
  return ((number/total)*100).toFixed(1)
}

/**
 * Parses the data from the API to provided a constructed episode title for UNTW.
 * @returns {string} "0 x 00 (0) Episode Title"
 */
function parseEpisodeTitle(data) {
  let show_count = data.episode.absolute_count;
  return `${data.season.count} &#215; ${data.episode.count} ${show_count ? `(${show_count})`: ''} ${data.episode.title}`
}

/**
 * Optimal image for the tiles with fallback for non-existent ones.
 * @param {HTMLElement} tile 
 * @returns {string} image url
 */
 function parseEpisodeImage(tile, data) {
  if (isMainTile(tile)) {
    return data.season.poster || data.poster
  } else {
    return data.season.poster_wide || data.poster_wide || data.season.poster || data.poster
  }
}