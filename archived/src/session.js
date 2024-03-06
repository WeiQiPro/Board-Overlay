class Session{
  constructor(){
    this.review_canvas = new Canvas('review_canvas')
    this.review_live_feed = new Video("", 'review_feed')
    this.mini_live_feeds = []
  }

  tick(){
    this.review_canvas.tick()
  }
}
