/**
 * The generators module includes functions that either return HTMLElements or HTML-formatted strings
 * that are used as templates for building blocks of the app.
 * Most functions take arguments providing content to fill these templates.
 * @namespace generators
 */

module.exports = {
  infoCardDummy, infoCardContent,
  searchResult, upNextPoster, upNextTitle
}


/**
 * Generates an element containing the basic html structure of a single info card.
 * @memberof generators
 * @param {'left_stack'|'middle_stack'|'right_stack'} stack Card stack it will be placed onto
 * @param {Number} index Position of this card in the total stack
 * @param {String} id Reference ID for trakt database
 * @returns {HTMLElement}
 */
function infoCardDummy(stack, index, id) {
  let infocard = document.createElement('div')
  infocard.classList = 'infocard shadow_b '+stack
  infocard.id = 'card_'+index
  infocard.dataset.trakt_id = id
  infocard.innerHTML = `
    <ul class="btns z4">
      <li>
        <div class="btn icon red_b shadow_b" id="close_button_info" onclick="triggerInfoCardOverlay()">
          <img src="../../assets/icons/app/close.svg">
        </div>
      </li>
    </ul>
    <div class="cardcontent">
      <div class="center">
        <img class="logo gray-animation" style="height: 200px" src="../../assets/icons/traktify/512x512.png">
      </div>
    </div>
  `
  return infocard
}


/**
 * Generates html-string containing all elements that are placed inside one info card.
 * @memberof generators
 * @param {Object} item 
 * @param {Number} item.ratingPercent
 * @param {Number} item.seasonNumber
 * @param {Number} item.episodeNumber
 * @param {String} item.episodeTitle
 * @param {String} item.description
 * @returns {String}
 */
function infoCardContent(item) {
  let html = ` 
    <div class="infocard_child black_b z4">
      <div class="infocard_banner">
        <img src="">
        <div id="infocard_close" class="black_d_b" onclick="triggerInfoCardOverlay()"><img src="../../assets/icons/app/close.svg"></div>
      </div>
      <div class="infocard_stripe black_d_b"></div>
      <div style="max-width: 920px;margin:auto;">
        <div class="infocard_titles infocard_padding black_d_b tOverflow">
          <div class="rating">
            <img src="../../assets/icons/app/heart.svg">
            <span class="white_t fs18 fw700">${item.ratingPercent}%</span>
          </div>
          <div class="vertical_border"></div>
          <div class="fw500 white_t tOverflow">
            ${item.seasonNumber}x${item.episodeNumber} ${item.episodeTitle}
          </div>  
        </div>
        <div class="infocard_poster z1">   
          <img class="shadow_h" src="../../assets/loading_placeholder.gif">
          <div class="beta_action_btns">
            <div class="beta_action_btn play"><img src="../../assets/icons/app/play.svg"></div>
            <div class="beta_action_btn watchlist"><img src="../../assets/icons/app/list.svg"></div>
            <div class="beta_action_btn watched" onclick="requestHistoryUpdatePosting(nthParent(this,5).dataset.trakt_id,{type:'episode',season:${item.seasonNumber},episode:${item.episodeNumber}});moveCards('right')"><img src="../../assets/icons/app/check.svg"></div>
          </div>
        </div>
        <p class="infocard_description infocard_padding white_t fs18 fw200">${item.description}</p>
      </div>
    </div> 
  `
  return html
}


/**
 * Generates a html element for one search result and adds it to the sidebar.
 * @memberof generators
 * @param {Object} item 
 * @param {String} item.img
 * @param {String} item.title
 * @param {String} item.description
 * @param {Number} item.rating
 * @param {Number} item.id Reference ID for TMDB database
 * @returns {HTMLElement}
 */
