const trakt = remote.getGlobal('trakt')
const fanart = remote.getGlobal('fanart')
const getSettings = remote.getGlobal('getSettings')
const setSetting = remote.getGlobal('setSetting')
const defaultAll = remote.getGlobal('defaultAll')
const updateApp = remote.getGlobal('updateApp')
const relaunchApp = remote.getGlobal('relaunchApp')

let config = remote.getGlobal('config')

const generate = require('./../../modules/components/generators.js')


// Here we update the app with saved settings after the window is created
window.onload = function() {
  debugLog('window', 'dashboard loading')
  updateApp() // update settings
  generatePosterSection() // show the up next to watch posters
  updateRpc() // show rpc on discord, handling the on/off setting is done within this function and doesn't have to be done here!
}

// This guy waits for messages on the 'modify-root' channel. The messages contain setting objects that then get applied to the 'master.css' style sheet. It is used to change the look of the app.
ipcRenderer.on('modify-root', (event, data) => {
  let variables = document.styleSheets[0]
    .cssRules[0].style.cssText.split(';')

  let result = {}
  for(let i in variables) {
    let a = variables[i].split(':')
    if(a[0] !== '') {
      result[a[0].trim()] = a[1].trim()
    }
  }

  let keys = Object.keys(result)
  document.documentElement.style.setProperty(keys[keys.indexOf(data.name)], data.value)
})

// Identifies the currently open panel. Makes it easier to check against closed panels, as this would require each of them to check on their own.
let openedPanel = null
/**
 * sidebar,
 * cards
 */

// Here, dashboard-wide shortcuts are defined. The 'meta' key represents CMD on macOS and Ctrl on Windows
document.onkeydown = function() {
  if(event.metaKey && event.keyCode === 83) { // meta + S
    debugLog('shortcut', 'Meta + S')
    if(openedPanel !== 'cards') {
      show(document.getElementById('search_button_side'))
      triggerSidePanel('search')
    }
    return false
  } else if(event.metaKey && event.keyCode === 188) { // meta + ,
    debugLog('shortcut', 'Meta + ,')
    if(openedPanel !== 'cards') {
      show(document.getElementById('settings_button_side'))
      triggerSidePanel('settings')
    }
    return false
  } else if(event.keyCode === 27) { // ESC
    debugLog('shortcut', 'ESC')
    // close the currently open panel
    if(openedPanel == 'sidebar') {
      triggerSidePanel(sideBar.status)
    } else if(openedPanel == 'cards') {
      triggerInfoCardOverlay()
    }
  } else if(event.keyCode === 39) { // arrow right
    debugLog('shortcut', 'ArrowRight')
    if(openedPanel == 'cards') {
      moveCards('right')
    }
  } else if(event.keyCode === 37) { // arrow left
    debugLog('shortcut', 'ArrowLeft')
    if(openedPanel == 'cards') {
      moveCards('left')
    }
  } else if(event.keyCode === 38) { // arrow up

  } else if(event.keyCode === 40) { // arrow down

  }
}


//:::: INFOCARD ::::\\

// This variable can be overwritten by different new <>Buffer() classes.
let localBuffer

// moves in one direction through the stacks
function moveCards(direction) {
  let stacks = getCardStacks()
  switch(direction) {
    case 'right':
      if(stacks.right.length !== 0) {
        let midCard = stacks.middle[0]
        midCard.classList.remove('middle_stack')
        midCard.classList.add('left_stack')
        // get the bottom right one
        let rigCard = stacks.right[0]
        rigCard.classList.remove('right_stack')
        rigCard.classList.add('middle_stack')
      }

      localBuffer.move(1, {
        first: epData => { // onFirst
          // find index of the middle card
          let index = getCardStacks().left.length
          updateInfoCard(epData, index)
          updateLeftRightButtons()
        },
        buffer: (bufferData, pos) => { // onBuffer
          updateInfoCard(bufferData, pos)
        },
        images: (urls, pos) => { // onImage
          updateInfoCardImage(urls, pos)
        }
      })
      break
    case 'left':
      if(stacks.left.length !== 0) {
        // move the middle one
        let midCard = stacks.middle[0]
        midCard.classList.remove('middle_stack')
        midCard.classList.add('right_stack')
        // get the top left one
        let lefCard = stacks.left[stacks.left.length-1]
        lefCard.classList.remove('left_stack')
        lefCard.classList.add('middle_stack')
      }

      localBuffer.move(-1, {
        first: epData => { // onFirst
          // find index of the middle card
          let index = getCardStacks().left.length
          updateInfoCard(epData, index)
          updateLeftRightButtons()
        },
        buffer: (bufferData, pos) => { // onBuffer
          updateInfoCard(bufferData, pos)
        },
        images: (urls, pos) => { // onImage
          updateInfoCardImage(urls, pos)
        }
      })
      break
  }
  updateLeftRightButtons()
}

