const trakt = remote.getGlobal('trakt')
const fanart = remote.getGlobal('fanart')
const getSettings = remote.getGlobal('getSettings')
const setSetting = remote.getGlobal('setSetting')
const defaultAll = remote.getGlobal('defaultAll')
const updateApp = remote.getGlobal('updateApp')
let config = remote.getGlobal('config')

// Here we update the app with saved settings after the window is created
window.onload = async function() {
  debugLog('window', 'dashboard loading')
  updateApp()
  generatePosterSection()

  let settings = await createRpcContent()
  let stateArray = config.client.rpc.states
  settings.state = pick(stateArray)
  rpc.update(settings)
  setInterval(() => {
    settings.state = pick(stateArray)
    rpc.update(settings)
  }, 60e3)
}

// This guy waits for messages on the 'modify-root' channel. The messages contain setting objects that then get applied to the 'master.css' style sheet.
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

// Here, dashboard-wide shortcuts are defined. The 'meta' key represents CMD on macOS and Ctrl on Windows
document.onkeydown = function() {
  if(event.metaKey && event.keyCode === 83) { // meta + S
    debugLog('shortcut', 'Meta + S')
    show(document.getElementById('search_button_side'))
    triggerSidePanel('search')
    return false
  } else if(event.metaKey && event.keyCode === 188) { // meta + ,
    debugLog('shortcut', 'Meta + ,')
    show(document.getElementById('settings_button_side'))
    triggerSidePanel('settings')
    return false
  } else if(event.keyCode === 27) { // ESC
    debugLog('shortcut', 'ESC')
    // close the currently open panel
    try {
      triggerSidePanel(sideBar.status)
    } catch(err) {
      debugLog('error', 'no side panel available to close')
    }
  }
}


// This highlights the passed element. It does this by giving the element the 'selected' class and removing it from all siblings
function show(x) {
  let par = x.parentElement.parentElement;
  [...par.children].forEach(element => {
    if(element.children[0] == x) {
      x.classList.add('selected')
    } else {
      element.children[0].classList.remove('selected')
    }
  })
}


//:::: SIDEBAR ::::\\

