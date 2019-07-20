if(!remote.getGlobal('darwin')) {
  document.getElementById('dragger').remove()
}

createPosters()

function signout() {
  remote.getGlobal('disconnect')()
}

function reload() {
  remote.getGlobal('loadDashboard')()
}

function show(x) {
  let par = x.parentElement.parentElement;
  [...par.children].forEach(element => {
    if(element.children[0] == x) {
      x.classList.add('selected');
    } else {
      element.children[0].classList.remove('selected');
    }
  });
}

function syncWatched() {
  return tr.sync.watched({
    type: 'shows'
  }).then(res => res)
}

function hiddenItems() {
  return tr.users.hidden.get({
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

    // filters completed shows
    arr.forEach(item => {
      tr.shows.progress.watched({
        id: item.show.ids.trakt,
        extended: 'full'
      }).then(res4 => {
        if(res4.aired > res4.completed) {
          let ep = res4.next_episode
          createPoster({
            title: item.show.title,
            subtitle: `${ep.season} x ${ep.number} (${ep.number_abs}) ${ep.title}`,
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

  let poster_content = document.createElement('div')
  poster_content.classList = 'poster-content'

  let poster_content_left = document.createElement('div')
  poster_content_left.classList = 'poster-content-left fs14 white_t fw700'

  let heart = document.createElement('img')
  heart.src = '../../assets/icons/app/heart.svg'

  let rate = document.createElement('span')
  rate.innerText = `${Math.round(x.rating*10)}%`

  poster_content_left.appendChild(heart)
  poster_content_left.appendChild(rate)

  let poster_content_right = document.createElement('div')
  poster_content_right.classList = 'poster-content-right fs14 white_t fw700 t_'
  poster_content_right.innerText = 'Add to History'

  poster_content.appendChild(poster_content_left)
  poster_content.appendChild(poster_content_right)

  let img = document.createElement('img')

  fr.shows.get(x.id).then(res => {
    if(res) {
      if(res.seasonposter) {
        img.src = res.seasonposter[0].url
      }else if(res.tvposter) {
        img.src = res.tvposter[0].url
      }else{
        img.src = 'https://png.pngtree.com/svg/20160504/39ce50858b.svg'
      }
    }
  }).catch(img.src = 'https://png.pngtree.com/svg/20160504/39ce50858b.svg')

  li.appendChild(poster_content)
  li.appendChild(img)

  let posters = document.getElementById('posters')
  posters.appendChild(li);
}

function createTitle() {
  let title = document.getElementById('poster_title')
  let info = document.getElementById('posters').firstChild

  console.log(info.classList)

  let h3 = document.createElement('h3')
  h3.classList = 'h3 red_t tu'
  h3.innerText = 'up next to watch'

  let h1 = document.createElement('h1')
  h1.classList = 'h1 white_t tu'
  h1.innerText = info.getAttribute('data_title')

  let h1_2 = document.createElement('h1')
  h1_2.classList = 'h1 white_d_t'
  h1_2.innerText = info.getAttribute('data_subtitle')

  title.appendChild(h3)
  title.appendChild(h1)
  title.appendChild(h1_2)
}