function getCardStacks() {
  return {
    left: document.getElementsByClassName('left_stack'),
    middle: document.getElementsByClassName('middle_stack'),
    right: document.getElementsByClassName('right_stack')
  }
}

function updateLeftRightButtons() {
  let stacks = getCardStacks()
  let leftButton = document.getElementById('stack_left_button')
  let rightButton = document.getElementById('stack_right_button')

  // check the left stack
  if(stacks.left.length === 0) {
    leftButton.style.display = 'none'
  } else {
    leftButton.style.display = 'flex'
  }

  // and now the right one
  if(stacks.right.length === 0) {
    rightButton.style.display = 'none'
  } else {
    rightButton.style.display = 'flex'
  }

  // update the position of the slider thumb
  generateStackSlider()
}

// Closes the info card if already open. Currently, it is only opened by html onclick events. Opening it with this function could be done in future, possibly to speed up loading.
function triggerInfoCardOverlay() {
  let infocard_overlay = document.getElementById('infocard_overlay')
  let dark_overlay = document.getElementById('info_overlay')
  if(infocard_overlay.style.display === 'none') {
    // open it
    openedPanel = 'cards'
    infocard_overlay.style.display = 'flex'
    dark_overlay.classList.add('dark_overlay', 'z6')
  } else {
    // close it
    openedPanel = null
    infocard_overlay.style.display = 'none'
    document.getElementById('infocard_stack').innerHTML = ''
    dark_overlay.classList.remove('dark_overlay', 'z6')

    // Here, we could nullize the localBuffer so it is not falsely used by some other instance. When doing so, the whole instance would have to be initiated again when reopening the stacks. Because the user could reopen the same card-stack after closing without opening a different item before, we could instead keep the created instance and only overwrite the localBuffer when the opened item is not the same as before.
  }
}


function addInfoCard(position, index, traktId) {
  let stack
  switch(position) {
    case 'left':
      stack = 'left_stack'
      break
    case 'middle':
      stack = 'middle_stack'
      break
    case 'right':
      stack = 'right_stack'
      break
  }
  let infocard_stack = document.getElementById('infocard_stack')
  infocard_stack.appendChild(generate.infoCardDummy(stack, index, traktId))
}

function generateStackSlider() {
  let slider = document.getElementById('indicator_slider')
  let stacks = getCardStacks()
  let totalSize = stacks.left.length
    + stacks.middle.length // will always be 1, this makes it understandable
    + stacks.right.length

  // Here, we could check if there are more than one items, but its okay to show a single red bar for now.
  // set the width of the thump to match the ratio
  let sliderWidth = slider.offsetWidth/totalSize
  if(sliderWidth < 15) {
    sliderWidth = 15 // fix width to height, so it stays visible
  }

  let styler = document.querySelector('[data="indicator"]')
  styler.innerHTML = `
    #indicator input::-webkit-slider-thumb {
      width: ${sliderWidth}px !important;
    }
  `
  // set position of the thumb
  slider.min = 1;
  slider.max = totalSize
  slider.value = stacks.left.length+1
}

function updateInfoCard(itemUpdates, index) {
  let stacks = getCardStacks()
  debugLog('updating card', index)

  let theStack

  if(index < stacks.left.length) {
    theStack = stacks.left[index]
  } else if(index == stacks.left.length) {
    theStack = stacks.middle[0]
  } else {
    theStack = stacks.right[index - stacks.left.length-1]
  }

  if(theStack !== undefined) {
    theStack.innerHTML = generate.infoCardContent(itemUpdates)
  } else {
    debugLog('!updating card', 'failed, could not find element')
  }
}

