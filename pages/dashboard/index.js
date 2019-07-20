const trakt = remote.getGlobal('trakt')
const fanart = remote.getGlobal('fanart')
const getSettings = remote.getGlobal('getSettings')
const setSetting = remote.getGlobal('setSetting')
const defaultAll = remote.getGlobal('defaultAll')
const updateApp = remote.getGlobal('updateApp')

// Here we update the app with saved settings after the window is created
window.onload = function () {
  updateApp()
  createPosters()
}

ipcRenderer.on('modify-root', (event, data) => {
  let variables = document.styleSheets[0]
    .cssRules[0].style.cssText.split(';')

  let result = {}
  for (let i in variables) {
    let a = variables[i].split(':')
    if (a[0] !== '') {
      result[a[0].trim()] = a[1].trim()
    }
  }

  let keys = Object.keys(result)
  document.documentElement.style.setProperty(keys[keys.indexOf(data.name)], data.value)
});


// This highlights the passed element. It does this by giving the element the 'selected' class and removing it from all siblings
function show(x) {
  let par = x.parentElement.parentElement;
  [...par.children].forEach(element => {
    if (element.children[0] == x) {
      x.classList.add('selected');
    } else {
      element.children[0].classList.remove('selected');
    }
  });
}


function syncWatched() {
  return trakt.sync.watched({
    type: 'shows'
  }).then(res => res)
}

function hiddenItems() {
  return trakt.users.hidden.get({
    section: 'progress_watched',
    limit: 100
  }).then(res => res)
}

function resolveAll() {
  return Promise.all([syncWatched(), hiddenItems()])
}

function createPosters() {
  resolveAll().then(([res, res2]) => {
    let arr = Array.from(res);
    let arr2 = Array.from(res2);

    // filters hidden items
    let array2Ids = arr2.map(item => item.show.ids.trakt);
    arr = arr.filter((item) => !array2Ids.includes(item.show.ids.trakt));

    // filters completed shows and creates first title
    let first = true;
    arr.forEach(item => {
      trakt.shows.progress.watched({
        id: item.show.ids.trakt,
        extended: 'full'
      }).then(res4 => {
        if (res4.aired > res4.completed) {
          let ep = res4.next_episode
          let title = item.show.title
          let subtitle = `${ep.season} x ${ep.number}${ep.number_abs?` (${ep.number_abs})`:''} ${ep.title}`

          if (first) {
            createTitle({
              title: title,
              subtitle: subtitle
            })
            first = false
          }
          createPoster({
            title: title,
            subtitle: subtitle,
            rating: ep.rating,
            id: item.show.ids.tvdb
          })
        }
      }).catch(err => console.log(err))
    })
  }).catch(err => console.log(err))
}

function createPoster(x) {
  let li = document.createElement('li')
  li.classList = 'poster poster-dashboard shadow_h'
  li.setAttribute('data_title', x.title)
  li.setAttribute('data_subtitle', x.subtitle)
  li.setAttribute('onmouseover', 'animateText(this, true)')
  li.setAttribute('onmouseleave', 'animateText(this, false)')

  let poster_content = document.createElement('div')
  poster_content.classList = 'poster-content'

  let poster_content_left = document.createElement('div')
  poster_content_left.classList = 'poster-content-left fs14 white_t fw700'

  let heart = document.createElement('img')
  heart.src = '../../assets/icons/app/heart.svg'

  let rate = document.createElement('span')
  rate.innerText = `${Math.round(x.rating * 10)}%`

  poster_content_left.appendChild(heart)
  poster_content_left.appendChild(rate)

  let poster_content_right = document.createElement('div')
  poster_content_right.classList = 'poster-content-right fs14 white_t fw700 t_'
  poster_content_right.innerText = 'Add to History'

  poster_content.appendChild(poster_content_left)
  poster_content.appendChild(poster_content_right)

  let img = document.createElement('img')

  fanart.shows.get(x.id).then(res => {
    if (res) {
      if (res.seasonposter) {
        img.src = res.seasonposter[0].url
      } else if (res.tvposter) {
        img.src = res.tvposter[0].url
      } else {
        img.src = 'https://png.pngtree.com/svg/20160504/39ce50858b.svg'
      }
    }
  }).catch(img.src = 'https://png.pngtree.com/svg/20160504/39ce50858b.svg')

  li.appendChild(poster_content)
  li.appendChild(img)

  let posters = document.getElementById('posters')
  posters.appendChild(li);
}

