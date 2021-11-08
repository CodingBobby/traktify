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
  {
    id: 97525,
    title: 'To Your Eternity',
    poster: 'https://walter.trakt.tv/images/shows/000/159/569/posters/thumb/59c0d6f9cd.jpg',
    poster_wide: 'https://walter.trakt.tv/images/shows/000/159/569/fanarts/full/76332e8d7f.jpg',
    watched: 5,
    aired: 20,
    season: {
      count: 1,
    },
    episode: {
      id: 97525,
      title: 'Our Goals',
      count: 6,
      absolute_count: 6,
      rating: 8.0,
      runtime: 24,
    }
  },
  {
    id: 46440,
    title: 'Samurai Girls',
    poster: 'https://walter.trakt.tv/images/seasons/000/062/813/posters/thumb/88ba84a2c9.jpg',
    poster_wide: 'https://walter.trakt.tv/images/shows/000/060/994/fanarts/full/f095f22dc5.jpg',
    watched: 4,
    aired: 24,
    season: {
      count: 1,
    },
    episode: {
      id: 46440,
      title: 'Here Comes the Warrior of Love!',
      count: 5,
      absolute_count: 5,
      rating: 7.4,
      runtime: 25,
    }
  },
]
/**
 * Will be fully documented once there has been a proper API as its subject to change completely once implemented.
 */
setTimeout(() => {
  Array.from(untw.children).forEach((elm, i) => {
    if (i > 0) {
      if (dummyData[i-1]) {
        setTileData(i, dummyData[i-1])
      } else {
        elm.style = 'background-color:var(--watchlist);'
        elm.removeAttribute('loading')
      }
    }
  })
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
  setTileActionButton(tile, data, 'watchlist', true);

  if (tile.hasAttribute('data-untw-latest')) {
    setTextUNTW(tile)
  }

  if (tile.hasAttribute('loading')) {
    tile.removeAttribute('loading')
  }
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
    untw.appendChild(createTile())
  }
}

/**
 * Used to fill blanks in the tile list.
 * Will be responsible for creating show recommendations, etc.
 * @returns {HTMLElement}
 */
function createTile() {
  let tile = document.createElement('div');
  
  tile.classList.add('shadow');
  tile.style.backgroundColor = 'var(--history)';

  return tile 
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
  let show_count = data.episode.absolute_count;
  return `${data.season.count} &#215; ${data.episode.count} ${show_count ? `(${show_count})`: ''} ${data.episode.title}`
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