function updateInfoCardImage(url, index) {
  let stacks = getCardStacks()
  debugLog('updating card images', index)

  let theCard

  if(index < stacks.left.length) {
    theCard = stacks.left[index]
  } else if(index == stacks.left.length) {
    theCard = stacks.middle[0]    
  } else {
    theCard = stacks.right[index - stacks.left.length-1]
  }

  /** url:
   *    banner
   *    poster
   *    actors[]
   */
  if(theCard !== undefined) {
    theCard.querySelector('.infocard_left').children[0].src = url.banner
    theCard.querySelector('.infocard_left').children[1].src = url.poster
  } else {
    debugLog('!updating card', 'failed, could not find element')
  }
}


/*:::: SIDE-BAR ::::*/

// This object holds the DOM-elements and actions of the sidebar. We need this to generate the frame of the sidebar where content can be added dynamically later. Further comments explain the functioning.
let sideBar = {
  element: document.getElementById('side_panel'),
  // This variable tells which sidebar is currently open. The possible values are:
  // 'none' | 'search' | 'settings' | 'logout'
  status: 'none',
  // These are the available panels
  panels: ['search', 'settings', 'logout'],
  // Now these are the panel creators
  search: {
    create: function() {
      let panel = document.createElement('div')
      panel.classList.add('panel')

      let search_field = document.createElement('input')
      search_field.classList.add('panel_header', 'search', 'fs18', 'fw500', 'white_t', 'black_d_b', 'z4')
      search_field.type = 'search'
      search_field.onkeydown = function() {
        if(event.keyCode === 13) { // ENTER
          search(search_field.value)
          return false
        }
      }

      setTimeout(() => {
        search_field.focus()
      }, 220)
      panel.appendChild(search_field)

      let box = document.createElement('div')
      box.classList.add('panel_header_box', 'top', 'z3')
      panel.appendChild(box)

      let gradient = document.createElement('div')
      gradient.classList.add('panel_header_gradient', 'top_p', 'z3')
      panel.appendChild(gradient)

      let results = document.createElement('div')
      results.classList.add('side_panel_list')
      results.id = 'results'
      panel.appendChild(results)

      return panel
    },
    open: function() {
      this.parent.appendChild(this.create())
    }
  },
  settings: {
    create: function() {
      let panel = document.createElement('div')
      panel.classList.add('panel')

      let headText = document.createElement('h2')
      headText.classList.add('panel_header', 'fs23', 'fw500', 'white_t', 'z4')
      headText.innerText = 'Settings'
      panel.appendChild(headText)

      let box = document.createElement('div')
      box.classList.add('panel_header_box', 'top', 'z3')
      panel.appendChild(box)

      let gradient = document.createElement('div')
      gradient.classList.add('panel_header_gradient', 'top_p', 'z3')
      panel.appendChild(gradient)

      let setting_list = document.createElement('div')
      setting_list.classList.add('side_panel_list', 'animation_slide_right')

      let settings = getSettings('app')

      let settingsArray = objectToArray(settings)

      delayFunction((index, arr) => {
        let s = arr[index].name
        let settingBox = addSetting(settings[s], s)
        setting_list.appendChild(settingBox)
      }, 150, getObjectLength(settings), settingsArray, 2)

      let relaunch_box = document.createElement('div')
      relaunch_box.id = 'relaunch_box'
      relaunch_box.innerHTML = `<h3 class="fs18 fw500 white_t">Some settings require a</h3>` // rest is added below
      relaunch_box.classList.add('black_d_b', 'shadow_h', 'bottom', 'z4')
      relaunch_box.style.visibility = 'hidden'

      let relaunch_button = document.createElement('div')
      relaunch_button.innerText = 'relaunch'
      relaunch_button.classList.add('btn', 'red_d_b', 'white_t')
      relaunch_button.onclick = function() {
        relaunchApp()
      }
      relaunch_box.appendChild(relaunch_button)

      panel.appendChild(setting_list)
      panel.appendChild(relaunch_box)
      return panel
    },
    open: function() {
      this.parent.appendChild(this.create())
    }
  },
  logout: {
    create: function() {
      let panel = document.createElement('div')
      panel.classList.add('panel')

      let logout_button = document.createElement('button')
      logout_button.classList.add('logout_btn', 'fs18', 'white_t', 'black_d_b')
      logout_button.innerText = 'Logout'
      logout_button.onclick = function() {
        signout()
        return false
      }
      panel.appendChild(logout_button)

      let logout_text = document.createElement('div')
      logout_text.style = 'text-align:center;'
      logout_text.innerHTML = '<p>Oh uh!<br>You really want to do this?</p>'
      panel.appendChild(logout_text)
      return panel
    },
    open: function() {
      this.parent.appendChild(this.create())
    }
  },
  // Removes the panel contents from the sidebar
  removeAll: function() {
    let panels = this.element.getElementsByClassName('panel')
    while(panels[0]) {
      panels[0].parentNode.removeChild(panels[0])
    }
  },
  // This helper initializes the available panels by providing the sidebar element as a parent. The method is called right after the creation of this object.
  init: function() {
    this.panels.forEach(panel => {
      this[panel].parent = this.element
    })
    delete this.init
    return this
  }
}.init()


