if(!remote.getGlobal('darwin')) {
  document.getElementById('dragger').remove()
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