function searchResult(item) {
  let panel_box = document.createElement('div')
  panel_box.classList.add('panel_box', 'search', 'animation_slide_right')

  let poster_img = document.createElement('img')
  poster_img.classList.add('poster')
  poster_img.src = item.img

  let panel_box_container = document.createElement('div')
  panel_box_container.classList.add('panel_box_container')

  let h3 = document.createElement('h3')
  h3.classList.add('fs18', 'tOverflow')
  h3.innerText = item.title

  let p = document.createElement('p')
  p.classList.add('tOverflow', 'normal')
  p.innerText = item.description

  let poster_content = document.createElement('div')
  poster_content.classList.add('poster-content')

  let poster_content_left = document.createElement('div')
  poster_content_left.classList.add('poster-content-left')

  let heart = document.createElement('img')
  heart.src = '../../assets/icons/app/heart.svg'

  let span = document.createElement('span')
  span.classList.add('fs16')
  span.innerText = item.rating + "%"

  let poster_content_right = document.createElement('div')
  poster_content_right.classList.add('poster-content-right')
  poster_content_right.append(...createActionButtons(item.id))

  poster_content_left.appendChild(heart)
  poster_content_left.appendChild(span)

  poster_content.appendChild(poster_content_left)
  poster_content.appendChild(poster_content_right)

  panel_box_container.appendChild(h3)
  panel_box_container.appendChild(p)
  panel_box_container.appendChild(poster_content)

  panel_box.appendChild(poster_img)
  panel_box.appendChild(panel_box_container)

  return panel_box
}


// used in the above function
function createActionButtons(item) {
  // TODO: change `item` to matcher so it includes more info
  let playNow = document.createElement('div')
  playNow.classList.add('action_btn', 'play')
  playNow.innerHTML = '<img src="../../assets/icons/app/play.svg">'
  playNow.setAttribute('onclick', `playNow(${item})`)

  let addToList = document.createElement('div')
  addToList.classList.add('action_btn', 'list')
  addToList.innerHTML = '<img src="../../assets/icons/app/list.svg">'
  addToList.setAttribute('onclick', `addToWatchlist(${item})`)

  let addToHistory = document.createElement('div')
  addToHistory.classList.add('action_btn', 'history')
  addToHistory.innerHTML = '<img src="../../assets/icons/app/check.svg">'
  addToHistory.setAttribute('onclick', `addToHistory(${item})`)

  return [playNow, addToList, addToHistory]
}


/**
 * Generates the an element for a single poster that is displayed on the up-next dashboard.
 * @memberof generators
 * @param {Object} item
 * @param {String} item.title
 * @param {String} item.subtitle
 * @param {Number} item.rating
 * @param {String} item.id Reference ID for TVDB database
 * @param {Number} item.season
 * @param {String} item.matcher
 * @returns {HTMLElement}
 */
function upNextPoster(item) {
  let li = document.createElement('li')

  li.classList.add('poster', 'poster_dashboard')
  li.setAttribute('data_title', item.title)
  li.setAttribute('data_subtitle', item.subtitle)
  li.setAttribute('onmouseover', 'animateText(this, true)')
  li.setAttribute('onmouseleave', 'animateText(this, false)')

  let posterTile = document.createElement('div')
  posterTile.classList.add('hidden')

  // as values in onclicks will be added without formatting, we have to wrap them in quotes manually
  let q = "'"

  posterTile.innerHTML = `<div class="poster_tile shadow_h">
    <div class="poster_rating"><img src="../../assets/icons/app/heart.svg"><span class="fw700 white_t">${Math.round(item.rating*10)}%</span></div>
    <div class="beta_action_btns">
      <div class="beta_action_btn play"
        onclick="playNow(${q+item.matcher+q})">
        <img src="../../assets/icons/app/play.svg">
      </div>
      <div class="beta_action_btn watchlist"
        onclick="addToWatchlist(${q+item.matcher+q})">
        <img src="../../assets/icons/app/list.svg">
      </div>
      <div class="beta_action_btn watched"
        onclick="addToHistory(${q+item.matcher+q})">
        <img src="../../assets/icons/app/check.svg">
      </div>
    </div>
  </div>`

  li.appendChild(posterTile)

  requestAndLoadImage({
    parent: li,
    use: 'poster',
    type: 'season',
    itemId: item.id,
    reference: item.season,
    classes: ['shadow_h', 'z1'],
    attributes: {
      'style': 'cursor:pointer',
      'onclick': 'openInfoCard(this)',
      'data_matcher': item.matcher
    }
  }, () => {
    posterTile.classList.remove('hidden')
  })

  return li
}


/**
 * Generates html-string used for the title block on the up-next dashboard.
 * @memberof generators
 * @param {Object} item 
 * @param {String} item.title
 * @param {String} item.subtitle
 * @returns {String}
 */
function upNextTitle(item) {
  let html = `
    <h3 class="h3 red_t tu">
      up next to watch
    </h3>
    <h1 class="h1 white_t tu tOverflow">
      ${item.title}
    </h1>
    <h1 class="h1 white_d_t tOverflow">
      ${item.subtitle}
    </h1>
  `
  return html
}