// Opens and closes the given panel
function triggerSidePanel(panelName) {
  // Checking if panel is available. This will not be accessible by the user directly, so we could live without the check but for possible future changes it's safer to have and not wonder about weird errors
  if(!sideBar.panels.includes(panelName)) {
    throw 'panel not available'
  }

  let overlay = document.getElementById('overlay')
  let side_buttons = document.getElementById('side_buttons')
  let side_panel = document.getElementById('side_panel')

  if(sideBar.status == 'none') {
    sideBar.status = panelName
    openedPanel = 'sidebar'

    // fading out the background
    overlay.classList.add('show')

    // now showing the settings panel
    side_panel.classList.remove('side_panel_animate_out')
    side_panel.classList.add('side_panel_animate_in')
    side_buttons.classList.remove('side_buttons_animate_out')
    side_buttons.classList.add('side_buttons_animate_in')

    sideBar[panelName].open()
  }

  // When the panel-button of the currently opened panel was clicked, the whole sidebar will close
  else if(sideBar.status == panelName) {
    if(sideBar.status == 'search') {
      removeSearchResults()
    }
    sideBar.status = 'none'
    openedPanel = null

    // removing the settings panel
    side_panel.classList.remove('side_panel_animate_in')
    side_panel.classList.add('side_panel_animate_out')
    side_buttons.classList.remove('side_buttons_animate_in')
    side_buttons.classList.add('side_buttons_animate_out')

    // fading in the background
    overlay.style.display = 'block'
    overlay.classList.remove('show')
    // the timeout makes a fadeout animation possible
    setTimeout(() => {
      overlay.style.display = 'none'
      sideBar.removeAll()
    }, 220)

    // re-highlight the search button
    show(document.getElementById('search_button_side'))
  }

  // When another button than the currently open panel was clicked, the sidebar stays open and changes it's content
  else {
    sideBar.status = panelName
    sideBar.removeAll()
    sideBar[panelName].open()
  }
}

// These functions are called by onclicks in the HTML
function openSearch() {
  triggerSidePanel('search')
}

function openSettings() {
  triggerSidePanel('settings')
}

function openLogout() {
  triggerSidePanel('logout')
}

function closeSidePanel() {
  try {
    triggerSidePanel(sideBar.status)
  } catch(err) {
    debugLog('error', err)
  }
}


/*:::: SETTINGS PANEL ::::*/
let wantsRelaunch = []

