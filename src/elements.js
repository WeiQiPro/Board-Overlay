
let create_feed_button = document.getElementById('createButton')
let live_feed_input = document.getElementById('livefeedinput')
let mini_feed_group_div = document.getElementById('miniLiveFeedDiv')
let mini_live_feed_displays = document.querySelectorAll('.miniLiveFeedDisplay')
let review_buttons = []


create_feed_button.addEventListener("click", ()=>{
  if(live_feed_input.value != session.review_live_feed.source)
  initialize_review_live_feed()
  initialize_mini_feed_display()
})

function initialize_review_live_feed(){
  session.review_live_feed.source = live_feed_input.value
  session.review_live_feed.push_source_to_element()
}

function initialize_mini_feed_display(){
  if(session.mini_live_feeds.length == 4) {
    alert("Display is full")
    return
  } else {
    let new_elements = create_new_elements()
    mini_feed_group_div.appendChild(new_elements)
    session.mini_live_feeds.push(new Video(live_feed_input.value, get_unique_id()))
  }
}



function get_unique_id(){
  return CONST.REVIEW + session.mini_live_feeds.length
}

function create_new_elements(){
  const iframe = document.createElement('iframe')
  const canvas = document.createElement('canvas')
  const button = document.createElement('button')
  const div = document.createElement('div')

  iframe_attributes_and_style(iframe)
  canvas_attributes_and_style(canvas)
  button_attributes_and_style(button)
  div_attributes_and_style(div)

  div.appendChild(iframe)
  div.appendChild(canvas)
  div.appendChild(button)

  return div
}

function get_unique_id(){
  return CONST.REVIEW + session.mini_live_feeds.length
}

function create_new_elements(){
  const iframe = document.createElement('iframe')
  const canvas = document.createElement('canvas')
  const button = document.createElement('button')
  const div = document.createElement('div')

  iframe_attributes_and_style(iframe)
  canvas_attributes_and_style(canvas)
  button_attributes_and_style(button)
  div_attributes_and_style(div)

  div.appendChild(iframe)
  div.appendChild(canvas)
  div.appendChild(button)

  return div
}

function iframe_attributes_and_style(iframe){
  iframe.setAttribute(CONST.ID, get_unique_id())
  iframe.setAttribute(CONST.CLASS, ELEMENT.CLASS.MINILIVEFEEDDISPLAY)

  iframe.width = CONST.DISPLAY.WIDTH
  iframe.height = CONST.DISPLAY.HEIGHT
  iframe.frameborder = CONST.ZERO
  iframe.style.border = CONST.NONE
  iframe.allowfullscreen = CONST.TRUE
  iframe.allow = CONST.ALLOW
}

function canvas_attributes_and_style(canvas){
  canvas.setAttribute(CONST.ID, get_unique_id())
  canvas.setAttribute(CONST.CLASS, ELEMENT.CLASS.MINILIVEFEEDDISPLAY)

  canvas.style.position = CONST.ABSOLUTE

  canvas.width = CONST.DISPLAY.WIDTH
  canvas.height = CONST.DISPLAY.HEIGHT
}

function button_attributes_and_style(button){
  button.setAttribute(CONST.TAG, get_unique_id())
  button.setAttribute(CONST.CLASS, ELEMENT.CLASS.REVIEWTHISMINIDISPLAY)

  button.innerText = CONST.REVIEW
  button.style.backgroundColor = COLOR.LIGHTPINK
  button.style.border = "0.2px" + CONST.SOLID + COLOR.LIGHTPINK
  button.style.padding = "10px"

  review_buttons.push(button)
}

function div_attributes_and_style(div){
  div.style.display = CONST.FLEX
  div.style.flexDirection = CONST.COLUMN
}