function createTitle(x) {
  let title = document.getElementById('poster_title')

  let h3 = document.createElement('h3')
  h3.classList = 'h3 red_t tu'
  h3.innerText = 'up next to watch'

  let h1 = document.createElement('h1')
  h1.classList = 'h1 white_t tu'
  h1.innerText = x.title

  let h1_2 = document.createElement('h1')
  h1_2.classList = 'h1 white_d_t'
  h1_2.innerText = x.subtitle

  title.appendChild(h3)
  title.appendChild(h1)
  title.appendChild(h1_2)
}

function animateText(x, onenter) {
  let container = document.getElementById('poster_title')
  let container_title = container.children[1]
  let container_subtitle = container.children[2]

  let title = x.getAttribute('data_title')
  let subtitle = x.getAttribute('data_subtitle')

  if (title.toLowerCase() != container_title.innerText.toLowerCase()) {
    if (onenter) {
      animationToggle(container_title, 'animation_slide_up', title)
      animationToggle(container_subtitle, 'animation_slide_up', subtitle)
    }
  }

  let poster = document.getElementById('posters').firstChild
  let poster_title = poster.getAttribute('data_title')
  let poster_subtitle = poster.getAttribute('data_subtitle')

  if (poster_title.toLowerCase() != container_title.innerText.toLowerCase()) {
    if (!onenter) {
      animationToggle(container_title, 'animation_slide_up', poster_title)
      animationToggle(container_subtitle, 'animation_slide_up', poster_subtitle)
    }
  }
}

function animationToggle(x, y, z) {
  x.classList.remove(y)
  void x.offsetWidth
  x.innerText = z
  x.classList.add(y)
}

