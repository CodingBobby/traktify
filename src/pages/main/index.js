const dummyData = {}

setTimeout(() => {
  untw.querySelectorAll('[loading]').forEach(elm => {
    elm.removeAttribute('loading')
  });

  let title = untw.querySelector('[data-untw-title]');
  title.children[0].innerHTML = 'up next to watch';
  title.children[1].innerHTML = 'My Hero Academia';
  title.children[2].innerHTML = '1 &#215; 01 (1) Izuku Midoriya: Origin';

}, 2000)