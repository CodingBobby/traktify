function show(x) {
  let par = x.parentElement.parentElement;
  [...par.children].forEach(element => {
    if(element.children[0] == x) {
      x.classList.toggle("selected");
    }else{
      element.children[0].classList.remove("selected");
    }
  });
}