// This object holds the DOM-elements and actions of the sidebar. Further comments explain the functioning.
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
      search_field.classList = 'panel_header search fs23 fw500 white_t black_d_b z4'
      search_field.type = 'text'
      search_field.onkeydown = function() {
        if(event.keyCode == 13) {
          search(search_field.value)
          return false
        }
      }

      setTimeout(() => {
        search_field.focus()
      }, 220)
      panel.appendChild(search_field)

      let box = document.createElement('div')
      box.classList = 'panel_header_box top z3'
      panel.appendChild(box)

      let gradient = document.createElement('div')
      gradient.classList = 'panel_header_gradient top_p z3'
      panel.appendChild(gradient)

      let results = document.createElement('div')
      results.classList = 'side_panel_list'
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
      panel.id = 'settings_panel'
      panel.innerHTML = '<h2>Settings</h2>'

      let setting_list = document.createElement('div')
      setting_list.id = 'setting_list'

      let settings = getSettings('app')
      for(let s in settings) {
        let settingBox = addSetting(settings[s], s)
        setting_list.appendChild(settingBox)
      }

      panel.appendChild(setting_list)
      return panel
    },
    open: function() {
      this.parent.appendChild(this.create())
    }
  },
  logout: {
    create: function() {
      let panel = document.createElement('div')
      panel.classList.add('panel', 'vertical_align')
      panel.id = 'logout_panel'

      let logout_button = document.createElement('button')
      logout_button.id = 'logout_button'
      logout_button.innerText = 'Logout'
      logout_button.onclick = function() {
        signout()
        return false
      }
      panel.appendChild(logout_button)

      let logout_text = document.createElement('div')
      logout_text.id = 'logout_text'
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

// This adds a setting box to the sidepanel
function addSetting(setting, name) {
  let setting_area = document.createElement('div')
  setting_area.classList.add('col_2')
  let setting_title = document.createElement('h3')
  setting_title.innerText = name

  switch(setting.type) {
    case 'select': {
      classname = 'setting_select'

      for(let o in setting.options) {
        let opt = setting.options[o]

        let preview = document.createElement('div')
        preview.classList.add('setting_preview')

        let def = document.createElement('div')
        def.classList.add('setting_def', 'white_d_t')

        if(setting.default == o) {
          def.innerText = 'default'
        }

        if(setting.status == o) {
          preview.classList.add('selected')
        }

        preview.onclick = function() {
          if(!preview.classList.contains('selected')) {
            let par = preview.parentElement;
            [...par.children].forEach(element => {
              if(element == preview) {
                preview.classList.add('selected')
                setSetting('app', name, o)
                updateApp()
              } else {
                element.classList.remove('selected')
              }
            })
          }
        }

        if(opt.preview) {
          preview.classList.add('preview_img')
          preview.style.backgroundImage = `url('../../assets/previews/${opt.value}')`
        } else {
          preview.classList.add('preview_color')
          preview.style.backgroundColor = opt.value
        }

        setting_area.appendChild(preview)
        setting_area.appendChild(def)
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
        setSetting('app', name, radio.checked)
        updateApp()
      }

      let def = document.createElement('div')
      def.classList.add('setting_def', 'white_d_t')

      def.innerText = 'default: '
      if(setting.default) {
        def.innerText += 'on'
      } else {
        def.innerText += 'off'
      }

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
      slider.classList.add('slider')

      slider.oninput = function() {
        let value = slider.value * setting.accuracy
        setSetting('app', name, value)
        updateApp()
      }

      let def = document.createElement('div')
      def.classList.add('setting_def', 'white_d_t')

      def.innerText = 'default: ' + setting.default

      setting_area.appendChild(slider)
      setting_area.appendChild(def)
      break
    }
    default: { break }
  }

  let box = document.createElement('div')
  box.classList.add('setting_box')

  box.appendChild(setting_title)
  box.appendChild(setting_area)
  return box
}


//:::: SEARCH PANEL ::::\\
let searchHistoryCache = new Cache('searchHistory')

// This gets fired when the user searches something from the sidebar
async function search(text) {
  let requestTime = Date.now()
  removeSearchResults()

  if(text == '') {
    // empty search submitted
    return false
  }

  let cacheContent = searchHistoryCache.getKey(text)
  if(cacheContent !== undefined) {
    // add cached search results
  }

  let data = await searchRequestHelper(text).then(res => res)
  debugLog('request finished', data.date)

  data.result.forEach(item => {
    debugLog('search', `adding result ${item.trakt[item.trakt.type].ids.trakt} (${item.trakt.score})`)
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
    addSearchResult({
      title: item.trakt[item.trakt.type].title,
      type: item.trakt.type,
      rating: Math.round(item.trakt[item.trakt.type].rating * 10),
      img: img,
      description: item.trakt[item.trakt.type].tagline
    })
  })

  debugLog('time taken', Date.now()-requestTime+'ms')
}


// This function generates a html element for one search result and adds it to the sidebar.
function addSearchResult(result) {
  let panel = document.getElementById('results')
  let panel_box = document.createElement('div')
  panel_box.classList = 'panel_box search'

  let poster_img = document.createElement('img')
  poster_img.classList = 'poster'
  poster_img.src = result.img

  let panel_box_container = document.createElement('div')
  panel_box_container.classList = 'panel_box_container'

  let h3 = document.createElement('h3')
  h3.classList = 'fs18'
  h3.innerText = result.title

  let p = document.createElement('p')
  p.innerText = result.overview

  let poster_content = document.createElement('div')
  poster_content.classList = 'poster-content'

  let poster_content_left = document.createElement('div')
  poster_content_left.classList = 'poster-content-left'

  let heart = document.createElement('img')
  heart.src = '../../assets/icons/app/heart.svg'

  let span = document.createElement('span')
  span.classList = 'fs16'
  span.innerText = result.rating

  let poster_content_right = document.createElement('div')
  poster_content_right.classList = 'poster-content-right fs16 tu'
  poster_content_right.innerText = result.type

  poster_content_left.appendChild(heart)
  poster_content_left.appendChild(span)

  poster_content.appendChild(poster_content_left)
  poster_content.appendChild(poster_content_right)

  panel_box_container.appendChild(h3)
  panel_box_container.appendChild(p)
  panel_box_container.appendChild(poster_content)

  panel_box.appendChild(poster_img)
  panel_box.appendChild(panel_box_container)

  panel.appendChild(panel_box)
}


// Removes all elements from the search panel in the sidebar
function removeSearchResults() {
  let panel = document.getElementById('search_results')
  boxes = panel.getElementsByClassName('search_result_box')
  while(boxes[0]) {
    boxes[0].parentNode.removeChild(boxes[0])
  }
}


//:::: UP NEXT DASHBOARD ::::\\

// This gets fired when the dashboard is loaded
async function generatePosterSection() {
  let requestTime = Date.now()

  let data = await getUpNextToWatch()

  data.forEach((item, index) => {
    if(!item.completed) {
      debugLog('item to add', item.show.title)

      let next = item.nextEp
      let title = item.show.title
      let subtitle = `${next.season} x ${next.episode+(next.count?' ('+next.count +')':'')} ${next.title}`

      if(index === 0) {
        createTitle({
          title: title,
          subtitle: subtitle
        })
      }
      createPoster({
        title: title,
        subtitle: subtitle,
        rating: next.rating,
        id: item.show.ids.tvdb,
        img: item.img
      })
    }
  })

  debugLog('time taken',  Date.now()-requestTime+'ms')
}


async function createPoster(itemToAdd) {
  let li = document.createElement('li')
  li.classList = 'poster poster-dashboard shadow_h'
  li.setAttribute('data_title', itemToAdd.title)
  li.setAttribute('data_subtitle', itemToAdd.subtitle)
  li.setAttribute('onmouseover', 'animateText(this, true)')
  li.setAttribute('onmouseleave', 'animateText(this, false)')

  let poster_content = document.createElement('div')
  poster_content.classList = 'poster-content'

  let poster_content_left = document.createElement('div')
  poster_content_left.classList = 'poster-content-left fs14 white_t fw700'

  let heart = document.createElement('img')
  heart.src = '../../assets/icons/app/heart.svg'

  let rate = document.createElement('span')
  rate.innerText = `${Math.round(itemToAdd.rating * 10)}%`

  poster_content_left.appendChild(heart)
  poster_content_left.appendChild(rate)

  let poster_content_right = document.createElement('div')
  poster_content_right.classList = 'poster-content-right fs14 white_t fw700 t_'
  poster_content_right.innerText = 'Add to History'

  poster_content.appendChild(poster_content_left)
  poster_content.appendChild(poster_content_right)

  let img = document.createElement('img')

  img.src = await itemToAdd.img

  li.appendChild(poster_content)
  li.appendChild(img)

  let posters = document.getElementById('posters')
  posters.appendChild(li);
}

function createTitle(itemToAdd) {
  let title = document.getElementById('poster_title')

  let h3 = document.createElement('h3')
  h3.classList = 'h3 red_t tu'
  h3.innerText = 'up next to watch'

  let h1 = document.createElement('h1')
  h1.classList = 'h1 white_t tu'
  h1.innerText = itemToAdd.title

  let h1_2 = document.createElement('h1')
  h1_2.classList = 'h1 white_d_t'
  h1_2.innerText = itemToAdd.subtitle

  title.appendChild(h3)
  title.appendChild(h1)
  title.appendChild(h1_2)
}

function animateText(textBox, onenter) {
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

function toggleAnimation(x, y, z) {
  x.classList.remove(y)
  void x.offsetWidth
  x.innerText = z
  x.classList.add(y)
}


//:::: RPC ::::\\

async function createRpcContent() {
  let stats = await getUserStats()
  return {
    time: {
      movies: stats.movies.minutes,
      shows: stats.episodes.minutes
    }
  }
}

function pick(array) {
  return array[Math.floor(Math.random() * array.length)]
}