// This adds a setting box to the sidepanel
function addSetting(setting, name) {
  let setting_area = document.createElement('div')
  setting_area.classList.add('setting_holder')
  
  let setting_title = document.createElement('h3')
  setting_title.classList.add('fs18', 'fw500', 'tu', 'tOverflow')
  setting_title.innerText = name

  let settingOld = setting.status

  function alertRequiredReload(settingNew) {
    let relaunch_box = document.getElementById('relaunch_box')
    let setting_list = document.getElementById('side_panel')
    let panel = setting_list.children[0]

    if(settingNew !== settingOld) {
      wantsRelaunch.push(name)
      relaunch_box.style = 'visiblity:visible;'
      relaunch_box.classList.remove('animation_fade_out')
      relaunch_box.classList.add('animation_slide_up')
      panel.children[3].classList.add('relaunch')
      let pos = panel.scrollTop
      panel.scrollTop = pos+200
    } else {
      wantsRelaunch = wantsRelaunch.filter(item => item !== name)
      if(wantsRelaunch.length === 0) {
        relaunch_box.classList.remove('animation_slide_up')
        relaunch_box.classList.add('animation_fade_out')
        panel.children[3].classList.remove('relaunch')
      }
    }
    debugLog('relaunch required', wantsRelaunch)
  }  

  switch(setting.type) {
    case 'select': {
      classname = 'setting_select'

      for(let o in setting.options) {
        let opt = setting.options[o]

        let setting_contain = document.createElement('div')
        setting_contain.classList.add('setting_container')

        let preview = document.createElement('div')
        preview.classList.add('setting_box')

        let def = document.createElement('div')
        def.classList.add('setting_def', 'fs14' , 'white_d_t', 'tu', 'tOverflow')

        if(setting.default == o) {
          def.innerText = 'default'
        }

        if(setting.status == o) {
          preview.classList.add('selected')
        }

        preview.onclick = function() {
          if(!preview.classList.contains('selected')) {
            let par = preview.parentElement.parentElement;
            [...par.children].forEach(element => {
              if(element.children[0] == preview) {
                preview.classList.add('selected')
                setSetting('app', name, o)
                updateApp()
              } else {
                element.children[0].classList.remove('selected')
              }
            })
          }
        }

        if(opt.preview) {
          def.classList.add('top')
          setting_contain.classList.add('wide')
          preview.style.backgroundImage = `url('../../assets/previews/${opt.value}')`
        } else {
          setting_area.style = 'display:flex;justify-content:space-between;'
          preview.style.backgroundColor = opt.value
        }

        setting_contain.appendChild(preview)
        setting_contain.appendChild(def)
        setting_area.appendChild(setting_contain)
      }
      break
    }
    case 'toggle': {
      classname = 'setting_toggle'
      let check_no = ''
      let check_yes = ''
      if(setting.status) {
        check_yes = 'checked'
      } else {
        check_no = 'checked'
      }

      let idname = name.split(' ').join('_')

      let toggle_switch = document.createElement('div')
      toggle_switch.innerHTML = `
      <p class="btn-switch" id="setting_${idname}">
        <input ${check_no} type="radio" id="no_${idname}" name="switch_${idname}" class="btn-switch__radio btn-switch__radio_no"/>
        <input ${check_yes} type="radio" id="yes_${idname}" name="switch_${idname}" class="btn-switch__radio btn-switch__radio_yes"/>
        <label for="no_${idname}" class="btn-switch__label btn-switch__label_no">
          <span class="btn-switch__txt"></span>
        </label>
        <label for="yes_${idname}" class="btn-switch__label btn-switch__label_yes">
          <span class="btn-switch__txt"></span>
        </label>
      </p>
      `

      toggle_switch.onclick = function() {
        let radio = document.getElementById(`yes_${idname}`)
        alertRequiredReload(radio.checked)
        setSetting('app', name, radio.checked)
        updateApp()
      }

      let def = document.createElement('div')
      def.classList.add('setting_def', 'fs14' , 'white_d_t', 'tu')

      def.innerText = 'default: '
      if(setting.default) {
        def.innerText += 'on'
      } else {
        def.innerText += 'off'
      }

      setting_area.style = 'display:flex;justify-content:space-between;align-items:center;'
      setting_area.appendChild(toggle_switch)
      setting_area.appendChild(def)
      break
    }
    case 'range': {
      classname = 'setting_range'

      let slider = document.createElement('input')
      slider.type = 'range'
      slider.min = setting.range[0] / setting.accuracy
      slider.max = setting.range[1] / setting.accuracy
      slider.value = setting.status / setting.accuracy
      slider.style.background = `linear-gradient(to right, var(--accent_color) 0%, var(--accent_color) ${setting.status}%, var(--white_d) ${setting.status}%, var(--white_d) 100%)`;
      slider.classList.add('slider')

      slider.oninput = function() {
        let value = slider.value * setting.accuracy
        slider.style.background = 'linear-gradient(to right, var(--accent_color) 0%, var(--accent_color) '+value +'%, var(--white_d) ' + value + '%, var(--white_d) 100%)'
        setSetting('app', name, value)
        updateApp()
      }

      let def = document.createElement('div')
      def.classList.add('setting_def', 'fs14' , 'white_d_t', 'tu')

      def.innerText = 'default: ' + setting.default

      setting_area.appendChild(slider)
      setting_area.appendChild(def)
      break
    }
    default: { break }
  }

  let box = document.createElement('div')
  box.classList.add('panel_box', 'panel_box_container', 'setting')

  box.appendChild(setting_title)
  box.appendChild(setting_area)
  return box
}

