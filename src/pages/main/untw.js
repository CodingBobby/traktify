class UpNext {
  constructor() {}


  /**
   * Handles everything related to UNTW Tiles.
   * @param {HTMLElement} tile 
   * @param {object} [data] data is arranged in array as follow: [[showId, showTitle, epId], progress, nextEp, images]
   */
  tile(tile, data) {
    return new Tile(tile, data)  
  }


  /**
   * Updates show and episode name in UNTW.
   * @param {HTMLElement} tile 
   */
  static setText(tile) {
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
}


class Tile {
  constructor(tile, data) {
    this.tile = tile || document.createElement('div');
    this.data = data ? {
      id: data[0][0],
      title: data[0][1],
      aired: data[1].aired,
      completed: data[1].completed,
      images: data[3],
      season: {
        number: data[2].season,
      },
      episode: {
        id: data[0][2],
        title: data[2].title,
        number: data[2].number,
        number_abs: data[2].number_abs,
        rating: data[2].rating.toFixed(1),
        runtime: data[2].runtime
      }
    } : null;
  }

  /**
   * Responsible for setting the tile data and its functionality as a whole.
   * Tile states are: show, loading, empty
   * @param {string} type
   * @returns {HTMLElement}
   */
  set(type) {
    switch(type) {
      case 'show':
        this.tile.dataset.untwTitle = this.data.title;
        this.tile.dataset.untwEpisodeTitle = parseEpisodeTitle(this.data);

        this.tile.innerHTML = `
          <div class="tileImg" style="--poster-img:url(${parseItemImage('poster', this.data)});background-image:url(${parseItemImage('banner', this.data)})"></div>
          <div class="tileInfo">
            <div class="fs16 fwSemiBold">
              <div class="actions">
                <div class="btn small"></div>
                <div class="btn small"></div>
              </div>
              <div class="rating"><i class="icon-heart"></i> ${this.data.episode.rating}</div>
            </div>
            <div class="progress" data-tooltip="${minutesToText(this.data.episode.runtime * this.data.completed)}-- ${this.data.completed}/${this.data.aired}">
              <div style="width:${getProgressPercentage(this.data.completed, this.data.aired)}%"></div>
            </div>
          </div>
        `;
        
        this.tile.onmouseover = () => UpNext.setText(this.tile);
        this.tile.onmouseleave = (e) => {
          if (e.toElement && e.toElement.closest('.alertContainer')) {
            return this.tile.querySelector('.tileInfo').style.bottom = 0
          }
        
          UpNext.setText(untw.children[1])
        };
        this.tile.onclick = (e) => {
          // opens epsiode for tile in poster format by clicking on image
          if (e.target == this.tile.children[0]) {
            console.log('show episode card')
          }

          // opens episode for tile in banner format, includes main tile as well.
          if (!e.target.closest('.actions') && !e.target.closest('.progress') && !e.target.closest('.rating')) {
            if (!e.target.closest('[untw-latest]')) {
              console.log('show episode card')
            } else if (e.target.closest('[untw-latest]') && window.innerWidth < 1000) {
              console.log('show episode card')
            }
          }
        };
        
        this.actionButton('history', false);
        this.actionButton('watchlist', true);
        break;
      case 'loading':
        this.tile.innerHTML = '';
        this.tile.dataset.untwTitle = '';
        this.tile.dataset.untwEpisodeTitle = '';
        this.tile.setAttribute('loading', '');
        break;
      case 'empty':
        this.tile.style.backgroundColor = 'var(--watchlist)';
        this.tile.classList = 'shadow';
        break;
    }

    if (this.tile.hasAttribute('untw-latest')) {
      UpNext.setText(this.tile)
    }

    if (this.tile.hasAttribute('loading') && type != 'loading') {
      this.tile.removeAttribute('loading')
    }

    return this.tile
  }

  
  /**
   * Replaces the selected tile with the one next to it.
   */
  next() {
    if (this.tile.hasAttribute('untw-latest')) {
      let nextTile = this.tile.nextElementSibling;
      nextTile.setAttribute('untw-latest', '');

      if (nextTile.dataset.untwId) {
        UpNext.setText(nextTile)
      }
    }
  
    this.tile.remove();
  
    // creates a new tile to fill in blanks
    let children = untw.children.length;
    if (children < MAX_TILES + 1) {
      untw.appendChild(new Tile().set('empty'))
    }
  }


  /**
   * Resets tile from hover to default state.
   */
  reset() {
    this.tile.querySelector('.tileInfo').style = '';
    UpNext.setText(untw.children[1])
  }


  /**
   * Sets the tile action buttons with the configured settings while checking if its primary button or not.
   * Current available actions: play, history, watchlist.
   * @param {string} type
   * @param {boolean} secondary
   */
  actionButton(type, secondary) {
    let message;
    let actionContent;

    let confirm = () => {
      this.update(type);
      toggleAlert(actionAlerts, false);
    }

    let revert = () => {
      toggleAlert(actionAlerts, false);
      this.reset(this.tile)
    }

    let actionBtns = this.tile.querySelector('.actions');
    let btn = secondary ? actionBtns.children[1] : actionBtns.children[0];

    if (type == 'play') {
      message = `Start playing <span>${this.data.title}: ${parseEpisodeTitle(this.data)}</span>?`;
      actionContent = secondary ? '<i class="icon-play"></i>' : 'play now'
    } else if (type == 'watchlist') {
      message = `Add <span>${this.data.title}: ${parseEpisodeTitle(this.data)}</span> to your watchlist?`;
      actionContent = secondary ? '<i class="icon-watchlist"></i>' : 'add to watchlist'
    } else if (type == 'history') {
      message = `Add <span>${this.data.title}: ${parseEpisodeTitle(this.data)}</span> to your history?`;
      actionContent = secondary ? '<i class="icon-history"></i>' : 'add to history'
    }

    btn.innerHTML = actionContent;
    btn.style.backgroundColor = `var(--${type == 'play' ? 'red' : type})`;
    btn.onclick = () => {
      setAlertbox(actionAlerts, 'Info', message, {text: 'OK', cb: confirm}, {text: 'revert action', cb: revert});
      toggleAlert(actionAlerts, true)
    }
  }


  /**
   * Updates tile based on the interacted action.
   * @param {string} type
   */
  update(type) {
    if (type == 'history') {
      let showId = this.tile.dataset.untwId;
      // save show title before changing tile state to loading
      let showTitle = this.tile.dataset.untwTitle;

      this.set('loading');
      
      window.traktify.post.history({changes: {episodes: [{ids: {trakt: this.tile.dataset.untwEpisodeId}}]}}).then(() => {
        window.traktify.get.progress(showId, true).then(progress => {   
          // checks if the show is complete or not
          if (progress.aired == progress.completed) {
            this.next();
            return
          }
          
          let nextEp = progress.next_episode;
          let epId = nextEp.ids.trakt;
          this.tile.dataset.untwEpisodeId = epId;
          
          window.traktify.get.images({type: 'show', id: this.tile.dataset.untwTvdb}).then(images => {
            new Tile(this.tile, [
              [showId, showTitle, epId], progress, nextEp, images
            ]).set('show')
          })
        })
      })
    }
  }
}