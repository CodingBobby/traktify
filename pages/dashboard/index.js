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