/*:::: SEARCH-PANEL ::::*/
let searchHistoryCache = new Cache('searchHistory')

// This gets fired when the user searches something from the sidebar
async function search(text) {
  let requestTime = Date.now()
  removeSearchResults()

  if(text == '') {
    // empty search submitted
    return false
  }

  let data = await searchRequestHelper(text).then(res => res)

  data.result.forEach(item => {
    let type = item.trakt.type

    debugLog('search', `adding result ${item.trakt[type].ids.trakt} (${item.trakt.score})`)
    // fallback for unavailable images
    let img = url = '../../assets/'+config.client.placeholder.search

    if(item.fanart !== undefined) {
      if(item.fanart.hasOwnProperty('tvposter')) {
        img = item.fanart.tvposter[0].url
      } else if(item.fanart.hasOwnProperty('movieposter')) {
        img = item.fanart.movieposter[0].url
      }
    }

    // render search result
    let panel = document.getElementById('results')
    
    let result = generate.searchResult({
      title: item.trakt[type].title,
      type: type,
      rating: Math.round(item.trakt[type].rating * 10),
      img: img,
      description: item.trakt[type].overview,
      id: item.trakt[type].ids.tmdb
    })

    panel.appendChild(result)
  })

  debugLog('time taken', Date.now()-requestTime+'ms')
}


// Removes all elements from the search panel in the sidebar
function removeSearchResults() {
  let panel = document.getElementById('results')
  boxes = panel.getElementsByClassName('panel_box search')
  while(boxes[0]) {
    boxes[0].parentNode.removeChild(boxes[0])
  }
}


/*:::: UP-NEXT-TO-WATCH ::::*/
// This gets fired when the dashboard is loaded
async function generatePosterSection(update) {
  let requestTime = Date.now()

  let data = await getUnfinishedProgressList(5, update)

  if(update) {
    // clear dashboard
    document.querySelector('#dash').innerHTML = `
      <div class="titles" id="poster_title"></div>
      <ul class="posters" id="posters"></ul>`
  }

  data.forEach((item, index) => {
    debugLog('item to add', item.show.show.title)

    let next = item.progress.next_episode
    let title = item.show.show.title
    let subtitle = `${next.season} x ${next.number+(next.number_abs?' ('+next.number_abs +')':'')} ${next.title}`

    if(index === 0) {
      let titleElement = document.getElementById('poster_title')
      titleElement.innerHTML = generate.upNextTitle({
        title,
        subtitle
      })
    }

    let posterSection = document.getElementById('posters')
    let poster = generate.upNextPoster({
      title: title,
      subtitle: subtitle,
      rating: next.rating,
      id: item.show.show.ids.tvdb,
      season: next.season,
      matcher: `${item.show.show.ids.trakt}_e_${next.season}_${next.number}`
    })

    posterSection.appendChild(poster)
  })

  debugLog('time taken',  Date.now()-requestTime+'ms')
}


function animateText(textBox, onenter) {
  if(!textBox.children[0].classList.contains('hidden')){
    let container = document.getElementById('poster_title')
    let container_title = container.children[1]
    let container_subtitle = container.children[2]

    let title = textBox.getAttribute('data_title')
    let subtitle = textBox.getAttribute('data_subtitle')

    if(title.toLowerCase() !== container_title.innerText.toLowerCase()) {
      if(onenter) {
        toggleAnimation(container_title, 'animation_slide_up', title)
        toggleAnimation(container_subtitle, 'animation_slide_up', subtitle)
      }
    }

    let poster = document.getElementById('posters').firstChild
    let poster_title = poster.getAttribute('data_title')
    let poster_subtitle = poster.getAttribute('data_subtitle')

    if(poster_title.toLowerCase() !== container_title.innerText.toLowerCase()) {
      if(!onenter) {
        toggleAnimation(container_title, 'animation_slide_up', poster_title)
        toggleAnimation(container_subtitle, 'animation_slide_up', poster_subtitle)
      }
    }
  }
}

