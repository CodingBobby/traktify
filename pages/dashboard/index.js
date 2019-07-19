if(!remote.getGlobal('darwin')) {
  document.getElementById('dragger').remove()
}

function signout() {
  remote.getGlobal('disconnect')()
}

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

function testFanart() {
   let img = document.createElement('img')
   remote.getGlobal('fanart').shows.get(75682).then(res => {
      img.src = res.seasonposter[0].url
   })
   document.body.appendChild(img)
}


function testPoster() {
  let tr = remote.getGlobal('trakt')
  tr.sync.watched({
    type: 'shows'
  }).then(res => {
    let shows = []
    new Promise(async (resolve, reject) => {
      for(let i = 0; i < res.length; i++) {
        let slug = res[i].show.title
        let id = res[i].show.ids.trakt
        tr.shows.progress.watched({
          id: id,
          extended: 'full',
        }).then(res2 => {
          if(res2.aired > res2.completed) {
            let ep = res2.next_episode
            shows.push({
              id: id,
              info: {
                title: slug,
                subtitle: `${ep.season} x ${ep.number} (${ep.number_abs}) ${ep.title}`,
                rating: ep.rating,
                id: res[i].show.ids.tvdb
              }
            })        
          }
        }).catch(err => console.log(err))
      }
      resolve(shows) 
    }).then(show => {
      console.log(show[0])
    })
  })
}

function createPoster(x) {
  let li = document.createElement("li")
  li.classList = "poster poster-dashboard shadow_h"

  let poster_content = document.createElement("div")
  poster_content.classList = "poster-content"

  let poster_content_left = document.createElement("div")
  poster_content_left.classList = "poster-content-left fs14 white_t fw700"

  let heart = document.createElement("img")
  heart.src = "../../assets/icons/app/heart.svg"

  let rate = document.createElement("span")
  rate.innerText = `${Math.round(x.rating*10)}%`

  poster_content_left.appendChild(heart)
  poster_content_left.appendChild(rate)

  let poster_content_right = document.createElement("div")
  poster_content_right.classList = "poster-content-right fs14 white_t fw700 t_"
  poster_content_right.innerText = "Add to History"

  poster_content.appendChild(poster_content_left)
  poster_content.appendChild(poster_content_right)

  let img = document.createElement("img")

  remote.getGlobal('fanart').shows.get(x.id).then(res => {
    if(res) {
      if(res.seasonposter) {
        img.src = res.seasonposter[0].url
      }else if(res.tvposter) {
        img.src = res.tvposter[0].url
      }else{
        img.src = "https://png.pngtree.com/svg/20160504/39ce50858b.svg"
      }
    }
  }).catch(img.src = "https://png.pngtree.com/svg/20160504/39ce50858b.svg")

  let text = document.createElement("div")
  text.style = "display:none"
  text.innerHTML = `${x.title}<span>${x.subtitle}</span>`

  li.appendChild(poster_content)
  li.appendChild(img)
  li.appendChild(text)

  let posters = document.getElementById("posters");
  posters.appendChild(li);
}