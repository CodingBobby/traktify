const trakt = remote.getGlobal('trakt')
const fanart = remote.getGlobal('fanart')

function show(x) {
  let par = x.parentElement.parentElement;
  [...par.children].forEach(element => {
    if(element.children[0] == x) {
      x.classList.add("selected");
    } else {
      element.children[0].classList.remove("selected");
    }
  });
}


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
      panel.id = 'search_panel'

      let search_field = document.createElement('input')
      search_field.id = 'search_field'
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
    open: function() {
      this.parent.appendChild(this.create())
    }
  },
  settings: {
    create: function() {
      let panel = document.createElement('div')
      panel.classList.add('panel')
      panel.id = 'settings_panel'

      panel.innerText = 'Settings Panel'
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
  removeAll: function() {
    let panels = this.element.getElementsByClassName('panel')
    while(panels[0]) {
      panels[0].parentNode.removeChild(panels[0])
    }
  },
  init: function() {
    this.search.parent = this.element
    this.settings.parent = this.element
    this.logout.parent = this.element
    delete this.init
    return this
  }
}.init()

function openSidePanel(panelName) {
  // Checking if panel is available. This will not be accessible by the user directly, so we could live without the check but for possible future changes it's safer to have and not wonder about weird errors
  if(!sideBar.panels.includes(panelName)) {
    console.error('panel not available')
    return
  }

  let overlay = document.getElementById('dash_overlay')
  let dash = document.getElementById('dash')
  let side_buttons = document.getElementById('side_buttons')
  let side_panel = document.getElementById('side_panel')

  if(sideBar.status == 'none') {
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
    overlay.classList.remove('dark_overlay')
    // the timeout makes a fadeout animation possible
    setTimeout(() => {
      overlay.style.display = 'none'
      sideBar.removeAll()
    }, 220)
  }

  // When another button than the currently open panel was clicked, the sidebar stays open and changes it's content
  else {
    sideBar.status = panelName
    sideBar.removeAll()
    sideBar[panelName].open()
  }
}


function openSearch() {
  // This opens the sidepanel
  openSidePanel('search')
}

function openSettings() {
  openSidePanel('settings')
}

function openLogout() {
  openSidePanel('logout')
}

// This function generates a html element for one search result and adds it to the sidebar.
function addSearchResult(result) {
  let panel = document.getElementById('search_results')
  let result_box = document.createElement('div')
  result_box.classList.add('search_result_box')

  let result_img = document.createElement('img')

  if(result.img) {
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
  result_box.append(result_img, result_text)

  panel.appendChild(result_box)
}

function testFanart() {
   let img = document.createElement('img')
   remote.getGlobal('fanart').shows.get(75682).then(res => {
      img.src = res.seasonposter[0].url
   })
   document.body.appendChild(img)
}