function toggleAnimation(x, y, z) {
  x.classList.remove(y)
  void x.offsetWidth
  x.innerText = z
  x.classList.add(y)
}

/**
 * First function to trigger when a poster is clicked.
 * @param {HTMLElement} poster Image which got clicked on
 */
function openInfoCard(poster) {
  // matcher layout: <show_id>_<m,t,s,e,p,l>_[season]_[episode]
  let matcher = poster.getAttribute('data_matcher')
  debugLog('info card', matcher)
  matcher = matcher.split('_')

  let showId = matcher[0]

  switch(matcher[1]) {
    case 'e': { // episode
      let seasonNum = matcher[2]
      let episodeNum = matcher[3]

      let onCallbacks = {
        size: epPosition => {
          // remove possibly existing dummies that were used as a loading indicator
          document.getElementById('infocard_stack').innerHTML = ''

          let leftStackSize = epPosition.current - 1
          let rightStackSize = epPosition.total - epPosition.current

          let i = 0

          for(i; i<leftStackSize; i++) {
            addInfoCard('left', i, showId)
          }

          addInfoCard('middle', i, showId)

          for(let j=1; j<=rightStackSize; j++) {
            addInfoCard('right', i+j, showId)
          }
          updateLeftRightButtons()
          generateStackSlider()
        },
        first: epData => { // onFirst
          // find index of the middle card
          let index = getCardStacks().left.length
          updateInfoCard(epData, index)
          updateLeftRightButtons()
        },
        buffer: (bufferData, pos) => { // onBuffer
          updateInfoCard(bufferData, pos)
        },
        images: (urls, pos) => { // onImage
          updateInfoCardImage(urls, pos)
        }
      }

      if(localBuffer instanceof showBuffer && localBuffer.id == showId) {
        localBuffer.openAt(seasonNum, episodeNum, onCallbacks)
      } else {
        localBuffer = new showBuffer(showId)
        localBuffer.initAt(seasonNum, episodeNum, onCallbacks)
      }

      break
    }
  }

  triggerInfoCardOverlay()
}

/*:::: RPC ::::*/
async function updateRpc() {
  if(config.client.settings.app['discord rpc'].status) {
    let settings = await createRpcContent()
    let stateArray = config.client.rpc.states
    settings.state = pick(stateArray)
    rpc.update(settings)
    setInterval(() => {
      settings.state = pick(stateArray)
      rpc.update(settings)
    }, 479e3)
  }
}

async function createRpcContent() {
  let stats = await getUserStats() // from request module
  return {
    time: {
      movies: stats.movies.minutes,
      shows: stats.episodes.minutes
    }
  }
}

/*:::: ACTION BUTTONS ::::*/
// functions that get called when clicking on action buttons

function playNow(matcher) {
  alert('playing now!')
}

function addToWatchlist(matcher) {
  alert('added to history!')
}

function addToHistory(matcher) {
  let [id, type, se, ep] = matcher.split('_')

  showAlertBoxAndWait({/*options*/}, proceed => {
    if(proceed) {
      requestHistoryUpdatePosting(id, {
        type: type == 'e' ? 'episode' : 'movie',
        season: type == 'e' ? Number(se) : null,
        episode: type == 'e' ? Number(ep) : null
      })
    } else {
      debugLog('declined', `history update for ${id}`)
    }
  })
}


/**
 * This triggers an alert box where the user can accept or decline his recently performed action. It will be reusable across the whole app.
 * @param {Object} options Individual settings for the popup
 * @param {Function} proceed Callback sending sending back status
 */
function showAlertBoxAndWait(options, proceed) {
  // the `options` object could have properties like
  // { title, description, acceptButtonText, declineButtonText }

  // call this to decline the action
  proceed(false)
  // call this to accept
  proceed(true)
}
