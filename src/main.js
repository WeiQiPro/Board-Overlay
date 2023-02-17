let session = new Session()

let tick = () => {
  requestAnimationFrame(tick)

  review_buttons.forEach((button, index) => {
    button.addEventListener('click', () => {
      let iframe = document.getElementById(`Review${index}`);
      console.log(iframe.src)
      session.review_live_feed.source = iframe.src;
      session.review_live_feed.push_source_to_element();
    });
  });

  session.tick()
}
tick()
