/**
 * The generators module includes functions that either return HTMLElements or HTML-formatted strings
 * that are used as templates for building blocks of the app.
 * Most functions take arguments providing content to fill these templates.
 * @namespace generators
 */

module.exports = {
  infoCardDummy, infoCardContent,
  searchResult, upNextPoster, upNextTitle,
  alertBox: confirmActionAlertBox
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
  infocard.classList.add('infocard', 'shadow_b', stack)
  infocard.id = 'card_'+index
  infocard.dataset.trakt_id = id
  infocard.innerHTML = `
    <div id="infocard_close" class="btn-close black_d_b z4 elmHover" onclick="triggerInfoCardOverlay()">
      <img src="../../assets/icons/app/close.svg">
    </div>
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
      <div id="infocard_close" class="btn-close black_d_b z4 elmHover" onclick="triggerInfoCardOverlay()">
        <img src="../../assets/icons/app/close.svg">
      </div>
      <div class="infocard_left">
        <img src="">
        <img src="" class="shadow_b">
      </div>
      <div class="infocard_right">
        <h2 class="h2 white_t" style="margin: 0 0 12px">${item.episodeTitle}</h2>
        <div class="horizontal_border"></div>
        <p class="p white_d_t" style="margin-bottom:0">${item.description}</p>
        ${actionButtons(item.matcher, 'card')}
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
 * @param {String} item.type
 * @param {Number} item.rating
 * @param {Number} item.id Reference ID for TMDB database
 * @returns {HTMLElement}
 */
function searchResult(item) {
  let panel_box = document.createElement('div')
  panel_box.classList.add('panel_box', 'search', 'animation_slide_right')
  panel_box.innerHTML = `
    <img class="poster" src="${item.img}">
    <div class="panel_box_container">
      <h3 class="fs18 tOverflow">${item.title}</h3>
      <p class="tOverflow normal">${item.description}</p>
      <div class="poster-content">
        <div class="poster-content-left">
          <img src="../../assets/icons/app/heart.svg">
          <span class="fs16">${item.rating}%</span>
        </div>
        <div class="poster-content-right tC">${item.type}</div>
      </div>
    </div>
  `
  return panel_box
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

  posterTile.innerHTML = `
    <div class="poster_tile shadow_h">
      <div class="poster_rating">
        <img src="../../assets/icons/app/heart.svg"><span class="fw700 white_t">${Math.round(item.rating*10)}%</span>
      </div>
      ${actionButtons(item.matcher, 'poster')}
    </div>
  `

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


/**
 * Generates html-string containing the action buttons.
 * It contains three main buttons that are styled depending on the type.
 * @memberof generators
 * @param {String} matcher 
 * @param {'poster'|'card'} modal
 * @returns {String}
 */
function actionButtons(matcher, modal) {
  let q = "'"
  let html = `
  <div class="action_btns">
    <div class="action_btn play tu elmHover" onclick="playNow(this, ${q+matcher+q}, ${q+modal+q})"></div>
    <div class="action_btn watchlist tu elmHover" onclick="addToWatchlist(this, ${q+matcher+q}, ${q+modal+q})"></div>
    <div class="action_btn history tu elmHover" onclick="addToHistory(this, ${q+matcher+q}, ${q+modal+q})"></div>
  </div>
  `
  return html
}

/**
 * Generates element used for an alert box with a yes/no option.
 * Takes a callback that allows different actions depending on the clicked button.
 * @memberof generators
 * @param {Object} options Data to render in the alert box
 * @param {String} options.title
 * @param {String} options.description
 * @param {String} options.acceptButtonText
 * @param {String} options.declineButtonText
 * @param {Function} proceed Callback function for button clicks
 * @returns {HTMLElement}
 */
function confirmActionAlertBox(options, proceed) {
  let box = document.createElement('div')
  box.classList = 'alertBox black_b shadow_h'
  box.innerHTML = `
    <h4 class="fs23 fw700 white_t">${options.title}</h4>
    <p class="fs18 fw200 white_d_t" style="margin-bottom:10px">${options.description}</p>
    <div class="alert_btns"></div>
  `

  let close = document.createElement('div')
  close.classList = 'btn-close black_d_b elmHover'
  close.innerHTML = `<img src="../../assets/icons/app/close.svg">`
  close.onclick = function () { proceed(false) }
  box.appendChild(close)

  let buttons = box.getElementsByClassName('alert_btns')[0]

  let accept = document.createElement('div')
  accept.classList = 'alert_btn red_b white_t elmHover'
  accept.innerText = options.acceptButtonText
  accept.onclick = function() { proceed(true) }
  buttons.appendChild(accept)

  let decline = document.createElement('div')
  decline.classList = 'alert_btn black_d_b white_t elmHover'
  decline.innerHTML = options.declineButtonText
  decline.onclick = function () { proceed(false) }
  buttons.appendChild(decline)

  return box
}