// Here, dashboard-wide shortcuts are defined. The 'meta' key represents CMD on macOS and Ctrl on Windows
document.onkeydown = function () {
  if (event.metaKey && event.keyCode == 83) { // meta + S
    show(document.getElementById('search_button_side'))
    triggerSidePanel('search')
    return false
  } else if (event.metaKey && event.keyCode == 188) { // meta + ,
    show(document.getElementById('settings_button_side'))
    triggerSidePanel('settings')
    return false
  } else if (event.keyCode == 27) { // ESC
    // close the currently open panel
    try {
      triggerSidePanel(sideBar.status)
    } catch (err) {
      console.log(err)
    }
  }
}

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
    create: function () {
      let panel = document.createElement('div')
      panel.classList.add('panel')
      panel.id = 'search_panel'

      let search_field = document.createElement('input')
      search_field.id = 'search_field'
      search_field.type = 'text'
      search_field.onkeydown = function () {
        if (event.keyCode == 13) {
          search(search_field.value)
          return false
        }
      }

      setTimeout(() => {
        search_field.focus()
      }, 220)
      panel.appendChild(search_field)

      let field_box = document.createElement('div')
      field_box.id = 'field_box'
      panel.appendChild(field_box)

      let field_gradient = document.createElement('div')
      field_gradient.id = 'field_gradient'
      panel.appendChild(field_gradient)

      let search_results = document.createElement('div')
      search_results.id = 'search_results'
      panel.appendChild(search_results)

      return panel
    },
    open: function () {
      this.parent.appendChild(this.create())
    }
  },
  settings: {
    create: function () {
      let panel = document.createElement('div')
      panel.classList.add('panel')
      panel.id = 'settings_panel'
      panel.innerHTML = '<h2>Settings</h2>'

      let setting_list = document.createElement('div')
      setting_list.id = 'setting_list'

      let settings = getSettings('app')
      for (let s in settings) {
        let settingBox = addSetting(settings[s], s)
        setting_list.appendChild(settingBox)
      }

      panel.appendChild(setting_list)
      return panel
    },
    open: function () {
      this.parent.appendChild(this.create())
    }
  },
  logout: {
    create: function () {
      let panel = document.createElement('div')
      panel.classList.add('panel', 'vertical_align')
      panel.id = 'logout_panel'

      let logout_button = document.createElement('button')
      logout_button.id = 'logout_button'
      logout_button.innerText = 'Logout'
      logout_button.onclick = function () {
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
    open: function () {
      this.parent.appendChild(this.create())
    }
  },
  // Removes the panel contents from the sidebar
  removeAll: function () {
    let panels = this.element.getElementsByClassName('panel')
    while (panels[0]) {
      panels[0].parentNode.removeChild(panels[0])
    }
  },
  // This helper initializes the available panels by providing the sidebar element as a parent. The method is called right after the creation of this object.
  init: function () {
    this.panels.forEach(panel => {
      this[panel].parent = this.element
    })
    delete this.init
    return this
  }
}.init()

function triggerSidePanel(panelName) {
  // Checking if panel is available. This will not be accessible by the user directly, so we could live without the check but for possible future changes it's safer to have and not wonder about weird errors
  if (!sideBar.panels.includes(panelName)) {
    throw 'panel not available'
  }

  let overlay = document.getElementById('dash_overlay')
  let dash = document.getElementById('dash')
  let side_buttons = document.getElementById('side_buttons')
  let side_panel = document.getElementById('side_panel')

  if (sideBar.status == 'none') {
    sideBar.status = panelName

    // fading out the background
    overlay.classList.add('dark_overlay')

    // now showing the settings panel
    side_panel.classList.remove('side_panel_animate_out')
    side_panel.classList.add('side_panel_animate_in')
    side_buttons.classList.remove('side_buttons_animate_out')
    side_buttons.classList.add('side_buttons_animate_in')

    sideBar[panelName].open()
  }

  // When the panel-button of the currently opened panel was clicked, the whole sidebar will close
  else if (sideBar.status == panelName) {
    if (sideBar.status == 'search') {
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
    overlay.classList.remove('dark_overlay')
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
  } catch (err) {
    console.log(err)
  }
}

// This function generates a html element for one search result and adds it to the sidebar.
function addSearchResult(result) {
  let panel = document.getElementById('search_results')
  let result_box = document.createElement('div')
  result_box.classList.add('search_result_box')

  let result_img_box = document.createElement('div')
  result_img_box.classList.add('vertical_align')

  let result_img = document.createElement('img')
  if (result.img) {
    result_img.src = result.img
  } else {
    result_img.style.width = '105px'
    result_img.style.opacity = '0'
  }

  let result_text = document.createElement('div')
  result_text.classList.add('search_result_text')
  result_text.innerHTML = `<h3>${result.title}</h3><p>${result.description}</p>`

  let result_rating = document.createElement('div')
  result_rating.classList.add('search_result_rating')
  css(result_rating, {
    float: 'left',
    height: '15px'
  })
  result_rating.innerHTML = `<img src="../../assets/icons/app/heart.svg" style="height: 15px;"><span>${result.rating}%</span>`

  let result_type = document.createElement('div')
  result_type.classList.add('search_result_type')
  css(result_type, {
    float: 'right'
  })
  result_type.innerHTML = `${result.type}`

  result_text.append(result_rating, result_type)
  result_img_box.append(result_img)
  result_box.append(result_img_box, result_text)

  panel.appendChild(result_box)
}

function removeSearchResults() {
  let panel = document.getElementById('search_results')
  boxes = panel.getElementsByClassName('search_result_box')
  while (boxes[0]) {
    boxes[0].parentNode.removeChild(boxes[0])
  }
}

let searchSubmitted = false

function search(text) {
  if (text == '') {
    // empty search submitted
    return
  }

  if (!searchSubmitted) {
    searchSubmitted = true
  } else {
    removeSearchResults()
    searchSubmitted = false
  }

  let searchOptions = [
    'show', 'shows', 'tv', 'movie', 'person', 'episode', 'ep', 's', 'm', 'p', 'e'
  ].map(o => o + ':')

  let query = startsWithFilter(text, searchOptions, ':')

  // This converts the simplified search type into a request-friendly one
  switch (query.found) {
    case 's':
    case 'show':
    case 'shows':
    case 'tv': {
      query.type = 'show'
      break
    }
    case 'm':
    case 'movie': {
      query.type = 'movie'
      break
    }
    case 'e':
    case 'ep':
    case 'episode': {
      query.type = 'episode'
      break
    }
    case 'p':
    case 'person': {
      query.type = 'person'
      break
    }
    default: {
      break
    }
  }

  console.log(query.type + ':', query.filtered)

  trakt.search.text({
    type: query.type,
    query: query.filtered
  }).then(result1 => {
    new Promise((resolve1, reject1) => {
      let arr1 = []
      result1.forEach(r1 => {
        let obj1 = {
          title: r1[query.type].title,
          type: query.type,
          id: r1[query.type].ids
        }
        arr1.push(obj1)
      })
      resolve1(arr1)
    }).then(result2 => {
      new Promise((resolve2, reject2) => {
        result2.forEach(r2 => {
          new Promise(async (resolve3, reject3) => {
            if (r2.type != 'person') {
              await trakt[r2.type + 's'].ratings({
                id: r2.id.trakt
              }).then(result2a => {
                r2.rating = Math.round(result2a.rating * 10)
              }).catch(err => console.log(err))
            }
            resolve3(r2)
          }).then(result3 => {
            new Promise(async (resolve4, reject4) => {
              if (result3.type != 'person') {
                let mv = result3.type == 'movie' ? 'm' : 'v'
                await fanart[result3.type + 's'].get(result3.id['t' + mv + 'db'])
                  .then(result3a => {
                    if (result3a.tvposter) {
                      result3.img = result3a.tvposter[0].url
                    } else if (result3a.movieposter) {
                      result3.img = result3a.movieposter[0].url
                    } else {
                      throw 'no poster' // couldn't find a poster
                    }
                  }).catch(err => {
                    console.log((err == 'no poster') ? err : '' || 'not in fanart')
                    // put a placeholder for the unavailable image
                    result3.img = 'https://png.pngtree.com/svg/20160504/39ce50858b.svg'
                  })
              }
              resolve4(result3)
            }).then(result4 => {
              addSearchResult(result4)
            }).catch(err => console.log(err))
          })
        })
        resolve2()
      }).catch(err => console.log(err))
    }).catch(err => console.log(err))
  }).catch(err => console.log(err))
}

function startsWithFilter(string, options, removeFromFilter) {
  string = string.toString()
  for (let opt in options) {
    if (string.startsWith(options[opt])) {
      return {
        found: options[opt].split(removeFromFilter || '').join(''),
        filtered: string.split(options[opt])[1]
      }
    }
  }
  return {
    found: null,
    filtered: string
  }
}

function addSetting(setting, name) {
  let setting_area = document.createElement('div')
  setting_area.classList.add('col_2')
  let setting_title = document.createElement('h3')
  setting_title.innerText = name

  switch (setting.type) {
    case 'select': {
      classname = 'setting_select'

      for (let o in setting.options) {
        let opt = setting.options[o]

        let preview = document.createElement('div')
        preview.classList.add('setting_preview')

        let def = document.createElement('div')
        def.classList.add('setting_def', 'white_d_t')

        if (setting.default == o) {
          def.innerText = 'default'
        }

        if (setting.status == o) {
          preview.classList.add('selected')
        }

        preview.onclick = function () {
          if (!preview.classList.contains('selected')) {
            let par = preview.parentElement;
            [...par.children].forEach(element => {
              if (element == preview) {
                preview.classList.add('selected')
                setSetting('app', name, o)
                updateApp()
              } else {
                element.classList.remove('selected')
              }
            })
          }
        }

        if (opt.preview) {
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
      if (setting.status) {
        check_yes = 'checked'
      } else {
        check_no = 'checked'
      }

      let toggle_switch = document.createElement('div')
      toggle_switch.innerHTML = `
      <p class="btn-switch" id="setting_${name}">
        <input ${check_no} type="radio" id="no" name="switch" class="btn-switch__radio btn-switch__radio_no"/>
        <input ${check_yes} type="radio" id="yes" name="switch" class="btn-switch__radio btn-switch__radio_yes"/>
        <label for="yes" class="btn-switch__label btn-switch__label_yes">
          <span class="btn-switch__txt"></span>
        </label>
        <label for="no" class="btn-switch__label btn-switch__label_no">
          <span class="btn-switch__txt"></span>
        </label>
      </p>
      `

      toggle_switch.onclick = function () {
        let radio = document.getElementById(`setting_${name}`).children[0]
        setSetting('app', name, !radio.checked)
        updateApp()
      }

      let def = document.createElement('div')
      def.classList.add('setting_def', 'white_d_t')

      def.innerText = 'default: '
      if (setting.default) {
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

      slider.oninput = function () {
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